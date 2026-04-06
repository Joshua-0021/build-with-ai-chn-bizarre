"""
Users module — Pydantic schemas.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime


class TransactionOut(BaseModel):
    house_id: str
    waste_data: dict
    points_added: float
    created_at: datetime


class DashboardResponse(BaseModel):
    house_id: str
    total_points: float
    transactions: List[TransactionOut]


class RedeemRequest(BaseModel):
    points: float = Field(..., gt=0, description="Number of points to redeem")


class RedeemResponse(BaseModel):
    qr_id: str
    house_id: str
    points_redeemed: float
    message: str


class RedemptionOut(BaseModel):
    qr_id: str
    house_id: str
    points_redeemed: float
    status: str
    created_at: datetime
    used_at: Optional[datetime] = None
