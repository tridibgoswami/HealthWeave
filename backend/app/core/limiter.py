from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

# Use Redis as the shared rate-limit store when configured so limits stay
# correct across multiple instances/redeploys; falls back to in-memory
# (per-process) storage for local dev when REDIS_URL is unset.
#
# swallow_errors + in_memory_fallback_enabled: if Redis is unreachable or
# misconfigured, rate-limit checks must NEVER take down real requests
# (login/register/etc.) — degrade to in-memory limiting instead of 500ing.
_storage_uri = settings.REDIS_URL or None

limiter = Limiter(
    key_func=get_remote_address,
    storage_uri=_storage_uri,
    in_memory_fallback_enabled=True,
    swallow_errors=True,
)
