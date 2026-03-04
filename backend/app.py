


# --- FastAPI app and CORS middleware setup ---
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# --- MOCK DATA FOR /api/responses ---
import random
import string
from datetime import datetime, timedelta, timezone

def random_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))

def generate_mock_responses(n=100):
    zip_codes = ["95112", "95116", "95122", "95110", "95133", "95020", "95111", "95127", "95148", "95123"]
    food_categories = [
        "Fresh fruits/vegetables",
        "Meat/eggs/milk",
        "Foods from my culture",
        "Organic food",
        "Food for my health problem (like diabetes)",
        "Baby food/formula"
    ]
    knowledge_topics = [
        "Preparing healthy meals",
        "Preparing culturally-relevant meals",
        "Health benefits of nutritious food",
        "Health benefits of organic food",
        "Growing my own food"
    ]
    income_ranges = [
        "Under $50,000",
        "$50,000 - $99,000",
        "$100,000 - $150,000",
        "$150,000 - $200,000",
        "$200,000 or more",
        "Prefer not to say"
    ]
    age_ranges = ["Under 20", "20-39", "40-59", "Over 60", "Prefer not to say"]
    ethnicities = [
        "Hispanic or Latine",
        "Asian / Pacific Islander",
        "Black or African American",
        "White",
        "Native American or American Indian",
        "Prefer not to say"
    ]
    future_outlooks = [
        "More concerned about getting food or getting the right type of food",
        "Equally concerned about getting food or getting the right type of food",
        "Less concerned about getting food or getting the right type of food",
        "Unsure"
    ]
    genders = ["Female", "Male", "Non-binary / Gender expansive", "Prefer not to say"]
    notes = [
        "I need gluten-free boxes.",
        "I would love to learn to garden.",
        "The store is too far.",
        "Prices are too high for eggs.",
        ""
    ]
    responses = []
    now = datetime.now(timezone.utc)
    for i in range(n):
        income = random.choice(income_ranges)
        age = random.choice(age_ranges)
        household_size = random.randint(1, 6)
        # Lower income = higher worry
        if income == 'Under $50,000':
            base_worry = random.randint(3, 5)
        elif income == '$50,000 - $99,000':
            base_worry = random.randint(2, 4)
        else:
            base_worry = random.randint(1, 3)
        worry_level = min(5, max(1, base_worry))
        num_afford = random.randint(0, 2) if worry_level < 4 else random.randint(2, 5)
        affordability = random.sample(food_categories, num_afford)
        num_avail = random.randint(0, 3)
        availability = random.sample(food_categories, num_avail)
        knowledge = random.sample(knowledge_topics, random.randint(1, 4))
        if worry_level >= 4:
            outlook = future_outlooks[0]
        elif worry_level == 3:
            outlook = future_outlooks[1]
        else:
            outlook = future_outlooks[2]
        timestamp = (now - timedelta(days=random.randint(0, 60))).isoformat()
        responses.append({
            "id": random_id(),
            "timestamp": timestamp,
            "zipCode": random.choice(zip_codes),
            "email": f"user{i}@example.com" if random.random() > 0.5 else None,
            "verified": random.random() > 0.5,
            "worryLevel": worry_level,
            "futureOutlook": outlook,
            "affordabilityBarriers": affordability,
            "availabilityBarriers": availability,
            "knowledgeInterests": knowledge,
            "otherNotes": random.choice(notes),
            "ageRange": age,
            "gender": random.choice(genders),
            "ethnicity": [random.choice(ethnicities)],
            "householdSize": household_size,
            "incomeRange": income,
            "crisisAlert": worry_level >= 4
        })
    return responses



# --- API ENDPOINTS ---
@app.get("/api/responses")
def get_mock_responses():
    return generate_mock_responses(120)

# --- FILTERED RESPONSES ENDPOINT ---
from fastapi import Query
from typing import Literal

@app.get("/api/responses/filter")
def get_filtered_responses(range: Literal['week', 'month', 'quarter', 'all'] = Query('week')):
    """
    Returns mock survey responses filtered by time range.
    """
    responses = generate_mock_responses(120)
    now = datetime.now(timezone.utc)
    if range == 'week':
        cutoff = now - timedelta(days=7)
    elif range == 'month':
        cutoff = now - timedelta(days=30)
    elif range == 'quarter':
        cutoff = now - timedelta(days=90)
    else:
        cutoff = None
    if cutoff:
        filtered = [r for r in responses if datetime.fromisoformat(r['timestamp']) >= cutoff]
        return filtered
    return responses

from collections import Counter
import os
import os.path
from dotenv import load_dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError


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

    from datetime import datetime, timezone
    metrics["timestamp"] = datetime.now(timezone.utc).isoformat()
    return metrics

@app.get("/api/summary")
def get_summary():
    # MOCK MODE: Return hardcoded mock data for frontend development
    MOCK = True
    if MOCK:
        from datetime import datetime, timedelta, timezone
        now = datetime.now(timezone.utc)
        # Example: 5 timestamps, each with a corresponding avg_worry score
        timestamp_scores = {
            (now - timedelta(days=i)).isoformat(): 2.0 + i*0.5 for i in range(5)
        }
        return {
            "avg_worry": 2.5,
            "worry_distribution": {"1": 2, "2": 3, "3": 1, "4": 2, "5": 2},
            "percent_extremely_worried": 20.0,
            "percent_not_worried": 30.0,
            "trouble_affording_counts": {"Meat": 2, "Dairy": 1},
            "percent_with_trouble_affording": 40.0,
            "trouble_finding_counts": {"Eggs": 1, "Bread": 2},
            "percent_with_trouble_finding": 20.0,
            "knowledge_counts": {"Gardening": 2, "Cooking": 1},
            "future_concern_counts": {"More concerned": 3, "Less concerned": 2},
            "age_counts": {"20-39": 2, "40-59": 3},
            "gender_counts": {"Male": 3, "Female": 4},
            "race_ethnicity_counts": {"Latino": 2, "White": 2},
            "zip_code_counts": {"95112": 2, "95116": 1},
            "household_size_counts": {"2": 2, "4": 1},
            "household_income_counts": {"$0-25k": 2, "$25k-50k": 1},
            "additional_comments": ["Thank you!", "Need more info."],
            "timestamp": timestamp_scores
        }
    # Fetch live data from Google Sheets
    survey_responses = fetch_survey_data()
    summary = fetch_data(survey_responses)
    return summary
