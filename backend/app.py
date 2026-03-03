from fastapi import FastAPI
from collections import Counter
import os
import os.path

from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Load environment variables
load_dotenv()

app = FastAPI()

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

# Get spreadsheet ID from environment variable
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID", "YOUR_SPREADSHEET_ID_HERE")
RANGE_NAME = "B2:N"  # Reads from row 2 to end, columns B-N


def get_sheets_service():
    """Authenticates and returns the Google Sheets API service."""
    creds = None
    # The file token.json stores the user's access and refresh tokens
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    # If there are no (valid) credentials available, let the user log in
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials.json", SCOPES
            )
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        with open("token.json", "w") as token:
            token.write(creds.to_json())
    
    service = build("sheets", "v4", credentials=creds)
    return service


def parse_multiselect(cell_value):
    """Parse comma-separated values from Google Forms multiple choice questions."""
    if not cell_value or cell_value.strip() == "":
        return []
    # Split by comma and strip whitespace
    return [item.strip() for item in cell_value.split(",") if item.strip()]


def fetch_survey_data():
    """Fetches survey data from Google Sheets and returns it in the expected format."""
    try:
        service = get_sheets_service()
        sheet = service.spreadsheets()
        result = (
            sheet.values()
            .get(spreadsheetId=SPREADSHEET_ID, range=RANGE_NAME)
            .execute()
        )
        values = result.get("values", [])
        
        if not values:
            return []
        
        survey_responses = []
        for row in values:
            # Ensure row has enough columns (pad with empty strings if needed)
            while len(row) < 13:
                row.append("")
            
            # Parse the survey response
            # Column indices (0-based) mapping to columns B-N:
            # B (0): Name (optional)
            # C (1): 1. In the past week, how worried have you been about getting enough food?
            # D (2): 3. I have trouble affording (multiselect)
            # E (3): 4. At grocery stores, I have trouble finding (multiselect)
            # F (4): 5. I would like more knowledge about (multiselect)
            # G (5): 2. When thinking about the next three months, I feel
            # H (6): 7. What is your age?
            # I (7): 8. What is your gender?
            # J (8): 9. What is your race/ethnicity? (multiselect)
            # K (9): 10. What is your ZIP code?
            # L (10): 11. How many people live in your home?
            # M (11): 12. What was your household's total income last year?
            # N (12): 6. Is there anything else you want to share?
            
            try:
                worry_level = int(row[1]) if len(row) > 1 and row[1] and row[1].strip().isdigit() else None
            except (ValueError, IndexError):
                worry_level = None
            
            response = {
                "name": row[0].strip() if len(row) > 0 and row[0] else None,
                "worry_level": worry_level,
                "trouble_affording": parse_multiselect(row[2]) if len(row) > 2 else [],
                "trouble_finding": parse_multiselect(row[3]) if len(row) > 3 else [],
                "knowledge_needed": parse_multiselect(row[4]) if len(row) > 4 else [],
                "future_concern": row[5].strip() if len(row) > 5 and row[5] else None,
                "age": row[6].strip() if len(row) > 6 and row[6] else None,
                "gender": row[7].strip() if len(row) > 7 and row[7] else None,
                "race_ethnicity": parse_multiselect(row[8]) if len(row) > 8 else [],
                "zip_code": row[9].strip() if len(row) > 9 and row[9] else None,
                "household_size": row[10].strip() if len(row) > 10 and row[10] else None,
                "household_income": row[11].strip() if len(row) > 11 and row[11] else None,
                "additional_comments": row[12].strip() if len(row) > 12 and row[12] else None
            }
            
            survey_responses.append(response)
        
        return survey_responses
    
    except HttpError as err:
        print(f"An error occurred: {err}")
        return []


# Use a sample CSV for prototype
def fetch_data(responses):
    '''Formats data as a dictionary'''
    metrics = {}

    # Worry level
    worry_levels = [r["worry_level"] for r in responses if r.get("worry_level") is not None]
    metrics["avg_worry"] = round(sum(worry_levels)/len(worry_levels), 2) if worry_levels else 0
    metrics["worry_distribution"] = dict(Counter(worry_levels))
    metrics["percent_extremely_worried"] = round(sum(1 for w in worry_levels if w >= 8)/len(worry_levels)*100, 1) if worry_levels else 0
    metrics["percent_not_worried"] = round(sum(1 for w in worry_levels if w <= 3)/len(worry_levels)*100, 1) if worry_levels else 0

    # Trouble affording
    trouble_affording_all = [item for r in responses for item in r.get("trouble_affording", [])]
    metrics["trouble_affording_counts"] = dict(Counter(trouble_affording_all))
    metrics["percent_with_trouble_affording"] = round(
        sum(1 for r in responses if any(t != "I do not have trouble getting any type of food" for t in r.get("trouble_affording", [])))/len(responses)*100, 1
    )

    # Trouble finding
    trouble_finding_all = [item for r in responses for item in r.get("trouble_finding", [])]
    metrics["trouble_finding_counts"] = dict(Counter(trouble_finding_all))
    metrics["percent_with_trouble_finding"] = round(
        sum(1 for r in responses if any(t != "I do not have trouble getting any type of food" for t in r.get("trouble_finding", [])))/len(responses)*100, 1
    )

    # Knowledge needs
    knowledge_all = [item for r in responses for item in r.get("knowledge_needed", [])]
    metrics["knowledge_counts"] = dict(Counter(knowledge_all))

    # Future concern
    future_all = [r.get("future_concern") for r in responses if r.get("future_concern")]
    metrics["future_concern_counts"] = dict(Counter(future_all))

    # Demographics - Age
    ages = [r.get("age") for r in responses if r.get("age")]
    metrics["age_counts"] = dict(Counter(ages))

    # Demographics - Gender
    genders = [r.get("gender") for r in responses if r.get("gender")]
    metrics["gender_counts"] = dict(Counter(genders))

    # Demographics - Race/Ethnicity
    race_ethnicity_all = [item for r in responses for item in r.get("race_ethnicity", [])]
    metrics["race_ethnicity_counts"] = dict(Counter(race_ethnicity_all))

    # Demographics - ZIP Code
    zip_codes = [r.get("zip_code") for r in responses if r.get("zip_code")]
    metrics["zip_code_counts"] = dict(Counter(zip_codes))

    # Demographics - Household Size
    household_sizes = [r.get("household_size") for r in responses if r.get("household_size")]
    metrics["household_size_counts"] = dict(Counter(household_sizes))

    # Demographics - Household Income
    household_incomes = [r.get("household_income") for r in responses if r.get("household_income")]
    metrics["household_income_counts"] = dict(Counter(household_incomes))

    # Additional Comments
    comments = [r.get("additional_comments") for r in responses if r.get("additional_comments")]
    metrics["additional_comments"] = comments

    return metrics

@app.get("/api/summary")
def get_summary():
    # Fetch live data from Google Sheets
    survey_responses = fetch_survey_data()
    return fetch_data(survey_responses)
