"""Simple in-memory cache implementation with TTL support."""

import time
from typing import Any, Optional
from collections import OrderedDict
import threading


class TTLCache:
    """Thread-safe in-memory cache with TTL support."""
    
    def __init__(self, max_size: int = 1000, ttl_seconds: int = 300):
        """
        Initialize the cache.
        
        Args:
            max_size: Maximum number of items to store
            ttl_seconds: Time-to-live for cache entries in seconds
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._cache: OrderedDict = OrderedDict()
        self._timestamps: dict = {}
        self._lock = threading.Lock()
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found/expired
        """
        with self._lock:
            if key not in self._cache:
                return None
            
            # Check if expired
            if time.time() - self._timestamps[key] > self.ttl_seconds:
                self._remove(key)
                return None
            
            # Move to end (most recently used)
            self._cache.move_to_end(key)
            return self._cache[key]
    
    def set(self, key: str, value: Any, ttl: int = None) -> None:
        """
        Set a value in the cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Optional custom TTL for this entry (uses default if not provided)
        """
        with self._lock:
            if key in self._cache:
                self._cache.move_to_end(key)
            else:
                if len(self._cache) >= self.max_size:
                    # Remove oldest item
                    oldest_key = next(iter(self._cache))
                    self._remove(oldest_key)
            
            self._cache[key] = value
            self._timestamps[key] = time.time()
            # Store custom TTL if provided
            if ttl is not None:
                self._custom_ttls = getattr(self, '_custom_ttls', {})
                self._custom_ttls[key] = ttl
    
    def _remove(self, key: str) -> None:
        """Remove a key from cache (internal, assumes lock is held)."""
        if key in self._cache:
            del self._cache[key]
            del self._timestamps[key]
    
    def clear(self) -> None:
        """Clear all cached items."""
        with self._lock:
            self._cache.clear()
            self._timestamps.clear()
    
    def cleanup_expired(self) -> int:
        """
        Remove all expired entries.
        
        Returns:
            Number of entries removed
        """
        current_time = time.time()
        removed = 0
        
        with self._lock:
            expired_keys = [
                key for key, timestamp in self._timestamps.items()
                if current_time - timestamp > self.ttl_seconds
            ]
            for key in expired_keys:
                self._remove(key)
                removed += 1
        
        return removed
    
    def stats(self) -> dict:
        """Get cache statistics."""
        with self._lock:
            return {
                "size": len(self._cache),
                "max_size": self.max_size,
                "ttl_seconds": self.ttl_seconds
            }


# Global cache instances
tile_cache = TTLCache(max_size=500, ttl_seconds=300)  # 5 minute TTL for tiles
token_cache = TTLCache(max_size=10, ttl_seconds=3500)  # ~58 minutes for tokens
weather_cache = TTLCache(max_size=100, ttl_seconds=600)  # 10 minute TTL for weather
