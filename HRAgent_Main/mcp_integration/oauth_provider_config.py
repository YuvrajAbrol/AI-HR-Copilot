"""Backend-only OAuth provider app credentials.

Some OAuth providers (Google, Slack) don't support dynamic client
registration, so authorizing against them requires a pre-registered
"application" -- a client_id/client_secret pair created once by whoever
deploys HRAgent, in that provider's developer console. These are *deployment*
secrets, not end-user credentials: the person clicking "Connect with Google"
in the MCP setup UI should never see, enter, or need to know about them.

This module is the single place those deployment secrets are read from. They
live in a JSON file outside the git working tree by default (the same
``~/.HRAgent`` directory that already holds the settings-encryption secret
key -- see ``runtime.server.config._secret_key_path``), so there is no way to
accidentally commit them. The file's location can be overridden with
``OH_OAUTH_PROVIDERS_CONFIG_PATH`` for containerized deployments that mount
it from a secret volume.

File format (see ``config/oauth_providers.example.json`` for a template)::

    {
      "google": {"client_id": "...", "client_secret": "..."},
      "slack": {"client_id": "...", "client_secret": "..."}
    }

Integrations opt into this by setting ``provider`` on their ``.mcp.json``
template's ``auth.authentication`` block (see ``MCPOAuthAuthentication.provider``).
Providers with no entry here simply fall back to dynamic client registration
(Linear, Jira/Atlassian) or report a clear "not configured" error instead of
attempting a doomed DCR call (Google, Slack).
"""

from __future__ import annotations

import json
import os
from pathlib import Path

from pydantic import BaseModel, SecretStr, ValidationError

from runtime.telemetry.logger import get_logger


logger = get_logger(__name__)


class OAuthProviderCredentials(BaseModel):
    client_id: str
    client_secret: SecretStr | None = None


def oauth_providers_config_path() -> Path:
    """Filesystem location of the OAuth provider credentials file.

    Mirrors ``runtime.server.config._secret_key_path``'s precedence
    (``OH_PERSISTENCE_DIR``, else ``~/.HRAgent``) so both secret files live
    in the same place by default, with a dedicated override for deployments
    that want to mount just this one from a secret store.
    """
    override = os.environ.get("OH_OAUTH_PROVIDERS_CONFIG_PATH")
    if override:
        return Path(override)
    env_dir = os.environ.get("OH_PERSISTENCE_DIR")
    base = Path(env_dir) if env_dir else Path.home() / ".HRAgent"
    return base / "oauth_providers.json"


# Re-read whenever the file's mtime changes, so editing it takes effect
# without a server restart -- there's no other cache invalidation trigger
# for a file that lives outside anything else the app watches.
_cache: dict[str, OAuthProviderCredentials] = {}
_cache_mtime: float | None = None
_warned_missing = False


def _load() -> dict[str, OAuthProviderCredentials]:
    global _cache, _cache_mtime, _warned_missing

    path = oauth_providers_config_path()
    try:
        mtime = path.stat().st_mtime
    except OSError:
        if not _warned_missing:
            logger.info(
                "No OAuth provider config at %s -- integrations requiring a "
                "pre-registered app (Google, Slack) will report 'not "
                "configured' until an administrator creates one. See "
                "config/oauth_providers.example.json.",
                path,
            )
            _warned_missing = True
        _cache, _cache_mtime = {}, None
        return _cache

    _warned_missing = False
    if _cache_mtime == mtime:
        return _cache

    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        logger.warning("Failed to parse OAuth provider config at %s", path, exc_info=True)
        _cache, _cache_mtime = {}, mtime
        return _cache

    if not isinstance(raw, dict):
        logger.warning("OAuth provider config at %s must be a JSON object", path)
        _cache, _cache_mtime = {}, mtime
        return _cache

    result: dict[str, OAuthProviderCredentials] = {}
    for name, entry in raw.items():
        if name.startswith("_"):
            continue  # convention for a "_comment" style annotation key
        try:
            result[name] = OAuthProviderCredentials.model_validate(entry)
        except ValidationError:
            logger.warning(
                "Skipping invalid OAuth provider config entry %r in %s",
                name,
                path,
                exc_info=True,
            )

    _cache, _cache_mtime = result, mtime
    return _cache


def get_oauth_provider_credentials(provider: str) -> OAuthProviderCredentials | None:
    """The configured client_id/secret for ``provider``, or None if unset."""
    return _load().get(provider)


def configured_oauth_providers() -> frozenset[str]:
    """Names of every provider with valid credentials configured."""
    return frozenset(_load().keys())
