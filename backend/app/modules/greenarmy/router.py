"""
Green Army module — API router (protected, role=greenarmy).
"""

from fastapi import APIRouter, Depends, UploadFile, File, Form
from typing import List

from app.core.security import require_role
from app.modules.greenarmy.schemas import (
    ClassifyOnlyResponse,
    ClassifyResponse,
    ConfirmRequest,
    TransactionHistoryOut,
)
from app.modules.greenarmy.service import (
    classify_only,
    confirm_and_assign_points,
    get_worker_transactions,
)

router = APIRouter(prefix="/api/v1/greenarmy", tags=["Green Army"])


@router.post("/classify-only", response_model=ClassifyOnlyResponse)
async def classify_waste_only(
    house_id: str = Form(..., description="Target household ID"),
    image: UploadFile = File(..., description="Waste image to classify"),
    current_user: dict = Depends(require_role("greenarmy")),
):
    """
    Step 1: Upload waste image for AI classification.
    Returns draft waste_data — nothing is saved until /confirm is called.
    """
    return await classify_only(
        house_id=house_id,
        worker_id=current_user["house_id"],
        image=image,
    )


@router.post("/confirm", response_model=ClassifyResponse)
async def confirm_waste(
    data: ConfirmRequest,
    current_user: dict = Depends(require_role("greenarmy")),
):
    """
    Step 2: Worker confirms (optionally edited) waste data.
    Saves the transaction and assigns points to the household.
    """
    return await confirm_and_assign_points(
        worker_id=current_user["house_id"],
        data=data,
    )


@router.get("/transactions", response_model=List[TransactionHistoryOut])
async def transactions(current_user: dict = Depends(require_role("greenarmy"))):
    """Get this worker's submission history."""
    return await get_worker_transactions(current_user["house_id"])
