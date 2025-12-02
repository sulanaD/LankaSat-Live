"""
Relief Directory API
Reads flood relief donation data from local CSV file
"""

import csv
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
from pydantic import BaseModel

# Path to CSV file (relative to backend folder)
CSV_FILE_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "frontend", "data", "Flood relief donation directory - General.csv"
)

GOOGLE_FORM_URL = "https://docs.google.com/spreadsheets/d/1Wrw6JiVzlYZ9lCeBWg70LuP4yqgMuoDH45OmYI2kLcY/edit"

# Cache for storing parsed data
_cache: Dict[str, Any] = {
    "data": None,
    "last_load": None,
    "ttl_seconds": 300  # 5 minutes cache
}


class ReliefDirectoryResponse(BaseModel):
    """Response model for relief directory"""
    success: bool
    data: Dict[str, List[Dict[str, Any]]]
    total_organizations: int
    last_updated: str
    google_sheet_url: str
    categories: List[str]
    message: Optional[str] = None


def load_csv_data() -> List[Dict[str, Any]]:
    """
    Load and parse the CSV file
    """
    organizations = []
    
    if not os.path.exists(CSV_FILE_PATH):
        print(f"CSV file not found at: {CSV_FILE_PATH}")
        return organizations
    
    try:
        with open(CSV_FILE_PATH, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)
            
            # Skip the disclaimer row (first row)
            # Header row is the second row
            if len(rows) < 2:
                return organizations
            
            # Find header row (contains "Related Organization")
            header_idx = 0
            for idx, row in enumerate(rows):
                if row and "Related Organization" in row[0]:
                    header_idx = idx
                    break
            
            headers = rows[header_idx] if header_idx < len(rows) else []
            
            # Map headers to indices
            header_map = {h.strip(): i for i, h in enumerate(headers) if h.strip()}
            
            # Parse data rows
            for idx, row in enumerate(rows[header_idx + 1:]):
                if not row or not row[0].strip():
                    continue
                
                org = {
                    "id": idx + 1,
                    "organization_name": row[0].strip() if len(row) > 0 else "",
                    "org_type": row[1].strip() if len(row) > 1 else "",
                    "donation_details": row[2].strip() if len(row) > 2 else "",
                    "monetary_donations": row[3].strip() if len(row) > 3 else "",
                    "dry_rations": row[4].strip() if len(row) > 4 else "",
                    "volunteer": row[5].strip() if len(row) > 5 else "",
                    "overseas_donations": row[6].strip() if len(row) > 6 else "",
                    "item_drop_off": row[7].strip() if len(row) > 7 else "",
                    "org_link": row[8].strip() if len(row) > 8 else "",
                    "category": categorize_org(row[1].strip() if len(row) > 1 else "")
                }
                
                organizations.append(org)
                
    except Exception as e:
        print(f"Error loading CSV: {e}")
    
    return organizations


def categorize_org(org_type: str) -> str:
    """Categorize organization based on type"""
    org_type_lower = org_type.lower()
    
    if "government" in org_type_lower:
        return "government"
    elif "ngo" in org_type_lower:
        return "ngo"
    elif "media" in org_type_lower:
        return "media"
    elif "non-profit" in org_type_lower or "nonprofit" in org_type_lower:
        return "non_profit"
    elif "volunteer" in org_type_lower:
        return "volunteer"
    elif "private" in org_type_lower or "business" in org_type_lower:
        return "business"
    else:
        return "general"


async def get_relief_directory(force_refresh: bool = False) -> ReliefDirectoryResponse:
    """
    Get the full relief directory data
    Uses caching to avoid re-reading file constantly
    """
    global _cache
    
    # Check cache
    if not force_refresh and _cache["data"] and _cache["last_load"]:
        cache_age = (datetime.now() - _cache["last_load"]).total_seconds()
        if cache_age < _cache["ttl_seconds"]:
            return _cache["data"]
    
    # Load fresh data
    organizations = load_csv_data()
    
    # Group by category
    categories_data: Dict[str, List[Dict[str, Any]]] = {
        "general": [],
        "government": [],
        "ngo": [],
        "media": [],
        "non_profit": [],
        "volunteer": [],
        "business": []
    }
    
    for org in organizations:
        category = org.get("category", "general")
        if category in categories_data:
            categories_data[category].append(org)
        else:
            categories_data["general"].append(org)
    
    # Remove empty categories
    categories_data = {k: v for k, v in categories_data.items() if v}
    
    total_orgs = len(organizations)
    
    response = ReliefDirectoryResponse(
        success=True,
        data=categories_data,
        total_organizations=total_orgs,
        last_updated=datetime.now().isoformat(),
        google_sheet_url=GOOGLE_FORM_URL,
        categories=list(categories_data.keys()),
        message=f"Loaded {total_orgs} organizations from local data"
    )
    
    # Update cache
    _cache["data"] = response
    _cache["last_load"] = datetime.now()
    
    return response


async def get_relief_by_category(category: str) -> Dict[str, Any]:
    """Get relief organizations filtered by category"""
    directory = await get_relief_directory()
    
    if category.lower() in directory.data:
        return {
            "success": True,
            "category": category,
            "organizations": directory.data[category.lower()],
            "count": len(directory.data[category.lower()]),
            "google_sheet_url": GOOGLE_FORM_URL
        }
    
    return {
        "success": False,
        "error": f"Category '{category}' not found",
        "available_categories": directory.categories
    }


async def search_relief_organizations(query: str) -> Dict[str, Any]:
    """Search organizations by name, location, or items"""
    directory = await get_relief_directory()
    
    results = []
    query_lower = query.lower()
    
    for category, orgs in directory.data.items():
        for org in orgs:
            # Search in multiple fields
            searchable_text = " ".join([
                str(org.get("organization_name", "")),
                str(org.get("org_type", "")),
                str(org.get("item_drop_off", "")),
                str(org.get("donation_details", ""))
            ]).lower()
            
            if query_lower in searchable_text:
                results.append(org)
    
    return {
        "success": True,
        "query": query,
        "results": results,
        "count": len(results),
        "google_sheet_url": GOOGLE_FORM_URL
    }


def get_google_sheet_url() -> str:
    """Return the Google Sheet URL for users who want to interact"""
    return GOOGLE_FORM_URL
