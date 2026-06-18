from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Use Redis as the shared rate-limit store when configured so limits stay
# correct across multiple instances/redeploys; falls back to in-memory
# (per-process) storage for local dev when REDIS_URL is unset.
_storage_uri = settings.REDIS_URL or None

limiter = Limiter(key_func=get_remote_address, storage_uri=_storage_uri)
