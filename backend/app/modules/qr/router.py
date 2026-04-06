"""
QR module — API router (protected, role=greenarmy).
"""

from fastapi import APIRouter, Depends

from app.core.security import require_role
from app.modules.qr.schemas import QRValidateRequest, QRValidateResponse
from app.modules.qr.service import validate_and_redeem_qr

router = APIRouter(prefix="/api/v1/qr", tags=["QR Code"])


@router.post("/validate", response_model=QRValidateResponse)
async def validate_qr(
    data: QRValidateRequest,
    current_user: dict = Depends(require_role("greenarmy")),
):
    """Validate a scanned QR code and redeem points."""
    return await validate_and_redeem_qr(data)
