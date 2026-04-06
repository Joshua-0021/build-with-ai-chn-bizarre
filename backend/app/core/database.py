"""
MongoDB async connection using Motor with graceful error handling.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

client: AsyncIOMotorClient = None
db: AsyncIOMotorDatabase = None


async def connect_db():
    """Initialize MongoDB connection and create indexes."""
    global client, db

    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=5000,  # 5 second timeout
        )

        # Force a connection test
        await client.admin.command("ping")

        db = client[settings.MONGODB_DB_NAME]

        # Create indexes for performance
        await db.users.create_index("house_id", unique=True)
        await db.transactions.create_index("house_id")
        await db.transactions.create_index("worker_id")
        await db.qr_redemptions.create_index("qr_id", unique=True)
        await db.qr_redemptions.create_index("house_id")

        print(f"Connected to MongoDB: {settings.MONGODB_DB_NAME}")

    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        print("Make sure MongoDB is running. Starting in offline mode...")
        # Still create client/db references — operations will fail gracefully
        client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=3000,
        )
        db = client[settings.MONGODB_DB_NAME]


async def disconnect_db():
    """Close MongoDB connection."""
    global client
    if client:
        client.close()
        print("Disconnected from MongoDB")


def get_db() -> AsyncIOMotorDatabase:
    """Get database instance."""
    return db
