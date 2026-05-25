"""
HealthWeave – OCR + AI Medical Document Parsing Pipeline
Handles PDFs, scanned images, handwritten prescriptions.
Multilingual support (English, Hindi, Tamil, Telugu, Bengali, Marathi, Kannada).
"""

import base64
import json
import logging
import re
from datetime import date
from io import BytesIO
from pathlib import Path
from typing import Optional

import anthropic

from app.core.config import settings
from app.services.ai.llm_client import get_llm_client

logger = logging.getLogger(__name__)


EXTRACTION_SYSTEM = """You are a medical document parser specializing in Indian healthcare documents.

You extract structured information from:
- Lab reports (blood tests, urine tests, lipid profiles, etc.)
- Prescriptions (handwritten and printed)
- Discharge summaries
- Scan reports (X-ray, CT, MRI, Ultrasound)
- Health checkup packages
- Vaccination records

Rules:
1. Extract ALL values you can find — even partial information is valuable
2. Normalize lab test names to standard names (e.g., "S. Creatinine" → "creatinine")
3. For Indian medicines, recognize both brand names and generics
4. Handle common OCR errors in medical text
5. If a value is unclear, include it with low confidence score
6. Preserve original text for ambiguous fields
7. Support multilingual context (Hindi/regional language labels are common)
"""

EXTRACTION_PROMPT = """Extract structured medical information from this document.

Return JSON with this structure:
{{
    "document_type": "lab_report|prescription|discharge_summary|scan_report|vaccination|health_package|other",
    "document_date": "YYYY-MM-DD or null",
    "hospital_name": "string or null",
    "doctor_name": "string or null",
    "doctor_specialization": "string or null",
    "patient_name": "string or null",
    "patient_age": "number or null",
    "patient_gender": "male|female|other|null",

    "biomarkers": [
        {{
            "name": "standardized name",
            "raw_name": "as it appears in doc",
            "value_numeric": number or null,
            "value_text": "string or null",
            "unit": "string",
            "reference_range": "string",
            "reference_low": number or null,
            "reference_high": number or null,
            "status": "normal|high|low|critical|null",
            "confidence": 0.0-1.0
        }}
    ],

    "medicines": [
        {{
            "raw_name": "as written",
            "dosage": "string",
            "frequency": "string",
            "duration": "string",
            "instructions": "string",
            "confidence": 0.0-1.0
        }}
    ],

    "diagnoses": [
        {{
            "condition": "string",
            "icd10_suggestion": "string or null",
            "confidence": 0.0-1.0
        }}
    ],

    "procedures": ["string"],
    "allergies_mentioned": ["string"],
    "follow_up_date": "YYYY-MM-DD or null",
    "follow_up_instructions": "string or null",
    "clinical_notes": "string or null",
    "summary": "2-3 sentence plain-language summary",
    "risk_flags": ["string"],
    "extraction_confidence": 0.0-1.0,
    "language_detected": "en|hi|ta|te|bn|mr|kn|mixed"
}}
"""


class OCRPipeline:
    def __init__(self):
        self.llm = get_llm_client()
        self._anthropic = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    async def process_document(
        self,
        file_bytes: bytes,
        mime_type: str,
        filename: str = "",
    ) -> dict:
        """
        Main entry point.
        Returns structured extraction result + raw OCR text.
        """
        if mime_type == "application/pdf":
            return await self._process_pdf(file_bytes, filename)
        elif mime_type.startswith("image/"):
            return await self._process_image(file_bytes, mime_type, filename)
        else:
            raise ValueError(f"Unsupported mime type: {mime_type}")

    async def _process_image(self, image_bytes: bytes, mime_type: str, filename: str) -> dict:
        """Use Claude vision to directly extract from image."""
        b64 = base64.standard_b64encode(image_bytes).decode()

        media_type_map = {
            "image/jpeg": "image/jpeg",
            "image/png": "image/png",
            "image/webp": "image/webp",
            "image/tiff": "image/jpeg",  # convert upstream if needed
        }
        media_type = media_type_map.get(mime_type, "image/jpeg")

        response = await self._anthropic.messages.create(
            model=settings.PRIMARY_LLM,
            max_tokens=4096,
            system=EXTRACTION_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": EXTRACTION_PROMPT,
                        },
                    ],
                }
            ],
        )

        raw_text = response.content[0].text
        return self._parse_extraction_response(raw_text, filename)

    async def _process_pdf(self, pdf_bytes: bytes, filename: str) -> dict:
        """
        For PDFs: use Claude Files API (base64 PDF) or extract page images.
        Claude supports PDF input natively — use that first.
        """
        b64 = base64.standard_b64encode(pdf_bytes).decode()

        response = await self._anthropic.messages.create(
            model=settings.PRIMARY_LLM,
            max_tokens=4096,
            system=EXTRACTION_SYSTEM,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": EXTRACTION_PROMPT,
                        },
                    ],
                }
            ],
        )

        raw_text = response.content[0].text
        return self._parse_extraction_response(raw_text, filename)

    def _parse_extraction_response(self, raw_text: str, filename: str) -> dict:
        """Parse the LLM JSON response, with graceful fallback."""
        try:
            clean = raw_text.strip()
            if "```json" in clean:
                clean = clean.split("```json")[1].split("```")[0].strip()
            elif "```" in clean:
                clean = clean.split("```")[1].split("```")[0].strip()
            data = json.loads(clean)
        except Exception as exc:
            logger.warning("OCR JSON parse failed for %s: %s", filename, exc)
            data = {
                "document_type": "other",
                "extraction_confidence": 0.2,
                "summary": "Document could not be fully parsed. Manual review recommended.",
                "biomarkers": [],
                "medicines": [],
                "diagnoses": [],
                "raw_llm_response": raw_text[:2000],
            }

        # Normalize dates
        for field in ("document_date", "follow_up_date"):
            if data.get(field):
                data[field] = self._normalize_date(data[field])

        # Normalize biomarker names
        for bm in data.get("biomarkers", []):
            bm["canonical_name"] = self._canonicalize_biomarker(bm.get("name", ""))

        return data

    def _normalize_date(self, date_str: str) -> Optional[str]:
        """Convert various Indian date formats to YYYY-MM-DD."""
        if not date_str:
            return None
        # Already ISO format
        if re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
            return date_str
        # DD/MM/YYYY or DD-MM-YYYY
        match = re.match(r"^(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{4})$", date_str)
        if match:
            d, m, y = match.groups()
            return f"{y}-{m.zfill(2)}-{d.zfill(2)}"
        # DD Mon YYYY (e.g. "15 Jan 2024")
        months = {"jan": "01", "feb": "02", "mar": "03", "apr": "04",
                  "may": "05", "jun": "06", "jul": "07", "aug": "08",
                  "sep": "09", "oct": "10", "nov": "11", "dec": "12"}
        match = re.match(r"^(\d{1,2})\s+(\w{3})\w*\s+(\d{4})$", date_str, re.I)
        if match:
            d, m_str, y = match.groups()
            m = months.get(m_str.lower()[:3], "01")
            return f"{y}-{m}-{d.zfill(2)}"
        return None

    # Map of common Indian lab report names → canonical forms
    BIOMARKER_ALIASES = {
        "hb": "hemoglobin", "haemoglobin": "hemoglobin",
        "s. creatinine": "creatinine", "serum creatinine": "creatinine",
        "s. urea": "blood_urea", "blood urea": "blood_urea",
        "s. uric acid": "uric_acid",
        "fbs": "fasting_glucose", "fasting blood sugar": "fasting_glucose",
        "ppbs": "postprandial_glucose", "post prandial glucose": "postprandial_glucose",
        "hba1c": "hba1c", "glycated haemoglobin": "hba1c", "a1c": "hba1c",
        "total cholesterol": "total_cholesterol", "cholesterol total": "total_cholesterol",
        "hdl": "hdl_cholesterol", "hdl cholesterol": "hdl_cholesterol",
        "ldl": "ldl_cholesterol", "ldl cholesterol": "ldl_cholesterol",
        "tg": "triglycerides", "triglyceride": "triglycerides",
        "alt": "alt", "sgpt": "alt",
        "ast": "ast", "sgot": "ast",
        "t3": "t3_total", "t4": "t4_total", "tsh": "tsh",
        "wbc": "white_blood_cells", "tlc": "white_blood_cells",
        "rbc": "red_blood_cells",
        "plt": "platelets", "platelet count": "platelets",
        "mcv": "mcv", "mch": "mch", "mchc": "mchc",
        "vitamin d": "vitamin_d", "25-oh vitamin d": "vitamin_d",
        "vitamin b12": "vitamin_b12",
        "ferritin": "ferritin",
        "esr": "esr",
        "crp": "c_reactive_protein", "c reactive protein": "c_reactive_protein",
    }

    def _canonicalize_biomarker(self, name: str) -> str:
        if not name:
            return ""
        normalized = name.lower().strip()
        return self.BIOMARKER_ALIASES.get(normalized, normalized.replace(" ", "_").replace(".", "").replace("-", "_"))
