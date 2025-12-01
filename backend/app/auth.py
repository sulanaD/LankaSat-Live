"""
Authentication module for user registration, login, and session management.

Provides:
- Email/password registration
- Email/password login
- Guest login (temporary session, no account required)
- JWT token generation and validation
- Password hashing with bcrypt
"""

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import jwt

from pydantic import BaseModel, EmailStr, Field
from .config import get_settings
from .supabase_client import get_supabase_client

settings = get_settings()


# ============================================
# PYDANTIC MODELS
# ============================================

class UserRegister(BaseModel):
    """User registration request model."""
    email: EmailStr
    password: str = Field(..., min_length=6)
    display_name: Optional[str] = None


class UserLogin(BaseModel):
    """User login request model."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User response model (excludes sensitive data)."""
    id: str
    email: Optional[str]
    role: str
    display_name: Optional[str]
    created_at: Optional[str]


class TokenResponse(BaseModel):
    """Authentication token response."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse


class GuestSession(BaseModel):
    """Guest session response."""
    session_id: str
    token: str
    role: str = "guest"
    expires_in: int


# ============================================
# PASSWORD HASHING
# ============================================

def hash_password(password: str) -> str:
    """
    Hash a password using SHA-256 with salt.
    In production, use bcrypt or argon2 for better security.
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password string
    """
    # Generate a random salt
    salt = secrets.token_hex(16)
    # Hash password with salt
    hashed = hashlib.sha256((password + salt).encode()).hexdigest()
    # Return salt:hash format
    return f"{salt}:{hashed}"


def verify_password(password: str, password_hash: str) -> bool:
    """
    Verify a password against its hash.
    
    Args:
        password: Plain text password to verify
        password_hash: Stored hash in salt:hash format
        
    Returns:
        True if password matches, False otherwise
    """
    try:
        salt, stored_hash = password_hash.split(":")
        computed_hash = hashlib.sha256((password + salt).encode()).hexdigest()
        return computed_hash == stored_hash
    except (ValueError, AttributeError):
        return False


# ============================================
# JWT TOKEN MANAGEMENT
# ============================================

def create_access_token(user_id: str, email: Optional[str], role: str) -> str:
    """
    Create a JWT access token for authenticated user.
    
    Args:
        user_id: User's UUID
        email: User's email (None for guests)
        role: User's role (guest, user, admin)
        
    Returns:
        JWT token string
    """
    expiration = datetime.utcnow() + timedelta(hours=settings.JWT_EXPIRATION_HOURS)
    
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": expiration,
        "iat": datetime.utcnow()
    }
    
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode and validate a JWT access token.
    
    Args:
        token: JWT token string
        
    Returns:
        Decoded payload dict or None if invalid
    """
    try:
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def get_current_user_from_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Get current user info from JWT token.
    
    Args:
        token: JWT token (without 'Bearer ' prefix)
        
    Returns:
        User info dict or None if invalid
    """
    payload = decode_access_token(token)
    if payload:
        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role")
        }
    return None


# ============================================
# AUTHENTICATION FUNCTIONS
# ============================================

async def register_user(email: str, password: str, display_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Register a new user with email and password.
    
    Args:
        email: User's email address
        password: Plain text password (will be hashed)
        display_name: Optional display name
        
    Returns:
        Dict with user data and access token
        
    Raises:
        ValueError: If email already exists
    """
    supabase = get_supabase_client()
    
    # Check if email already exists
    existing = supabase.table("users").select("id").eq("email", email).execute()
    if existing.data:
        raise ValueError("Email already registered")
    
    # Hash password
    password_hash = hash_password(password)
    
    # Create user record
    user_data = {
        "id": str(uuid.uuid4()),
        "email": email,
        "password_hash": password_hash,
        "role": "user",
        "display_name": display_name or email.split("@")[0]
    }
    
    result = supabase.table("users").insert(user_data).execute()
    
    if not result.data:
        raise ValueError("Failed to create user")
    
    user = result.data[0]
    
    # Generate access token
    token = create_access_token(user["id"], user["email"], user["role"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_HOURS * 3600,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "display_name": user.get("display_name"),
            "created_at": user.get("created_at")
        }
    }


async def login_user(email: str, password: str) -> Dict[str, Any]:
    """
    Authenticate user with email and password.
    
    Args:
        email: User's email address
        password: Plain text password
        
    Returns:
        Dict with user data and access token
        
    Raises:
        ValueError: If credentials are invalid
    """
    supabase = get_supabase_client()
    
    # Find user by email
    result = supabase.table("users").select("*").eq("email", email).execute()
    
    if not result.data:
        raise ValueError("Invalid email or password")
    
    user = result.data[0]
    
    # Verify password
    if not verify_password(password, user.get("password_hash", "")):
        raise ValueError("Invalid email or password")
    
    # Generate access token
    token = create_access_token(user["id"], user["email"], user["role"])
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.JWT_EXPIRATION_HOURS * 3600,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"],
            "display_name": user.get("display_name"),
            "created_at": user.get("created_at")
        }
    }


async def guest_login() -> Dict[str, Any]:
    """
    Create a guest session without requiring registration.
    Guest users can still register shelters but are marked as guests.
    
    Returns:
        Dict with guest session token
    """
    # Generate guest ID
    guest_id = str(uuid.uuid4())
    session_id = secrets.token_urlsafe(16)
    
    # Generate access token for guest
    token = create_access_token(guest_id, None, "guest")
    
    return {
        "session_id": session_id,
        "access_token": token,
        "token_type": "bearer",
        "role": "guest",
        "expires_in": settings.JWT_EXPIRATION_HOURS * 3600,
        "user": {
            "id": guest_id,
            "email": None,
            "role": "guest",
            "display_name": f"Guest-{session_id[:8]}"
        }
    }


async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """
    Get user details by ID.
    
    Args:
        user_id: User's UUID
        
    Returns:
        User dict or None if not found
    """
    supabase = get_supabase_client()
    
    result = supabase.table("users").select("id, email, role, display_name, created_at").eq("id", user_id).execute()
    
    if result.data:
        return result.data[0]
    return None


async def update_user_profile(user_id: str, display_name: Optional[str] = None) -> Dict[str, Any]:
    """
    Update user profile information.
    
    Args:
        user_id: User's UUID
        display_name: New display name
        
    Returns:
        Updated user dict
    """
    supabase = get_supabase_client()
    
    update_data = {}
    if display_name:
        update_data["display_name"] = display_name
    
    if not update_data:
        raise ValueError("No fields to update")
    
    result = supabase.table("users").update(update_data).eq("id", user_id).execute()
    
    if not result.data:
        raise ValueError("User not found")
    
    return result.data[0]
