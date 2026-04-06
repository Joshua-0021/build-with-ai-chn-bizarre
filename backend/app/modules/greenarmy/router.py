"""
Green Army module — API router (protected, role=greenarmy).
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form
from typing import List

from app.core.security import require_role
from app.modules.greenarmy.schemas import ClassifyResponse, TransactionHistoryOut
from app.modules.greenarmy.service import classify_and_assign_points, get_worker_transactions

router = APIRouter(prefix="/api/v1/greenarmy", tags=["Green Army"])


@router.post("/classify", response_model=ClassifyResponse)
async def classify_waste(
    house_id: str = Form(..., description="Target household ID"),
    image: UploadFile = File(..., description="Waste image to classify"),
    current_user: dict = Depends(require_role("greenarmy")),
):
    """Upload waste image for AI classification and point assignment."""
    return await classify_and_assign_points(
        house_id=house_id,
        worker_id=current_user["house_id"],
        image=image,
    )


@router.get("/transactions", response_model=List[TransactionHistoryOut])
async def transactions(current_user: dict = Depends(require_role("greenarmy"))):
    """Get this worker's submission history."""
    return await get_worker_transactions(current_user["house_id"])
