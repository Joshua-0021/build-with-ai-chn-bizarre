"""
Green Army module — Business logic for waste classification and point assignment.
"""

import os
import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status, UploadFile

from app.core.config import settings
from app.core.database import get_db
from app.shared.ai_service import classify_waste_image
from app.shared.points import calculate_points
from app.modules.greenarmy.schemas import (
    ClassifyOnlyResponse,
    ClassifyResponse,
    ConfirmRequest,
    TransactionHistoryOut,
)


async def classify_only(
    house_id: str,
    worker_id: str,
    image: UploadFile,
) -> ClassifyOnlyResponse:
    """
    Step 1: Upload image → AI classifies → return draft waste_data.
    Nothing is written to the database yet.
    """
    db = get_db()

    # Verify household exists
    target_user = await db.users.find_one({"house_id": house_id, "role": "user"})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Household '{house_id}' not found",
        )

    # Read and validate image
    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty image file",
        )

    mime_type = image.content_type or "image/jpeg"

    # Save image to uploads folder for later reference
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    image_filename = f"{uuid.uuid4()}_{image.filename}"
    image_path = os.path.join(settings.UPLOAD_DIR, image_filename)
    with open(image_path, "wb") as f:
        f.write(image_bytes)

    # Run AI classification
    try:
        waste_data = await classify_waste_image(image_bytes, mime_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    return ClassifyOnlyResponse(
        house_id=house_id,
        waste_data=waste_data,
        image_ref=image_filename,
    )


async def confirm_and_assign_points(
    worker_id: str,
    data: ConfirmRequest,
) -> ClassifyResponse:
    """
    Step 2: Worker has reviewed/edited waste_data → save transaction and assign points.
    """
    db = get_db()

    # Verify household still exists
    target_user = await db.users.find_one({"house_id": data.house_id, "role": "user"})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Household '{data.house_id}' not found",
        )

    # Validate waste_data is not empty
    if not data.waste_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Waste data cannot be empty",
        )

    # Calculate points from the (possibly edited) waste data
    points = await calculate_points(data.waste_data)

    # Update user's total points
    await db.users.update_one(
        {"house_id": data.house_id},
        {"$inc": {"total_points": points}},
    )

    # Fetch updated total
    updated_user = await db.users.find_one({"house_id": data.house_id})
    new_total = updated_user.get("total_points", 0.0)

    # Store transaction record
    transaction_doc = {
        "house_id": data.house_id,
        "worker_id": worker_id,
        "waste_data": data.waste_data,
        "image_ref": data.image_ref,
        "points_added": points,
        "created_at": datetime.now(timezone.utc),
    }
    await db.transactions.insert_one(transaction_doc)

    return ClassifyResponse(
        house_id=data.house_id,
        waste_data=data.waste_data,
        points_added=points,
        total_points=round(new_total, 4),
        message=f"Successfully assigned {points} points to {data.house_id}",
    )


async def get_worker_transactions(worker_id: str) -> list:
    """Get transaction history for a Green Army worker."""
    db = get_db()

    cursor = db.transactions.find({"worker_id": worker_id}).sort("created_at", -1).limit(50)
    transactions = []
    async for txn in cursor:
        transactions.append(
            TransactionHistoryOut(
                house_id=txn["house_id"],
                worker_id=txn["worker_id"],
                waste_data=txn.get("waste_data", {}),
                points_added=txn.get("points_added", 0),
                image_ref=txn.get("image_ref"),
                created_at=txn["created_at"],
            )
        )

    return transactions
