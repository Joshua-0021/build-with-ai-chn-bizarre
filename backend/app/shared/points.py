"""
Configurable waste-to-points mapping and calculation via database.
"""
from typing import Dict
from app.core.database import get_db

async def get_point_values() -> Dict[str, float]:
    """Fetch point configuration from DB, fallback to defaults."""
    db = get_db()
    if db is not None:
        config = await db.points_config.find_one({"_id": "main_config"})
        if config and "values" in config:
            return config["values"]
            
    # Default fallback values
    return {
        "plastic": 0.01,
        "metal": 0.02,
        "paper": 0.005,
        "glass": 0.015,
        "organic": 0.003,
        "ewaste": 0.05,
        "textile": 0.008,
    }

async def calculate_points(waste_data: dict) -> float:
    """
    Calculate total points from classified waste data.

    Args:
        waste_data: dict mapping waste type → quantity
                    e.g. {"plastic": 3, "metal": 4, "paper": 2}

    Returns:
        Total points as a float, rounded to 4 decimal places.
    """
    point_values = await get_point_values()
    total = 0.0
    for waste_type, quantity in waste_data.items():
        waste_type_lower = waste_type.lower().strip()
        point_value = point_values.get(waste_type_lower, 0.005)  # fallback
        total += quantity * point_value

    return round(total, 4)
