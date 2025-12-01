"""
Supabase client module for database operations.

IMPORTANT: This module uses the NEW non-legacy Supabase keys format.
- SUPABASE_PUBLISHABLE_KEY: Format 'sb_publishable_*' (for client-side, limited access)
- SUPABASE_SECRET_KEY: Format 'sb_secret_*' (for server-side, full access)

DO NOT use legacy keys (anon key / service_role key format).

NOTE: Uses httpx REST API directly to avoid supabase-py dependency conflicts.
"""

import httpx
from typing import Optional, Dict, Any, List
from .config import get_settings

settings = get_settings()


class SupabaseClient:
    """
    Simple Supabase REST API client using httpx.
    Avoids dependency conflicts with supabase-py package.
    """
    
    def __init__(self, url: str, key: str):
        self.url = url.rstrip('/')
        self.key = key
        self.rest_url = f"{self.url}/rest/v1"
        self.headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
    
    def table(self, table_name: str) -> 'SupabaseTable':
        """Get a table query builder."""
        return SupabaseTable(self, table_name)


class SupabaseTable:
    """Query builder for Supabase table operations."""
    
    def __init__(self, client: SupabaseClient, table_name: str):
        self.client = client
        self.table_name = table_name
        self.url = f"{client.rest_url}/{table_name}"
        self._select_columns = "*"
        self._filters: List[str] = []
        self._order_by: Optional[str] = None
        self._limit_val: Optional[int] = None
        self._offset_val: Optional[int] = None
        self._count_type: Optional[str] = None
    
    def select(self, columns: str = "*", count: Optional[str] = None) -> 'SupabaseTable':
        """Select columns to return."""
        self._select_columns = columns
        self._count_type = count
        return self
    
    def eq(self, column: str, value: Any) -> 'SupabaseTable':
        """Filter by equality."""
        self._filters.append(f"{column}=eq.{value}")
        return self
    
    def neq(self, column: str, value: Any) -> 'SupabaseTable':
        """Filter by not equal."""
        self._filters.append(f"{column}=neq.{value}")
        return self
    
    def gt(self, column: str, value: Any) -> 'SupabaseTable':
        """Filter by greater than."""
        self._filters.append(f"{column}=gt.{value}")
        return self
    
    def gte(self, column: str, value: Any) -> 'SupabaseTable':
        """Filter by greater than or equal."""
        self._filters.append(f"{column}=gte.{value}")
        return self
    
    def lt(self, column: str, value: Any) -> 'SupabaseTable':
        """Filter by less than."""
        self._filters.append(f"{column}=lt.{value}")
        return self
    
    def lte(self, column: str, value: Any) -> 'SupabaseTable':
        """Filter by less than or equal."""
        self._filters.append(f"{column}=lte.{value}")
        return self
    
    def is_(self, column: str, value: Any) -> 'SupabaseTable':
        """Filter by IS (for null checks)."""
        self._filters.append(f"{column}=is.{value}")
        return self
    
    @property
    def not_(self) -> 'SupabaseTableNot':
        """Return NOT filter builder."""
        return SupabaseTableNot(self)
    
    def order(self, column: str, desc: bool = False) -> 'SupabaseTable':
        """Order results."""
        direction = "desc" if desc else "asc"
        self._order_by = f"{column}.{direction}"
        return self
    
    def limit(self, count: int) -> 'SupabaseTable':
        """Limit results."""
        self._limit_val = count
        return self
    
    def range(self, start: int, end: int) -> 'SupabaseTable':
        """Set range for pagination."""
        self._offset_val = start
        self._limit_val = end - start + 1
        return self
    
    def _build_url(self) -> str:
        """Build the request URL with query parameters."""
        params = [f"select={self._select_columns}"]
        params.extend(self._filters)
        if self._order_by:
            params.append(f"order={self._order_by}")
        if self._limit_val is not None:
            params.append(f"limit={self._limit_val}")
        if self._offset_val is not None:
            params.append(f"offset={self._offset_val}")
        return f"{self.url}?{'&'.join(params)}"
    
    def execute(self) -> 'SupabaseResponse':
        """Execute the query."""
        url = self._build_url()
        headers = self.client.headers.copy()
        
        if self._count_type:
            headers["Prefer"] = f"count={self._count_type}"
        
        with httpx.Client(timeout=30.0) as client:
            response = client.get(url, headers=headers)
            response.raise_for_status()
            
            count = None
            if self._count_type and "content-range" in response.headers:
                range_header = response.headers.get("content-range", "")
                if "/" in range_header:
                    count = int(range_header.split("/")[-1])
            
            return SupabaseResponse(response.json(), count)
    
    def insert(self, data: Dict[str, Any]) -> 'SupabaseResponse':
        """Insert a new row."""
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                self.url,
                headers=self.client.headers,
                json=data
            )
            response.raise_for_status()
            return SupabaseResponse(response.json())
    
    def update(self, data: Dict[str, Any]) -> 'SupabaseResponse':
        """Update rows matching filters."""
        url = self._build_url().replace(f"select={self._select_columns}&", "").replace(f"select={self._select_columns}", "")
        if "?" not in url:
            url = f"{self.url}?"
        
        with httpx.Client(timeout=30.0) as client:
            response = client.patch(
                url,
                headers=self.client.headers,
                json=data
            )
            response.raise_for_status()
            return SupabaseResponse(response.json())
    
    def delete(self) -> 'SupabaseResponse':
        """Delete rows matching filters."""
        params = "&".join(self._filters)
        url = f"{self.url}?{params}" if params else self.url
        
        with httpx.Client(timeout=30.0) as client:
            response = client.delete(url, headers=self.client.headers)
            response.raise_for_status()
            return SupabaseResponse(response.json() if response.text else [])


class SupabaseTableNot:
    """NOT filter builder for negated conditions."""
    
    def __init__(self, table: SupabaseTable):
        self.table = table
    
    def is_(self, column: str, value: Any) -> SupabaseTable:
        """Filter by IS NOT."""
        self.table._filters.append(f"{column}=not.is.{value}")
        return self.table


class SupabaseResponse:
    """Response wrapper for Supabase queries."""
    
    def __init__(self, data: Any, count: Optional[int] = None):
        self.data = data if isinstance(data, list) else [data] if data else []
        self.count = count


# Global client instance
_supabase_client: Optional[SupabaseClient] = None


def get_supabase_client() -> SupabaseClient:
    """
    Get or create the Supabase client instance.
    Uses the SECRET key for full server-side access.
    
    Returns:
        SupabaseClient instance
    """
    global _supabase_client
    
    if _supabase_client is None:
        # Use SUPABASE_SECRET_KEY for server-side operations
        # This provides full access to the database
        _supabase_client = SupabaseClient(
            settings.SUPABASE_URL,
            settings.SUPABASE_SECRET_KEY
        )
    
    return _supabase_client


def get_supabase_public_client() -> SupabaseClient:
    """
    Get Supabase client with publishable key.
    Use this for operations that should respect RLS policies.
    
    Returns:
        SupabaseClient instance with limited access
    """
    return SupabaseClient(
        settings.SUPABASE_URL,
        settings.SUPABASE_PUBLISHABLE_KEY
    )


# SQL schema for creating tables in Supabase
# Run this in the Supabase SQL Editor to set up the database
SCHEMA_SQL = """
-- ============================================
-- SUPABASE SCHEMA FOR LANKASAT SHELTER SYSTEM
-- ============================================
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- USERS TABLE
-- ============================================
-- Stores user accounts for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    password_hash TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('guest', 'user', 'admin')),
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ============================================
-- SHELTERS TABLE
-- ============================================
-- Stores registered disaster relief shelters
CREATE TABLE IF NOT EXISTS shelters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    lat DOUBLE PRECISION NOT NULL,
    lon DOUBLE PRECISION NOT NULL,
    capacity INTEGER,
    contact_phone TEXT,
    contact_email TEXT,
    address TEXT,
    amenities TEXT[], -- Array of amenities like 'water', 'food', 'medical'
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'full')),
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_shelters_location ON shelters(lat, lon);
CREATE INDEX IF NOT EXISTS idx_shelters_status ON shelters(status);
CREATE INDEX IF NOT EXISTS idx_shelters_added_by ON shelters(added_by);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE shelters ENABLE ROW LEVEL SECURITY;

-- Users can read their own data
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own data
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Anyone can read active shelters (public data)
CREATE POLICY "Anyone can view active shelters" ON shelters
    FOR SELECT USING (status = 'active');

-- Authenticated users can insert shelters
CREATE POLICY "Authenticated users can add shelters" ON shelters
    FOR INSERT WITH CHECK (true);

-- Users can update their own shelters
CREATE POLICY "Users can update own shelters" ON shelters
    FOR UPDATE USING (added_by = auth.uid());

-- Users can delete their own shelters
CREATE POLICY "Users can delete own shelters" ON shelters
    FOR DELETE USING (added_by = auth.uid());

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for shelters table
DROP TRIGGER IF EXISTS update_shelters_updated_at ON shelters;
CREATE TRIGGER update_shelters_updated_at
    BEFORE UPDATE ON shelters
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- SAMPLE DATA (OPTIONAL - for testing)
-- ============================================
-- Uncomment to insert sample shelters

-- INSERT INTO shelters (name, description, lat, lon, capacity, status) VALUES
-- ('Colombo Community Center', 'Main relief shelter in Colombo', 6.9271, 79.8612, 500, 'active'),
-- ('Galle Fort Shelter', 'Historic fort converted to emergency shelter', 6.0329, 80.2168, 200, 'active'),
-- ('Kandy Municipal Hall', 'Central province main shelter', 7.2906, 80.6337, 350, 'active'),
-- ('Jaffna Stadium Shelter', 'Northern province emergency center', 9.6615, 80.0255, 400, 'active'),
-- ('Batticaloa School', 'Eastern province relief center', 7.7310, 81.6747, 250, 'active');
"""


def print_schema():
    """Print the SQL schema for manual execution in Supabase."""
    print(SCHEMA_SQL)
