"""
Green Army module — Pydantic schemas.
"""

from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime


class ClassifyResponse(BaseModel):
    house_id: str
    waste_data: Dict[str, int]
    points_added: float
    total_points: float
    message: str


class TransactionHistoryOut(BaseModel):
    house_id: str
    worker_id: str
    waste_data: dict
    points_added: float
    image_ref: Optional[str] = None
    created_at: datetime
