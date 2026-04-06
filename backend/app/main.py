"""
PachApp — FastAPI Application Entry Point

Waste recycling reward system backend with:
- Role-based JWT authentication
- AI waste image classification (Vertex AI / Gemini)
- Point accumulation and redemption
- QR code generation and validation
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import connect_db, disconnect_db
from app.modules.auth.router import router as auth_router
from app.modules.users.router import router as users_router
from app.modules.greenarmy.router import router as greenarmy_router
from app.modules.qr.router import router as qr_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    await connect_db()
    yield
    await disconnect_db()


app = FastAPI(
    title="PachApp API",
    description="Waste Recycling Reward System — Encouraging household recycling through AI-powered waste classification and point rewards.",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(greenarmy_router)
app.include_router(qr_router)


@app.get("/", tags=["Health"])
async def health_check():
    """API health check endpoint."""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "demo_mode": settings.DEMO_MODE,
    }


@app.get("/api/v1/points-config", tags=["Config"])
async def get_points_config():
    """Get the current waste-to-points mapping."""
    from app.shared.points import POINT_VALUES
    return {"point_values": POINT_VALUES}
