"""
Auth module — Business logic for registration and login.
"""

from datetime import datetime, timezone

from fastapi import HTTPException, status

from app.core.database import get_db
from app.core.security import hash_password, verify_password, create_access_token
from app.modules.auth.schemas import RegisterRequest, LoginRequest, TokenResponse


async def register_user(data: RegisterRequest) -> dict:
    """Register a new user account."""
    db = get_db()

    # Check if house_id already exists
    existing = await db.users.find_one({"house_id": data.house_id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Account with ID '{data.house_id}' already exists",
        )

    # Create user document
    user_doc = {
        "house_id": data.house_id,
        "password_hash": hash_password(data.password),
        "role": data.role,
        "total_points": 0.0,
        "created_at": datetime.now(timezone.utc),
    }

    await db.users.insert_one(user_doc)

    return {"message": f"Account '{data.house_id}' registered successfully", "role": data.role}


async def login_user(data: LoginRequest) -> TokenResponse:
    """Authenticate a user and return a JWT token."""
    db = get_db()

    user = await db.users.find_one({"house_id": data.house_id})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    # Generate JWT token
    token = create_access_token(
        data={"house_id": user["house_id"], "role": user["role"]}
    )

    return TokenResponse(
        access_token=token,
        role=user["role"],
        house_id=user["house_id"],
    )
