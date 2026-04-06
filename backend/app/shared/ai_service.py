"""
AI Service — Google Vertex AI (Gemini) integration for waste image classification.
Includes demo mode for local development without GCP credentials.
"""

import json
import random
import base64
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Structured prompt for waste classification
CLASSIFICATION_PROMPT = """Analyze this image of collected household waste and classify the items you see.
Return ONLY a valid JSON object with waste categories as keys and integer counts as values.
Use only these categories: plastic, metal, paper, glass, organic, ewaste, textile.
If a category has zero items, omit it from the response.

Example response format:
{"plastic": 3, "metal": 2, "paper": 5}

IMPORTANT: Return ONLY the JSON object, no other text or markdown formatting."""


async def classify_waste_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Classify waste items in an image using Vertex AI (Gemini) or demo mode.

    Args:
        image_bytes: Raw image bytes
        mime_type: MIME type of the image

    Returns:
        dict mapping waste type → count, e.g. {"plastic": 3, "metal": 4}
    """
    if settings.DEMO_MODE:
        return _demo_classify()

    return await _vertex_ai_classify(image_bytes, mime_type)


def _demo_classify() -> dict:
    """Generate realistic mock classification data for demo/testing."""
    waste_types = ["plastic", "metal", "paper", "glass", "organic", "ewaste", "textile"]

    # Randomly select 2-5 waste types with random counts
    selected = random.sample(waste_types, k=random.randint(2, 5))
    result = {wtype: random.randint(1, 10) for wtype in selected}

    logger.info(f"🧪 Demo mode classification: {result}")
    return result


async def _vertex_ai_classify(image_bytes: bytes, mime_type: str) -> dict:
    """Send image to Vertex AI Gemini for classification."""
    try:
        import vertexai
        from vertexai.generative_models import GenerativeModel, Part

        # Initialize Vertex AI
        vertexai.init(
            project=settings.GCP_PROJECT_ID,
            location=settings.GCP_LOCATION,
        )

        # Load model
        model = GenerativeModel(settings.VERTEX_AI_MODEL)

        # Create image part from bytes
        image_part = Part.from_data(data=image_bytes, mime_type=mime_type)

        # Generate classification
        response = model.generate_content(
            [CLASSIFICATION_PROMPT, image_part],
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": 256,
            },
        )

        # Parse the JSON response
        response_text = response.text.strip()

        # Clean up potential markdown formatting
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1])

        waste_data = json.loads(response_text)

        # Validate: ensure all values are integers
        validated = {}
        for key, value in waste_data.items():
            key_lower = key.lower().strip()
            validated[key_lower] = int(value)

        logger.info(f"🤖 Vertex AI classification: {validated}")
        return validated

    except ImportError:
        logger.warning("Vertex AI SDK not installed. Falling back to demo mode.")
        return _demo_classify()

    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse AI response as JSON: {e}")
        raise ValueError("AI returned invalid classification data. Please try again.")

    except Exception as e:
        logger.error(f"Vertex AI classification failed: {e}")
        raise ValueError(f"Waste classification failed: {str(e)}")
