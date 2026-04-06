"""
Auth module — Pydantic schemas for request/response validation.
"""

from pydantic import BaseModel, Field
from typing import Literal


class RegisterRequest(BaseModel):
    house_id: str = Field(..., min_length=2, max_length=50, description="Unique house or worker ID")
    password: str = Field(..., min_length=4, max_length=100, description="Account password")
    role: Literal["user", "greenarmy"] = Field(..., description="Account role")


class LoginRequest(BaseModel):
    house_id: str = Field(..., description="House ID or Worker ID")
    password: str = Field(..., description="Account password")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    house_id: str
