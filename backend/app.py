
from collections import Counter
from datetime import datetime, timedelta, timezone
import json
import os
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from flask_cors import CORS


load_dotenv()

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://valley-verde-dashboard-vfn5.vercel.app"  
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID", "YOUR_SPREADSHEET_ID_HERE")
# Includes column A timestamp when available.
RANGE_NAME = os.getenv("SHEETS_RANGE", "A2:N")
SERVICE_ACCOUNT_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "")


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
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
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
    """Fetch raw rows from Google Sheets."""
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
        return result.get("values", [])
    except (HttpError, OSError, ValueError) as err:
        print(f"An error occurred while reading Sheets: {err}")
        return []


def normalize_raw_response(row: list[str]) -> dict[str, Any]:
    """Normalize one row to the app2-style raw schema used by summary metrics."""
    # Supports both A:N (timestamp included) and B:N (timestamp missing)
    has_timestamp_col = len(row) >= 14 and parse_timestamp(row[0]) is not None
    offset = 1 if has_timestamp_col else 0

    # Ensure indexes below are safe.
    padded = list(row)
    min_len = 14 if has_timestamp_col else 13
    while len(padded) < min_len:
        padded.append("")

    timestamp = padded[0].strip() if has_timestamp_col and padded[0] else datetime.now(timezone.utc).isoformat()
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
    """Format aggregate summary metrics."""
    metrics: dict[str, Any] = {}

    worry_levels = [r["worry_level"] for r in responses if r.get("worry_level") is not None]
    metrics["avg_worry"] = round(sum(worry_levels) / len(worry_levels), 2) if worry_levels else 0
    metrics["worry_distribution"] = dict(Counter(worry_levels))
    metrics["percent_extremely_worried"] = (
        round(sum(1 for w in worry_levels if w >= 4) / len(worry_levels) * 100, 1) if worry_levels else 0
    )
    metrics["percent_not_worried"] = (
        round(sum(1 for w in worry_levels if w <= 2) / len(worry_levels) * 100, 1) if worry_levels else 0
    )

    trouble_affording_all = [item for r in responses for item in r.get("trouble_affording", [])]
    metrics["trouble_affording_counts"] = dict(Counter(trouble_affording_all))
    metrics["percent_with_trouble_affording"] = (
        round(
            sum(
                1
                for r in responses
                if any(
                    t != "I do not have trouble getting any type of food"
                    for t in r.get("trouble_affording", [])
                )
            )
            / len(responses)
            * 100,
            1,
        )
        if responses
        else 0
    )

    trouble_finding_all = [item for r in responses for item in r.get("trouble_finding", [])]
    metrics["trouble_finding_counts"] = dict(Counter(trouble_finding_all))
    metrics["percent_with_trouble_finding"] = (
        round(
            sum(
                1
                for r in responses
                if any(
                    t != "I do not have trouble getting any type of food"
                    for t in r.get("trouble_finding", [])
                )
            )
            / len(responses)
            * 100,
            1,
        )
        if responses
        else 0
    )

    knowledge_all = [item for r in responses for item in r.get("knowledge_needed", [])]
    metrics["knowledge_counts"] = dict(Counter(knowledge_all))

    future_all = [r.get("future_concern") for r in responses if r.get("future_concern")]
    metrics["future_concern_counts"] = dict(Counter(future_all))

    ages = [r.get("age") for r in responses if r.get("age")]
    metrics["age_counts"] = dict(Counter(ages))

    genders = [r.get("gender") for r in responses if r.get("gender")]
    metrics["gender_counts"] = dict(Counter(genders))

    race_ethnicity_all = [item for r in responses for item in r.get("race_ethnicity", [])]
    metrics["race_ethnicity_counts"] = dict(Counter(race_ethnicity_all))

    zip_codes = [r.get("zip_code") for r in responses if r.get("zip_code")]
    metrics["zip_code_counts"] = dict(Counter(zip_codes))

    household_sizes = [r.get("household_size") for r in responses if r.get("household_size")]
    metrics["household_size_counts"] = dict(Counter(household_sizes))

    household_incomes = [r.get("household_income") for r in responses if r.get("household_income")]
    metrics["household_income_counts"] = dict(Counter(household_incomes))

    comments = [r.get("additional_comments") for r in responses if r.get("additional_comments")]
    metrics["additional_comments"] = comments
    metrics["timestamp"] = datetime.now(timezone.utc).isoformat()

    return metrics


@app.get("/api/responses")
def get_responses():
    return get_all_frontend_responses()


@app.get("/api/responses/filter")
def get_filtered_responses(
    range: Literal["week", "month", "quarter", "all"] = Query("week"),
):
    responses = get_all_frontend_responses()
    return [response for response in responses if in_range(response.get("timestamp", ""), range)]


@app.get("/api/summary")
def get_summary():
    survey_responses = get_all_raw_responses()
    return fetch_data(survey_responses)
