# Valley Verde Dashboard - Backend Developers Guide

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Core Concepts](#core-concepts)
6. [API Endpoints](#api-endpoints)
7. [Data Flow](#data-flow)
8. [Configuration](#configuration)
9. [Deployment](#deployment)
10. [Troubleshooting](#troubleshooting)
11. [Contributing](#contributing)

---

## Architecture Overview

The Valley Verde Dashboard backend is a Python-based REST API built with **FastAPI** that aggregates survey response data from Google Sheets. The backend:

- Fetches raw survey responses from a Google Sheets spreadsheet
- Normalizes and transforms data into frontend-compatible formats
- Computes aggregate statistics and metrics
- Provides filtered data access with pagination and time-range filtering
- Caches data to minimize API calls

### High-Level Data Flow

```
Google Sheets (Source Data)
         ↓
fetch_sheet_rows() [with TTL cache]
         ↓
normalize_raw_response() [raw schema]
         ↓
build_frontend_response() [frontend schema]
         ↓
/api endpoints [REST responses]
```

---

## Tech Stack

### Core Dependencies

- **FastAPI 0.116.1** - High-performance web framework
- **Uvicorn 0.35.0** - ASGI server for running FastAPI
- **Gunicorn** - Production WSGI/ASGI application server
- **Google API Python Client 2.179.0** - Google Sheets API integration
- **Google Auth 2.40.3** - Authentication for Google APIs
- **Python-dotenv 1.1.1** - Environment variable management

### Python Version

- Python 3.9+ (verified compatibility)

---

## Getting Started

### Prerequisites

- Python 3.9 or higher
- Google Cloud Service Account with Sheets API enabled
- Google Sheets spreadsheet containing survey data
- Virtual environment tool (venv or similar)

### Installation Steps

1. **Clone and navigate to backend directory**

   ```bash
   cd backend
   ```

2. **Create and activate virtual environment**

   ```bash
   python -m venv env
   # On Windows:
   .\env\Scripts\activate
   # On macOS/Linux:
   source env/bin/activate
   ```

3. **Install dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   - Copy `.env.example` to `.env` (or create a new `.env` file)
   - Set required variables (see [Configuration](#configuration) section)

5. **Run development server**

   ```bash
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`

6. **Access API documentation**
   - Interactive docs: http://localhost:8000/docs
   - ReDoc documentation: http://localhost:8000/redoc

---

## Project Structure

```
backend/
├── app.py                          # Main FastAPI application
├── requirements.txt                # Python dependencies
├── .env                           # Environment variables (local only)
├── credentials.json               # Google service account credentials
├── valleryverde-*.json            # Alternative credentials format
├── env/                           # Virtual environment directory
├── __pycache__/                   # Python cache files
├── DEVELOPERS_GUIDE.md            # This file
└── backend.txt                    # Legacy documentation (check for updates)
```

### Key Files

- **app.py** (533 lines) - Contains all core logic, endpoints, and data processing
- **requirements.txt** - Pinned dependency versions for reproducibility

---

## Core Concepts

### 1. Authentication & Google Sheets Integration

The backend authenticates with Google Sheets using a service account:

```python
def get_sheets_service():
    """Authenticate and return the Google Sheets API service."""
    # Accepts either:
    # 1. A path to credentials.json file
    # 2. Raw JSON string in GOOGLE_SERVICE_ACCOUNT_JSON environment variable
```

**Features:**

- Supports both file-based and raw JSON credentials
- Automatic credential validation with helpful error messages
- Graceful fallback if credentials are not configured

### 2. Data Normalization

Raw Google Sheets data goes through a 3-step transformation pipeline:

#### Step 1: Parse Primitives

- **Timestamps**: Converts Excel serial numbers and string formats
- **Integers**: Safely parses numeric values with defaults
- **Multiselect**: Splits comma-separated strings into lists

#### Step 2: Map to Raw Schema

```python
def normalize_raw_response(row: list[str]) -> dict[str, Any]:
    """Normalize one row to the app2-style raw schema."""
    return {
        "timestamp": str,
        "name": str,
        "worry_level": int,
        "trouble_affording": list[str],
        "trouble_finding": list[str],
        "knowledge_needed": list[str],
        "future_concern": str,
        "age": str,
        "gender": str,
        "race_ethnicity": list[str],
        "zip_code": str,
        "household_size": int,
        "household_income": str,
        "additional_comments": str,
    }
```

#### Step 3: Transform to Frontend Schema

```python
def build_frontend_response(raw: dict[str, Any], index: int) -> dict[str, Any]:
    """Transform raw response into frontend SurveyResponse shape."""
    return {
        "id": str,                          # SHEET-{row_number}
        "timestamp": str,
        "zipCode": str,
        "email": str | None,               # Extracted from name if contains @
        "verified": bool,                  # true if email exists
        "worryLevel": int,                 # 1-5 (normalized)
        "futureOutlook": str,
        "affordabilityBarriers": list[str],
        "availabilityBarriers": list[str],
        "knowledgeInterests": list[str],
        "otherNotes": str,
        "ageRange": str,
        "gender": str,
        "ethnicity": list[str],
        "householdSize": int,
        "incomeRange": str,
        "crisisAlert": bool,               # true if worry_level >= 4
    }
```

### 3. Caching Strategy

Two independent caches with configurable TTL:

**1. Row Cache** (`_rows_cache`)

- Caches raw Google Sheets rows
- Default TTL: 60 seconds (configurable via `ROWS_CACHE_TTL_SECONDS`)
- Prevents excessive API calls during data transformations

**2. Summary Cache** (`_summary_cache`)

- Caches aggregated metrics
- Default TTL: 60 seconds (configurable via `SUMMARY_CACHE_TTL_SECONDS`)
- Used by `/api/summary` endpoint

**Time-Based Expiration:**

```python
if cache_expires_at > now and cached_data is valid:
    return cached_data  # Cache hit
else:
    # Fetch fresh data and update cache
    _cache["expires_at"] = now + timedelta(seconds=TTL_SECONDS)
```

### 4. Aggregation & Statistics

The `fetch_data()` function performs one-pass aggregation:

```python
def fetch_data(responses: list[dict[str, Any]]) -> dict[str, Any]:
    """Format aggregate summary metrics using one-pass aggregation."""
```

**Computed Metrics:**

- `num_responses` - Total responses
- `avg_worry` - Average worry level (1-5)
- `worry_distribution` - Distribution across levels
- `percent_extremely_worried` - % with worry level 4-5
- `percent_not_worried` - % with worry level 1-2
- Category counts for all multiselect fields
- Zip code distribution
- Age/gender/race/ethnicity/income distribution
- Top MAX_SUMMARY_COMMENTS comments

**Efficiency:**

- Single pass through all data (O(n) complexity)
- Minimal memory overhead using Counter objects
- Filters and aggregates simultaneously

---

## API Endpoints

### 1. Get All Responses

```
GET /api/responses
```

**Returns:** Array of all survey responses in frontend schema

**Response:**

```json
[
  {
    "id": "SHEET-1",
    "timestamp": "2026-02-17T12:49:38Z",
    "zipCode": "94102",
    "email": "user@example.com",
    "verified": true,
    "worryLevel": 4,
    "futureOutlook": "Very concerned",
    "affordabilityBarriers": ["Food costs are too high"],
    "availabilityBarriers": [],
    "knowledgeInterests": ["Nutrition tips"],
    "otherNotes": "Additional context...",
    "ageRange": "30-40",
    "gender": "Female",
    "ethnicity": ["Asian", "Pacific Islander"],
    "householdSize": 3,
    "incomeRange": "$30k-$50k",
    "crisisAlert": true
  }
]
```

**Use Case:** Fetch all responses for detailed review or analytics

---

### 2. Get Filtered Responses

```
GET /api/responses/filter
```

**Query Parameters:**

- `range`: Time range filter
  - `"week"` - Last 7 days (default)
  - `"month"` - Last 30 days
  - `"quarter"` - Last 90 days
  - `"all"` - All time

- `offset`: Result offset for pagination (default: 0)
  - Must be >= 0

- `limit`: Maximum results to return
  - Optional; defaults based on `range`:
    - `"all"`: DEFAULT_ALL_RANGE_LIMIT (default 200)
    - Others: No default limit
  - Capped at MAX_FILTER_LIMIT (default 500)

**Example Requests:**

```bash
# Get last week's responses, paginated
GET /api/responses/filter?range=week&offset=0&limit=50

# Get last month, first 100 results
GET /api/responses/filter?range=month&offset=0&limit=100

# Get all responses (limited to 200 by default)
GET /api/responses/filter?range=all

# Get all responses with custom limit (capped at 500)
GET /api/responses/filter?range=all&limit=300
```

**Returns:** Filtered array of responses with the same schema as `/api/responses`

**Use Case:** Dashboard displays with time-range filtering and pagination

---

### 3. Get Summary Statistics

```
GET /api/summary
```

**Returns:** Aggregated metrics for all responses

**Response:**

```json
{
  "num_responses": 150,
  "avg_worry": 3.2,
  "worry_distribution": {
    "1": 25,
    "2": 35,
    "3": 40,
    "4": 35,
    "5": 15
  },
  "percent_extremely_worried": 33.3,
  "percent_not_worried": 40.0,
  "trouble_affording_counts": {
    "Food costs are too high": 45,
    "I do not have trouble getting any type of food": 105
  },
  "percent_with_trouble_affording": 30.0,
  "trouble_finding_counts": {
    /* similar structure */
  },
  "percent_with_trouble_finding": 25.0,
  "knowledge_counts": {
    /* topics of interest */
  },
  "future_concern_counts": {
    /* outlook distribution */
  },
  "age_counts": {
    /* age ranges */
  },
  "gender_counts": {
    /* gender distribution */
  },
  "race_ethnicity_counts": {
    /* ethnicity breakdown */
  },
  "zip_code_counts": {
    /* geographic distribution */
  },
  "household_size_counts": {
    /* family sizes */
  },
  "household_income_counts": {
    /* income ranges */
  },
  "additional_comments": ["comment1", "comment2", "..."], // max 100 by default
  "timestamp": "2026-02-17T12:49:38Z"
}
```

**Caching:** Results cached for SUMMARY_CACHE_TTL_SECONDS (default 60s)

**Use Case:** Dashboard statistics, data visualizations, report generation

---

### 4. Debug - Raw Rows

```
GET /api/debug/raw
```

**Requires:** `ENABLE_DEBUG_ENDPOINTS=true`

**Returns:** First row of raw data with type information

**Response:**

```json
{
  "total_raw_rows_fetched": 150,
  "sheets_range": "A2:N",
  "first_row_length": 14,
  "first_row_values": [
    {
      "index": 0,
      "value": "2026-02-17",
      "type": "str",
      "repr": "'2026-02-17'"
    }
  ],
  "all_rows_lengths": [14, 14, 13, ...]
}
```

**Use Case:** Debugging data format issues, verifying spreadsheet configuration

---

## Data Flow

### Request → Response Flow

```
1. Client Request
   ↓
2. FastAPI Route Handler (e.g., @app.get("/api/responses"))
   ↓
3. Check Cache (if applicable)
   ├─ Cache Hit → Return cached data
   └─ Cache Miss → proceed to step 4
   ↓
4. fetch_sheet_rows()
   ├─ Authenticate with Google Sheets API
   ├─ Execute sheets.values().get(spreadsheetId, range)
   └─ Return raw rows array
   ↓
5. Transform Data
   ├─ For each row: normalize_raw_response()
   ├─ For each normalized: build_frontend_response()
   └─ Return transformed array
   ↓
6. Optional: Aggregate Statistics (fetch_data())
   ├─ Count/sum all metrics across rows
   └─ Return summary dict
   ↓
7. Update Cache (if applicable)
   └─ Set expires_at = now + TTL
   ↓
8. Return JSON Response to Client
```

### Timestamp Parsing Priority

When parsing timestamps, the code tries formats in this order:

1. **Excel Serial Number** (e.g., `45000`) → converts to datetime
2. **DateTime String Formats** (in order):
   - `2/17/2026 12:49:38`
   - `2/17/2026 12:49:38 PM`
   - `2026-02-17 12:49:38`
   - `2/17/2026`
   - `2026-02-17`
3. **ISO Format** (e.g., `2026-02-17T12:49:38Z`)
4. **Fallback:** Returns `None`, uses `datetime.now()`

---

## Configuration

### Environment Variables

Create a `.env` file in the `backend/` directory:

```bash
# ============================================
# REQUIRED Configuration
# ============================================

# Google Sheets Configuration
# The spreadsheet ID from the Google Sheet URL:
# https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
SPREADSHEET_ID=SPREADSHEET_ID

# The range to fetch data from (e.g., A2:N for columns A-N, starting row 2)
SHEETS_RANGE=Sheet1!A2:N

# Google Service Account Credentials
# Option 1: Path to credentials file
GOOGLE_SERVICE_ACCOUNT_JSON=./credentials.json

# Option 2: Raw JSON (multi-line, best in .env file)
# GOOGLE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"..."}

# ============================================
# Cache Configuration (Optional)
# ============================================

# TTL for row cache (seconds)
ROWS_CACHE_TTL_SECONDS=60

# TTL for summary cache (seconds)
SUMMARY_CACHE_TTL_SECONDS=60

# Maximum comments to include in summary
MAX_SUMMARY_COMMENTS=100

# ============================================
# API Limits (Optional)
# ============================================

# Default limit for /api/responses/filter?range=all
DEFAULT_ALL_RANGE_LIMIT=200

# Maximum limit allowed across all endpoints
MAX_FILTER_LIMIT=500

# ============================================
# Debug (Optional)
# ============================================

# Enable debug endpoints (/api/debug/raw)
ENABLE_DEBUG_ENDPOINTS=false
```

### Google Service Account Setup

1. **Create Service Account**
   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project
   - Enable Google Sheets API
   - Create a Service Account

2. **Generate Credentials**
   - Download JSON key from service account
   - Save as `credentials.json` in `backend/` directory

3. **Grant Sheet Access**
   - Share the Google Sheet with the service account email
   - Grant "Viewer" or "Editor" permissions

4. **Verify Configuration**
   - Test: `ENABLE_DEBUG_ENDPOINTS=true` and visit `/api/debug/raw`
   - Should return data without errors

---

## Deployment

### Production Build

```bash
# Install dependencies
pip install -r requirements.txt

# Run with Gunicorn (production WSGI server)
gunicorn -w 4 -k uvicorn.workers.UvicornWorker app:app --bind 0.0.0.0:8000
```

### Environment Setup

Production deployments require:

1. **Secret Management**
   - Never commit `.env` to version control
   - Use platform secrets (Render, Vercel, etc.)
   - Rotate credentials regularly

2. **Security**
   - Set `ENABLE_DEBUG_ENDPOINTS=false`
   - Review CORS configuration for your domain
   - Use HTTPS for all API calls

3. **Performance**
   - Adjust cache TTLs based on data freshness needs
   - Monitor API quota usage with Google Sheets API
   - Consider caching layer (Redis) for high-traffic scenarios

### CORS Configuration

Currently configured to allow:

- `http://localhost:3000` (React dev server)
- `http://localhost:5173` (Vite dev server)
- `https://*.vercel.app` (All Vercel preview & production URLs)

**To add more origins:**

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Add here
    allow_origin_regex=r"https://.*\.custom\.app",  # Or regex patterns
    ...
)
```

---

## Troubleshooting

### No Data Returned

**Symptom:** `/api/responses` returns empty array

**Checklist:**

1. Verify `SPREADSHEET_ID` is correct (from sheet URL)
2. Verify `SHEETS_RANGE` matches your data (e.g., `Sheet1!A2:N`)
3. Confirm service account has access (share sheet with service account email)
4. Check credentials file exists and is valid JSON
5. Enable debug: `ENABLE_DEBUG_ENDPOINTS=true` and visit `/api/debug/raw`
6. Check application logs for authentication errors

---

### "Invalid GOOGLE_SERVICE_ACCOUNT_JSON value"

**Symptom:** JSON decode error in credentials

**Solution:**

- Verify JSON is valid (use [jsonlint.com](https://jsonlint.com))
- If using file path: check file exists relative to working directory
- If using raw JSON in .env: ensure proper escaping (no line breaks)

---

### Timestamps Showing as "None"

**Symptom:** Timestamps from Google Sheets not parsing

**Cause:** Unexpected date format

**Fix:**

1. Check actual format in sheet (`/api/debug/raw` shows first row)
2. Add format to `parse_timestamp()` function
3. Or convert to standard format in Google Sheets

---

### Cache Not Clearing

**Symptom:** Data changes don't appear immediately

**Solution:**

- Cache expires after TTL (default 60s)
- To force refresh: restart server
- Or reduce cache TTLs in `.env`:
  ```bash
  ROWS_CACHE_TTL_SECONDS=10
  SUMMARY_CACHE_TTL_SECONDS=10
  ```

---

### High Memory Usage

**Symptom:** Backend process consuming too much memory

**Investigation:**

1. Check response counts: `num_responses` in summary
2. Reduce `MAX_SUMMARY_COMMENTS` if comments are large
3. Consider pagination for large datasets

**Optimization:**

- Implement database storage (PostgreSQL, MongoDB) for large datasets
- Use streaming responses for paginated endpoints
- Consider async data processing

---

## Contributing

### Code Style

- Follow PEP 8 style guide
- Use type hints for function parameters and returns
- Add docstrings to functions

### Adding New Endpoints

1. Define function with `@app.get()` or `@app.post()` decorator
2. Use type hints for query parameters and response
3. Add docstring explaining purpose and usage
4. Handle errors with `HTTPException(status_code=..., detail=...)`

### Adding New Metrics

To add new aggregated metrics to `/api/summary`:

1. Create a new `Counter[T]` in `fetch_data()`
2. Update it in the loop over responses
3. Add to returned metrics dict
4. Test with sample data

### Testing

```bash
# Run development server with auto-reload
uvicorn app:app --reload

# Open API docs to test endpoints manually
# http://localhost:8000/docs
```

---

## Quick Reference

### Common Commands

```bash
# Start dev server
uvicorn app:app --reload

# Install new package
pip install package-name

# Activate virtual environment
.\env\Scripts\activate  # Windows
source env/bin/activate  # macOS/Linux
```

### Key Files to Modify

| Task                  | File                                           |
| --------------------- | ---------------------------------------------- |
| Add new endpoint      | `app.py` - Add `@app.get()` function           |
| Change data schema    | `app.py` - Modify `build_frontend_response()`  |
| Add new metric        | `app.py` - Update `fetch_data()`               |
| Change cache behavior | `app.py` - Modify TTL constants or cache logic |
| Add dependencies      | `requirements.txt` - Add package and version   |

---

## Additional Resources

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Google Sheets API Guide](https://developers.google.com/sheets/api)
- [Uvicorn Documentation](https://www.uvicorn.org/)
- [Python Type Hints](https://docs.python.org/3/library/typing.html)

---