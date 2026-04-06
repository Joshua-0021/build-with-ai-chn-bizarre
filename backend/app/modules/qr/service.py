"""
QR module — Business logic for QR code validation and point deduction.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.database import get_db
from app.modules.qr.schemas import QRValidateRequest, QRValidateResponse


async def validate_and_redeem_qr(data: QRValidateRequest) -> QRValidateResponse:
    """
    Validate a scanned QR code:
    1. Check QR exists in database
    2. Verify it hasn't been used before
    3. Verify payload matches stored data
    4. Deduct points from user account
    5. Mark QR as used
    """
    db = get_db()

    # Find the QR redemption record
    qr_record = await db.qr_redemptions.find_one({"qr_id": data.qr_id})
    if not qr_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="QR code not found. It may be invalid.",
        )

    # Check if already used
    if qr_record["status"] == "used":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This QR code has already been redeemed.",
        )

    # Verify payload matches
    if qr_record["house_id"] != data.house_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR code data mismatch: house_id does not match.",
        )

    if abs(qr_record["points_redeemed"] - data.points_redeemed) > 0.001:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="QR code data mismatch: points do not match.",
        )

    # Check user has sufficient points
    user = await db.users.find_one({"house_id": data.house_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User associated with this QR code not found.",
        )

    current_points = user.get("total_points", 0.0)
    if current_points < data.points_redeemed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient points. Available: {current_points}, Required: {data.points_redeemed}",
        )

    # Deduct points from user account
    await db.users.update_one(
        {"house_id": data.house_id},
        {"$inc": {"total_points": -data.points_redeemed}},
    )

    # Mark QR as used
    await db.qr_redemptions.update_one(
        {"qr_id": data.qr_id},
        {
            "$set": {
                "status": "used",
                "used_at": datetime.now(timezone.utc),
            }
        },
    )

    return QRValidateResponse(
        qr_id=data.qr_id,
        house_id=data.house_id,
        points_redeemed=data.points_redeemed,
        status="used",
        message=f"Successfully redeemed {data.points_redeemed} points for {data.house_id}",
    )
