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
from app.modules.greenarmy.schemas import ClassifyResponse, TransactionHistoryOut


async def classify_and_assign_points(
    house_id: str,
    worker_id: str,
    image: UploadFile,
) -> ClassifyResponse:
    """
    Process uploaded waste image:
    1. Send to AI for classification
    2. Calculate points
    3. Update user account
    4. Store transaction
    """
    db = get_db()

    # Verify the target house_id exists and is a "user" role
    target_user = await db.users.find_one({"house_id": house_id, "role": "user"})
    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Household '{house_id}' not found",
        )

    # Read image bytes
    image_bytes = await image.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty image file",
        )

    # Determine MIME type
    mime_type = image.content_type or "image/jpeg"

    # Save image to uploads folder
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    image_filename = f"{uuid.uuid4()}_{image.filename}"
    image_path = os.path.join(settings.UPLOAD_DIR, image_filename)
    with open(image_path, "wb") as f:
        f.write(image_bytes)

    # Classify waste using AI
    try:
        waste_data = await classify_waste_image(image_bytes, mime_type)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(e),
        )

    # Calculate points
    points = calculate_points(waste_data)

    # Update user's total points
    result = await db.users.update_one(
        {"house_id": house_id},
        {"$inc": {"total_points": points}},
    )

    # Fetch updated total
    updated_user = await db.users.find_one({"house_id": house_id})
    new_total = updated_user.get("total_points", 0.0)

    # Store transaction record
    transaction_doc = {
        "house_id": house_id,
        "worker_id": worker_id,
        "waste_data": waste_data,
        "image_ref": image_filename,
        "points_added": points,
        "created_at": datetime.now(timezone.utc),
    }
    await db.transactions.insert_one(transaction_doc)

    return ClassifyResponse(
        house_id=house_id,
        waste_data=waste_data,
        points_added=points,
        total_points=round(new_total, 4),
        message=f"Successfully classified waste and added {points} points to {house_id}",
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
