"""
QR module — Pydantic schemas.
"""

from pydantic import BaseModel


class QRValidateRequest(BaseModel):
    qr_id: str
    house_id: str
    points_redeemed: float


class QRValidateResponse(BaseModel):
    qr_id: str
    house_id: str
    points_redeemed: float
    status: str
    message: str
