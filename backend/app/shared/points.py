"""
Configurable waste-to-points mapping and calculation.
"""

# Points per unit of each waste type
POINT_VALUES = {
    "plastic": 0.01,
    "metal": 0.02,
    "paper": 0.005,
    "glass": 0.015,
    "organic": 0.003,
    "ewaste": 0.05,
    "textile": 0.008,
}


def calculate_points(waste_data: dict) -> float:
    """
    Calculate total points from classified waste data.

    Args:
        waste_data: dict mapping waste type → quantity
                    e.g. {"plastic": 3, "metal": 4, "paper": 2}

    Returns:
        Total points as a float, rounded to 4 decimal places.
    """
    total = 0.0
    for waste_type, quantity in waste_data.items():
        waste_type_lower = waste_type.lower().strip()
        point_value = POINT_VALUES.get(waste_type_lower, 0.005)  # default fallback
        total += quantity * point_value

    return round(total, 4)
