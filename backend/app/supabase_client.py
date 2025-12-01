"""
Supabase client module for database operations.

IMPORTANT: This module uses the NEW non-legacy Supabase keys format.
- SUPABASE_PUBLISHABLE_KEY: Format 'sb_publishable_*' (for client-side, limited access)
- SUPABASE_SECRET_KEY: Format 'sb_secret_*' (for server-side, full access)

DO NOT use legacy keys (anon key / service_role key format).
"""

from supabase import create_client, Client
from typing import Optional
from .config import get_settings

settings = get_settings()

# Initialize Supabase client with the SECRET key for server-side operations
# The secret key provides full database access for backend operations
_supabase_client: Optional[Client] = None


def get_supabase_client() -> Client:
    """
    Get or create the Supabase client instance.
    Uses the SECRET key for full server-side access.
    
    Returns:
        Supabase Client instance
    """
    global _supabase_client
    
    if _supabase_client is None:
        # Use SUPABASE_SECRET_KEY for server-side operations
        # This provides full access to the database
        _supabase_client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SECRET_KEY
        )
    
    return _supabase_client


def get_supabase_public_client() -> Client:
    """
    Get Supabase client with publishable key.
    Use this for operations that should respect RLS policies.
    
    Returns:
        Supabase Client instance with limited access
    """
    return create_client(
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
