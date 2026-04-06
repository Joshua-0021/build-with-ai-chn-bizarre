"""
Users module — API router (protected, role=user).
"""

from fastapi import APIRouter, Depends
from typing import List

from app.core.security import require_role
from app.modules.users.schemas import DashboardResponse, RedeemRequest, RedeemResponse, RedemptionOut
from app.modules.users.service import get_dashboard, redeem_points, get_redemptions

router = APIRouter(prefix="/api/v1/users", tags=["User Dashboard"])


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(current_user: dict = Depends(require_role("user"))):
    """Get user dashboard with points and transaction history."""
    return await get_dashboard(current_user["house_id"])


@router.post("/redeem", response_model=RedeemResponse)
async def redeem(data: RedeemRequest, current_user: dict = Depends(require_role("user"))):
    """Redeem points and generate a QR code."""
    return await redeem_points(current_user["house_id"], data)


@router.get("/redemptions", response_model=List[RedemptionOut])
async def redemptions(current_user: dict = Depends(require_role("user"))):
    """Get redemption history."""
    return await get_redemptions(current_user["house_id"])
