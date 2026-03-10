
from collections import Counter
from datetime import datetime, timedelta, timezone
from functools import lru_cache
import json
import os
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


load_dotenv()

app = FastAPI()

# CORS: allow localhost + all Vercel deployments (preview URLs change per deploy)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_origin_regex=r"https://.*\.vercel\.app",  # matches all Vercel preview & prod URLs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID", "YOUR_SPREADSHEET_ID_HERE")
RANGE_NAME = os.getenv("SHEETS_RANGE", "SHEETS_RANGE")
SERVICE_ACCOUNT_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")
ROWS_CACHE_TTL_SECONDS = int(os.getenv("ROWS_CACHE_TTL_SECONDS", "60"))
SUMMARY_CACHE_TTL_SECONDS = int(os.getenv("SUMMARY_CACHE_TTL_SECONDS", "60"))
MAX_SUMMARY_COMMENTS = int(os.getenv("MAX_SUMMARY_COMMENTS", "100"))
ENABLE_DEBUG_ENDPOINTS = os.getenv("ENABLE_DEBUG_ENDPOINTS", "false").lower() == "true"
DEFAULT_ALL_RANGE_LIMIT = int(os.getenv("DEFAULT_ALL_RANGE_LIMIT", "200"))
MAX_FILTER_LIMIT = int(os.getenv("MAX_FILTER_LIMIT", "500"))

_rows_cache: dict[str, Any] = {"expires_at": None, "rows": []}
_summary_cache: dict[str, Any] = {"expires_at": None, "value": None}


@lru_cache(maxsize=1)
def get_sheets_service():
    """Authenticate and return the Google Sheets API service."""
    if not SPREADSHEET_ID or SPREADSHEET_ID == "YOUR_SPREADSHEET_ID_HERE":
        print("SPREADSHEET_ID is not configured; returning empty dataset.")
        return None

    if not SERVICE_ACCOUNT_JSON:
        print("GOOGLE_SERVICE_ACCOUNT_JSON is not configured; returning empty dataset.")
        return None

    # Accept either raw JSON payload or a path to a credentials file.
    if os.path.exists(SERVICE_ACCOUNT_JSON):
        try:
            creds = service_account.Credentials.from_service_account_file(
                SERVICE_ACCOUNT_JSON,
                scopes=SCOPES,
            )
            return build("sheets", "v4", credentials=creds)
        except (OSError, ValueError) as err:
            print(f"Invalid service account file path: {err}")
            return None

    try:
        service_account_info = json.loads(SERVICE_ACCOUNT_JSON)
        creds = service_account.Credentials.from_service_account_info(
            service_account_info,
            scopes=SCOPES,
        )
        return build("sheets", "v4", credentials=creds)
    except (json.JSONDecodeError, ValueError) as err:
        print(f"Invalid GOOGLE_SERVICE_ACCOUNT_JSON value: {err}")
        return None


def parse_multiselect(cell_value: str | None) -> list[str]:
    if not cell_value:
        return []
    return [item.strip() for item in cell_value.split(",") if item.strip()]


def parse_timestamp(value: str | None) -> datetime | None:
    if not value:
        return None
    
    value_str = str(value).strip()
    
    # Try to parse as numeric timestamp (Google Sheets serial number)
    try:
        serial_number = float(value_str)
        # Excel serial date: days since 1/1/1900 (with 1/1/1900 = 1)
        # Google Sheets uses the same convention
        # Convert serial number to datetime
        # 1 = 1/1/1900, so we add days to that base date
        base_date = datetime(1900, 1, 1)
        # Adjust for Excel's leap year bug (it thinks 1900 is a leap year, but it's not)
        if serial_number > 60:
            serial_number -= 1
        result = base_date + timedelta(days=serial_number - 1)
        return result if result.year > 1900 else None
    except (ValueError, TypeError):
        pass
    
    # List of timestamp formats to try
    formats = [
        "%m/%d/%Y %H:%M:%S",      # 2/17/2026 12:49:38
        "%m/%d/%Y %I:%M:%S %p",   # 2/17/2026 12:49:38 PM
        "%Y-%m-%d %H:%M:%S",      # 2026-02-17 12:49:38
        "%m/%d/%Y",               # 2/17/2026
        "%Y-%m-%d",               # 2026-02-17
    ]
    
    for fmt in formats:
        try:
            return datetime.strptime(value_str, fmt)
        except ValueError:
            continue
    
    # Try ISO format as fallback
    try:
        return datetime.fromisoformat(value_str.replace("Z", "+00:00"))
    except ValueError:
        return None


def parse_int(value: str | None, default: int = 0) -> int:
    if not value:
        return default
    try:
        return int(str(value).strip())
    except ValueError:
        return default


def fetch_sheet_rows() -> list[list[str]]:
    """Fetch raw rows from Google Sheets with a short TTL cache."""
    now = datetime.now(timezone.utc)
    cache_expires_at = _rows_cache.get("expires_at")
    cached_rows = _rows_cache.get("rows")

    if (
        isinstance(cache_expires_at, datetime)
        and cache_expires_at > now
        and isinstance(cached_rows, list)
    ):
        return cached_rows

    try:
        service = get_sheets_service()
        if service is None:
            return []
        result = (
            service.spreadsheets()
            .values()
            .get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME)
            .execute()
        )
        rows = result.get("values", [])
        _rows_cache["rows"] = rows
        _rows_cache["expires_at"] = now + timedelta(seconds=ROWS_CACHE_TTL_SECONDS)
        return rows
    except (HttpError, OSError, ValueError) as err:
        print(f"An error occurred while reading Sheets: {err}")
        if isinstance(cached_rows, list):
            return cached_rows
        return []


def normalize_raw_response(row: list[str]) -> dict[str, Any]:
    """Normalize one row to the app2-style raw schema used by summary metrics."""
    # Timestamps are always in column A based on SHEETS_RANGE = A2:N
    offset = 1
    
    # Ensure indexes below are safe.
    padded = list(row)
    min_len = 14  # A-N = 14 columns
    while len(padded) < min_len:
        padded.append("")

    # Store the raw timestamp from column A
    timestamp = padded[0].strip() if padded[0] else datetime.now(timezone.utc).isoformat()
    worry_level = parse_int(padded[offset + 1], 0)

    return {
        "timestamp": timestamp,
        "name": padded[offset + 0].strip() if padded[offset + 0] else None,
        "worry_level": worry_level,
        "trouble_affording": parse_multiselect(padded[offset + 2]),
        "trouble_finding": parse_multiselect(padded[offset + 3]),
        "knowledge_needed": parse_multiselect(padded[offset + 4]),
        "future_concern": padded[offset + 5].strip() if padded[offset + 5] else None,
        "age": padded[offset + 6].strip() if padded[offset + 6] else None,
        "gender": padded[offset + 7].strip() if padded[offset + 7] else None,
        "race_ethnicity": parse_multiselect(padded[offset + 8]),
        "zip_code": padded[offset + 9].strip() if padded[offset + 9] else "",
        "household_size": parse_int(padded[offset + 10], 0),
        "household_income": padded[offset + 11].strip() if padded[offset + 11] else "Prefer not to say",
        "additional_comments": padded[offset + 12].strip() if padded[offset + 12] else "",
    }


def build_frontend_response(raw: dict[str, Any], index: int) -> dict[str, Any]:
    """Transform raw response into frontend SurveyResponse shape."""
    worry_level = raw.get("worry_level") or 0
    worry_level = max(1, min(5, worry_level))

    contact = raw.get("name")
    email = contact if isinstance(contact, str) and "@" in contact else None

    return {
        "id": f"SHEET-{index + 1}",
        "timestamp": raw.get("timestamp") or datetime.now(timezone.utc).isoformat(),
        "zipCode": raw.get("zip_code") or "",
        "email": email,
        "verified": bool(email),
        "worryLevel": worry_level,
        "futureOutlook": raw.get("future_concern") or "Unsure",
        "affordabilityBarriers": raw.get("trouble_affording") or [],
        "availabilityBarriers": raw.get("trouble_finding") or [],
        "knowledgeInterests": raw.get("knowledge_needed") or [],
        "otherNotes": raw.get("additional_comments") or "",
        "ageRange": raw.get("age") or "Prefer not to say",
        "gender": raw.get("gender") or "Prefer not to say",
        "ethnicity": raw.get("race_ethnicity") or [],
        "householdSize": raw.get("household_size") or 0,
        "incomeRange": raw.get("household_income") or "Prefer not to say",
        "crisisAlert": worry_level >= 4,
    }


def get_all_raw_responses() -> list[dict[str, Any]]:
    return [normalize_raw_response(row) for row in fetch_sheet_rows()]


def get_all_frontend_responses() -> list[dict[str, Any]]:
    raw_responses = get_all_raw_responses()
    return [build_frontend_response(raw, index) for index, raw in enumerate(raw_responses)]


def in_range(timestamp_value: str, selected_range: Literal["week", "month", "quarter", "all"]) -> bool:
    if selected_range == "all":
        return True

    timestamp = parse_timestamp(timestamp_value)
    if timestamp is None:
        return False

    if timestamp.tzinfo is None:
        timestamp = timestamp.replace(tzinfo=timezone.utc)

    now = datetime.now(timezone.utc)
    days = 7 if selected_range == "week" else 30 if selected_range == "month" else 90
    cutoff = now - timedelta(days=days)
    return timestamp >= cutoff


def fetch_data(responses: list[dict[str, Any]]) -> dict[str, Any]:
    """Format aggregate summary metrics using one-pass aggregation."""
    metrics: dict[str, Any] = {}
    total = len(responses)
    metrics["num_responses"] = total

    worry_distribution: Counter[int] = Counter()
    trouble_affording_counts: Counter[str] = Counter()
    trouble_finding_counts: Counter[str] = Counter()
    knowledge_counts: Counter[str] = Counter()
    future_concern_counts: Counter[str] = Counter()
    age_counts: Counter[str] = Counter()
    gender_counts: Counter[str] = Counter()
    race_ethnicity_counts: Counter[str] = Counter()
    zip_code_counts: Counter[str] = Counter()
    household_size_counts: Counter[int] = Counter()
    household_income_counts: Counter[str] = Counter()

    worry_sum = 0
    worry_count = 0
    extremely_worried = 0
    not_worried = 0
    with_trouble_affording = 0
    with_trouble_finding = 0
    comments: list[str] = []

    for response in responses:
        worry_level = response.get("worry_level")
        if isinstance(worry_level, int):
            worry_distribution[worry_level] += 1
            worry_sum += worry_level
            worry_count += 1
            if worry_level >= 4:
                extremely_worried += 1
            if worry_level <= 2:
                not_worried += 1

        trouble_affording = response.get("trouble_affording") or []
        trouble_affording_counts.update(trouble_affording)
        if any(item != "I do not have trouble getting any type of food" for item in trouble_affording):
            with_trouble_affording += 1

        trouble_finding = response.get("trouble_finding") or []
        trouble_finding_counts.update(trouble_finding)
        if any(item != "I do not have trouble getting any type of food" for item in trouble_finding):
            with_trouble_finding += 1

        knowledge_counts.update(response.get("knowledge_needed") or [])
        race_ethnicity_counts.update(response.get("race_ethnicity") or [])

        future_concern = response.get("future_concern")
        if future_concern:
            future_concern_counts[future_concern] += 1

        age = response.get("age")
        if age:
            age_counts[age] += 1

        gender = response.get("gender")
        if gender:
            gender_counts[gender] += 1

        zip_code = response.get("zip_code")
        if zip_code and zip_code != "None":
            zip_code_counts[zip_code] += 1

        household_size = response.get("household_size")
        if household_size:
            household_size_counts[household_size] += 1

        household_income = response.get("household_income")
        if household_income:
            household_income_counts[household_income] += 1

        comment = response.get("additional_comments")
        if comment and len(comments) < MAX_SUMMARY_COMMENTS:
            comments.append(comment)

    metrics["avg_worry"] = round(worry_sum / worry_count, 2) if worry_count else 0
    metrics["worry_distribution"] = dict(worry_distribution)
    metrics["percent_extremely_worried"] = (
        round(extremely_worried / worry_count * 100, 1) if worry_count else 0
    )
    metrics["percent_not_worried"] = (
        round(not_worried / worry_count * 100, 1) if worry_count else 0
    )

    metrics["trouble_affording_counts"] = dict(trouble_affording_counts)
    metrics["percent_with_trouble_affording"] = (
        round(with_trouble_affording / total * 100, 1) if total else 0
    )

    metrics["trouble_finding_counts"] = dict(trouble_finding_counts)
    metrics["percent_with_trouble_finding"] = (
        round(with_trouble_finding / total * 100, 1) if total else 0
    )

    metrics["knowledge_counts"] = dict(knowledge_counts)
    metrics["future_concern_counts"] = dict(future_concern_counts)
    metrics["age_counts"] = dict(age_counts)
    metrics["gender_counts"] = dict(gender_counts)
    metrics["race_ethnicity_counts"] = dict(race_ethnicity_counts)
    metrics["zip_code_counts"] = dict(zip_code_counts)
    metrics["household_size_counts"] = dict(household_size_counts)
    metrics["household_income_counts"] = dict(household_income_counts)
    metrics["additional_comments"] = comments
    metrics["timestamp"] = datetime.now(timezone.utc).isoformat()

    return metrics


@app.get("/api/responses")
def get_responses():
    return get_all_frontend_responses()


@app.get("/api/debug/raw")
def debug_raw():
    """Debug endpoint to see raw row data"""
    if not ENABLE_DEBUG_ENDPOINTS:
        raise HTTPException(status_code=404, detail="Not found")

    rows = fetch_sheet_rows()
    if not rows:
        return {"error": "No rows fetched"}
    # Return first row with each value's type and repr
    first_row = rows[0] if rows else []
    return {
        "total_raw_rows_fetched": len(rows),
        "sheets_range": RANGE_NAME,
        "first_row_length": len(first_row),
        "first_row_values": [
            {
                "index": i,
                "value": val,
                "type": type(val).__name__,
                "repr": repr(val),
            }
            for i, val in enumerate(first_row)
        ],
        "all_rows_lengths": [len(row) for row in rows],
    }


@app.get("/api/responses/filter")
def get_filtered_responses(
    range: Literal["week", "month", "quarter", "all"] = Query("week"),
    offset: int = Query(0, ge=0),
    limit: int | None = Query(None, ge=1),
):
    raw_responses = get_all_raw_responses()

    effective_limit = limit
    if effective_limit is None and range == "all":
        effective_limit = DEFAULT_ALL_RANGE_LIMIT
    if effective_limit is not None:
        effective_limit = min(effective_limit, MAX_FILTER_LIMIT)

    results: list[dict[str, Any]] = []
    skipped = 0
    for index, raw in enumerate(raw_responses):
        if not in_range(raw.get("timestamp", ""), range):
            continue
        if skipped < offset:
            skipped += 1
            continue

        results.append(build_frontend_response(raw, index))
        if effective_limit is not None and len(results) >= effective_limit:
            break

    return results


@app.get("/api/summary")
def get_summary():
    now = datetime.now(timezone.utc)
    cache_expires_at = _summary_cache.get("expires_at")
    cached_value = _summary_cache.get("value")
    if (
        isinstance(cache_expires_at, datetime)
        and cache_expires_at > now
        and isinstance(cached_value, dict)
    ):
        return cached_value

    survey_responses = get_all_raw_responses()
    summary = fetch_data(survey_responses)
    _summary_cache["value"] = summary
    _summary_cache["expires_at"] = now + timedelta(seconds=SUMMARY_CACHE_TTL_SECONDS)
    return summary
