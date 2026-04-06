"""
AI Service — Google Gemini API integration for waste image classification.
Includes demo mode for local development without credentials.
"""

import json
import random
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

# Structured prompt for waste classification
CLASSIFICATION_PROMPT = """You are a professional waste sorting AI. Look carefully at this image of collected waste materials.

Your job is to identify waste items and count how many individual items belong to each of these 4 waste categories:
- plastic: plastic bottles, bags, wrappers, containers, cups, straws
- metal: tin cans, aluminum foil, bottle caps, scrap metal, steel 
- paper: cardboard boxes, newspaper, paper bags, magazines, tissue paper
- rubber: rubber bands, tires, gloves, erasers, rubber seals

Instructions:
1. Look carefully at each visible object in the image.
2. Count how many items belong to each category.
3. Return ONLY a JSON object with the category name as the key and the item count as an integer value.
4. Only include categories that you can actually see in the image (skip categories with 0 items).
5. Be as accurate as possible — do not guess.

Response format (JSON only, no explanation, no markdown):
{"plastic": 2, "metal": 1}

Now analyze the image:"""


async def classify_waste_image(image_bytes: bytes, mime_type: str = "image/jpeg") -> dict:
    """
    Classify waste items in an image using Gemini AI or demo mode.

    Args:
        image_bytes: Raw image bytes
        mime_type: MIME type of the image

    Returns:
        dict mapping waste type → count, e.g. {"plastic": 3, "metal": 4}
    """
    if settings.DEMO_MODE:
        return _demo_classify()

    return await _gemini_classify(image_bytes, mime_type)


def _demo_classify() -> dict:
    """Generate realistic mock classification data for demo/testing."""
    waste_types = ["plastic", "metal", "paper", "rubber"]
    selected = random.sample(waste_types, k=random.randint(2, 4))
    result = {wtype: random.randint(1, 8) for wtype in selected}
    logger.info(f"Demo mode classification: {result}")
    return result


async def _gemini_classify(image_bytes: bytes, mime_type: str) -> dict:
    """Send image to Gemini AI for classification via API key."""
    try:
        import google.generativeai as genai
        from google.generativeai.types import HarmCategory, HarmBlockThreshold

        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key == "YOUR_API_KEY_HERE":
            logger.warning("No valid GEMINI_API_KEY set. Falling back to demo mode.")
            return _demo_classify()

        # Initialize Gemini API
        genai.configure(api_key=api_key)

        # Load the model
        model = genai.GenerativeModel(
            model_name=settings.VERTEX_AI_MODEL,
            safety_settings={
                HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
                HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
            }
        )

        # Create image blob properly
        image_part = {"mime_type": mime_type, "data": image_bytes}

        # Generate classification
        response = model.generate_content(
            contents=[CLASSIFICATION_PROMPT, image_part],
            generation_config=genai.GenerationConfig(
                temperature=0.0,        # zero temperature for deterministic output
                max_output_tokens=256,
                response_mime_type="application/json",
            ),
        )

        response_text = response.text.strip()
        logger.info(f"Raw Gemini response: {response_text}")

        # Strip markdown fence if present
        if response_text.startswith("```"):
            lines = response_text.split("\n")
            response_text = "\n".join(lines[1:-1]).strip()

        waste_data = json.loads(response_text)

        # Validate: only accept our 4 allowed categories, cast to int
        allowed = {"plastic", "metal", "paper", "rubber"}
        validated = {}
        for key, value in waste_data.items():
            k = key.lower().strip()
            if k in allowed:
                validated[k] = max(0, int(value))

        logger.info(f"Gemini classification result: {validated}")
        return validated

    except ImportError:
        logger.warning("google-generativeai SDK not installed. Falling back to demo mode.")
        return _demo_classify()

    except json.JSONDecodeError as e:
        logger.error(f"Could not parse Gemini response as JSON: {e}. Response was: {response_text if 'response_text' in dir() else 'N/A'}")
        # Return empty result rather than crashing the user's experience
        return {}

    except Exception as e:
        error_str = str(e).lower()
        if any(kw in error_str for kw in ["api_key", "key not valid", "quota", "permission"]):
            logger.warning(f"Gemini API key error. Falling back to demo mode. Error: {e}")
            return _demo_classify()

        logger.error(f"Gemini classification failed: {e}")
        raise ValueError(f"Waste classification failed: {str(e)}")


