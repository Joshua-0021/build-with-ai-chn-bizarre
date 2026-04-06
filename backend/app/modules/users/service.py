"""
Users module — Business logic for dashboard, point redemption, and history.
"""

import uuid
from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.database import get_db
from app.modules.users.schemas import (
    DashboardResponse,
    TransactionOut,
    RedeemRequest,
    RedeemResponse,
    RedemptionOut,
)


async def get_dashboard(house_id: str) -> DashboardResponse:
    """Get user dashboard with total points and transaction history."""
    db = get_db()

    user = await db.users.find_one({"house_id": house_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    # Fetch recent transactions (last 50)
    cursor = db.transactions.find({"house_id": house_id}).sort("created_at", -1).limit(50)
    transactions = []
    async for txn in cursor:
        transactions.append(
            TransactionOut(
                house_id=txn["house_id"],
                waste_data=txn.get("waste_data", {}),
                points_added=txn.get("points_added", 0),
                created_at=txn["created_at"],
            )
        )

    return DashboardResponse(
        house_id=house_id,
        total_points=user.get("total_points", 0.0),
        transactions=transactions,
    )


async def redeem_points(house_id: str, data: RedeemRequest) -> RedeemResponse:
    """Redeem points and generate a QR code payload."""
    db = get_db()

    user = await db.users.find_one({"house_id": house_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    current_points = user.get("total_points", 0.0)

    if data.points > current_points:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient points. Available: {current_points}, Requested: {data.points}",
        )

    # Generate unique QR ID
    qr_id = str(uuid.uuid4())

    # Create QR redemption record (status = "unused" until scanned)
    qr_doc = {
        "qr_id": qr_id,
        "house_id": house_id,
        "points_redeemed": data.points,
        "status": "unused",
        "created_at": datetime.now(timezone.utc),
        "used_at": None,
    }

    await db.qr_redemptions.insert_one(qr_doc)

    return RedeemResponse(
        qr_id=qr_id,
        house_id=house_id,
        points_redeemed=data.points,
        message=f"QR code generated. Present this to redeem {data.points} points.",
    )


async def get_redemptions(house_id: str) -> list:
    """Get redemption history for a user."""
    db = get_db()

    cursor = db.qr_redemptions.find({"house_id": house_id}).sort("created_at", -1).limit(50)
    redemptions = []
    async for r in cursor:
        redemptions.append(
            RedemptionOut(
                qr_id=r["qr_id"],
                house_id=r["house_id"],
                points_redeemed=r["points_redeemed"],
                status=r["status"],
                created_at=r["created_at"],
                used_at=r.get("used_at"),
            )
        )

    return redemptions
