"""
Auth module — API router.
"""

from fastapi import APIRouter

from app.modules.auth.schemas import RegisterRequest, LoginRequest, TokenResponse
from app.modules.auth.service import register_user, login_user

router = APIRouter(prefix="/api/v1/auth", tags=["Authentication"])


@router.post("/register", status_code=201)
async def register(data: RegisterRequest):
    """Register a new user or Green Army account."""
    return await register_user(data)


@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    """Login and receive a JWT access token."""
    return await login_user(data)
