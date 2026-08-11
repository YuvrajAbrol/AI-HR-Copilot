"""MCP router for HRAgents SDK.

Exposes a single endpoint, ``POST /api/mcp/test``, that lets clients verify
a candidate MCP server configuration in isolation -- before persisting it
to settings, where a misconfiguration would otherwise surface only at
conversation start (and there manifest as a noisy traceback that aborts
agent initialization).

The endpoint never mutates server state or touches stored settings: it
spins up the MCP connection, lists the advertised tools, optionally invokes
one caller-chosen tool (``tool_call``), then tears the connection down.
The optional tool call exists because listing tools does not exercise the
credentials many servers only use inside tool handlers (e.g. the Slack MCP
server starts fine with a bogus token); callers must pick a read-only tool.
For OAuth MCP servers, any token/client metadata acquired during the probe is
returned on the success response's ``oauth_state`` field so the caller can
persist it through the settings API under the tested server's ``auth.state``.
"""

from __future__ import annotations

import asyncio
from typing import Annotated, Any, Literal

import httpx
import mcp.types
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field, model_validator
from starlette import status

from mcp_integration import create_mcp_tools
from mcp_integration.client import MCPClient
from mcp_integration.config import (
    MCPAuthCredential,
    MCPOAuthStateResponse,
    MCPServer,
)
from mcp_integration.exceptions import MCPError, MCPTimeoutError
from runtime.server._secrets_exposure import get_cipher
from runtime.telemetry.logger import get_logger
from utilities.cipher import Cipher


logger = get_logger(__name__)

mcp_router = APIRouter(prefix="/mcp", tags=["MCP"])


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------
#
# We accept one canonical MCPServer instead of the full MCP server map. The UI
# flow this powers ("add a new MCP server") validates one server at a time; the
# route wraps it in a temporary map only at the runtime boundary.

_DEFAULT_SERVER_NAME = "test-server"
_OAUTH_PROBE_JOB_TTL_SECONDS = 15 * 60


class _StdioMCPServerSpec(BaseModel):
    """Legacy stdio MCP server spec accepted by the public REST API."""

    type: Literal["stdio"] = "stdio"
    command: str = Field(..., min_length=1, description="Executable to invoke")
    args: list[str] = Field(default_factory=list)
    env: dict[str, str] = Field(default_factory=dict)
    cwd: str | None = None

    def to_mcp_server(self) -> MCPServer:
        return MCPServer.model_validate(
            {
                "transport": "stdio",
                "command": self.command,
                "args": self.args,
                "env": self.env,
                "cwd": self.cwd,
            }
        )


class _RemoteMCPServerSpec(BaseModel):
    """Legacy remote MCP server spec accepted by the public REST API."""

    type: Literal["http", "shttp", "streamable-http", "sse"]
    url: str = Field(..., min_length=1)
    headers: dict[str, str] = Field(default_factory=dict)
    api_key: str | None = Field(
        default=None,
        description=(
            "Deprecated bearer token. Prefer auth.strategy='bearer'. If provided "
            "without auth, sent as 'Authorization: Bearer <token>'."
        ),
    )
    auth: MCPAuthCredential | None = None
    timeout: float | None = None
    sse_read_timeout: float | None = None
    keep_alive: bool | None = None

    @model_validator(mode="after")
    def _reject_ambiguous_auth(self) -> _RemoteMCPServerSpec:
        if self.api_key is not None and self.auth is not None:
            raise ValueError("api_key cannot be combined with auth.")
        if self.api_key is not None and any(
            name.lower() == "authorization" for name in self.headers
        ):
            raise ValueError(
                "api_key cannot be combined with an explicit top-level "
                "'Authorization' header; use auth.strategy='header' instead."
            )
        if self.auth is not None and any(
            name.lower() == "authorization" for name in self.headers
        ):
            raise ValueError(
                "'auth' cannot be combined with an explicit top-level "
                "'Authorization' header; use auth.strategy='header' instead."
            )
        return self

    def to_mcp_server(self) -> MCPServer:
        transport = "http" if self.type == "shttp" else self.type
        data: dict[str, Any] = {
            "url": self.url,
            "transport": transport,
            "headers": self.headers,
            "timeout": self.timeout,
            "sse_read_timeout": self.sse_read_timeout,
            "keep_alive": self.keep_alive,
        }
        if self.auth is not None:
            data["auth"] = self.auth
        elif self.api_key is not None:
            data["auth"] = {"strategy": "bearer", "value": self.api_key}
        return MCPServer.model_validate(data)


MCPTestServerSpec = Annotated[
    _StdioMCPServerSpec | _RemoteMCPServerSpec,
    Field(discriminator="type"),
]


class MCPToolCallSpec(BaseModel):
    """A single tool invocation to run as part of the connection test.

    Listing tools does not exercise the credentials many servers only use
    inside tool handlers, so callers can name one tool to invoke after the
    listing succeeds. Callers are responsible for choosing a read-only tool;
    the endpoint executes it verbatim.
    """

    name: str = Field(..., min_length=1, description="Name of the tool to invoke")
    arguments: dict[str, Any] = Field(
        default_factory=dict,
        description="Arguments passed to the tool unchanged.",
    )


class MCPTestRequest(BaseModel):
    """Body for ``POST /api/mcp/test``."""

    name: str = Field(
        default=_DEFAULT_SERVER_NAME,
        min_length=1,
        max_length=128,
        description=(
            "Name to use for the server inside the temporary MCP server map. "
            "Only affects error messages -- does not need to match any "
            "persisted setting."
        ),
    )
    server: MCPTestServerSpec
    timeout: float = Field(
        default=60.0,
        gt=0,
        le=120,
        description="Seconds to wait for connection + tools/list to complete.",
    )
    tool_call: MCPToolCallSpec | None = Field(
        default=None,
        description=(
            "Optional read-only tool to invoke after listing succeeds, so "
            "callers can verify credentials the server only exercises on "
            "tool invocation. Its outcome is reported verbatim in "
            "`tool_result` without affecting `ok`."
        ),
    )

    @model_validator(mode="before")
    @classmethod
    def _normalize_native_server_transport(cls, value: object) -> object:
        if not isinstance(value, dict):
            return value
        server = value.get("server")
        if not isinstance(server, dict):
            return value
        if "authentication" in server:
            raise ValueError(
                "OAuth authentication metadata belongs under auth.authentication."
            )
        if "type" in server:
            return value
        normalized = dict(value)
        normalized_server = dict(server)
        transport = normalized_server.pop("transport", None)
        if transport is None:
            transport = "stdio" if "command" in normalized_server else "http"
        normalized_server["type"] = transport
        normalized["server"] = normalized_server
        return normalized

    @model_validator(mode="after")
    def _strip_name(self) -> MCPTestRequest:
        # Mirror the validation the MCP server map itself applies to server keys --
        # whitespace-only names would silently bypass min_length=1 above.
        self.name = self.name.strip() or _DEFAULT_SERVER_NAME
        self.resolved_server
        return self

    @property
    def resolved_server(self) -> MCPServer:
        return self.server.to_mcp_server()

    def to_mcp_config(self, *, cipher: Cipher | None = None) -> dict[str, MCPServer]:
        return {self.name: self.resolved_server.with_decrypted_secrets(cipher=cipher)}


class MCPToolCallResult(BaseModel):
    """Verbatim outcome of the requested ``tool_call``.

    The endpoint stays provider-neutral: many servers report upstream
    failures (e.g. Slack's ``{"ok": false, "error": "invalid_auth"}``)
    as ordinary text content with ``isError`` unset, so interpreting the
    payload is the caller's job.
    """

    is_error: bool = Field(description="The MCP-level isError flag of the result.")
    text: str = Field(description="Concatenated text content of the result.")


class MCPTestToolInfo(BaseModel):
    name: str
    description: str | None = None

class MCPTestSuccess(BaseModel):
    """Response when the candidate server connects and lists its tools."""

    ok: Literal[True] = True
    tools: list[MCPTestToolInfo] = Field(
        default_factory=list,
        description="Tools advertised by the MCP server.",
    )
    tool_result: MCPToolCallResult | None = Field(
        default=None,
        description=("Outcome of the requested `tool_call`, when one was supplied."),
    )
    resolved_mcp_servers: list[dict[str, Any]] | None = Field(
        default=None,
        description=(
            "Deprecated compatibility field for older clients that expected "
            "resolved MCP server metadata in test responses."
        ),
    )
    oauth_state: MCPOAuthStateResponse | None = Field(
        default=None,
        description=(
            "Serialized OAuth state acquired or refreshed by the probe. "
            "Clients should persist this under the tested server's auth.state."
        ),
    )


class MCPTestFailure(BaseModel):
    """Response when the candidate server fails to connect or list tools.

    The endpoint returns HTTP 200 in both success and failure cases: a
    failure here is the *expected* outcome of validating a user-supplied
    config, not a server-side error. The structured shape makes it easy
    for the UI to render an actionable message.
    """

    ok: Literal[False] = False
    error: str = Field(description="Human-readable error message.")
    error_kind: Literal["timeout", "connection", "unknown"] = Field(
        description="Coarse error classification, useful for branching UI."
    )


MCPTestResponse = MCPTestSuccess | MCPTestFailure


def _run_tool_call(
    client: MCPClient, spec: MCPToolCallSpec, tools: list[MCPTestToolInfo], timeout: float
) -> MCPToolCallResult:
    """Invoke the requested tool on the connected client.

    Uses ``call_tool_mcp`` (not ``call_tool``, which raises on ``isError``)
    so in-band failures come back as data -- mirrors ``MCPToolExecutor``.
    A timeout is reported as an errored result rather than failing the
    whole test: the server did connect and list, which is still useful.
    """
    if spec.name not in [t.name for t in tools]:
        tool_names = [t.name for t in tools]
        return MCPToolCallResult(
            is_error=True,
            text=(
                f"Tool {spec.name!r} not advertised by server "
                f"(available: {', '.join(tool_names) or 'none'})"
            ),
        )
    try:
        result: mcp.types.CallToolResult = client.call_async_from_sync(
            client.call_tool_mcp,
            name=spec.name,
            arguments=spec.arguments,
            timeout=timeout,
        )
    except TimeoutError:
        return MCPToolCallResult(
            is_error=True,
            text=f"Tool {spec.name!r} call timed out after {timeout} seconds",
        )
    text = "\n".join(
        block.text
        for block in result.content
        if isinstance(block, mcp.types.TextContent)
    )
    return MCPToolCallResult(is_error=bool(result.isError), text=text)


def _probe_mcp_server(
    request: MCPTestRequest,
    cipher: Cipher | None,
) -> MCPTestResponse:
    """Synchronous probe -- safe to run inside ``run_in_executor``.

    ``create_mcp_tools`` already runs its own event loop in a background
    thread via ``MCPClient.call_async_from_sync``. We deliberately do not
    call it from the FastAPI request task; instead the caller hops into a
    threadpool first.
    """

    mcp_config = request.to_mcp_config(cipher=cipher)

    try:
        # ``create_mcp_tools`` returns a client that owns a background loop
        # and a (possibly long-lived) subprocess. Use the context-manager
        # form so we always tear it down, even when listing succeeded.
        with create_mcp_tools(
            mcp_config,
            timeout=request.timeout,
        ) as client:
            tools = [MCPTestToolInfo(name=t.name, description=t.description) for t in client.tools]
            tool_result: MCPToolCallResult | None = None
            if request.tool_call is not None:
                tool_result = _run_tool_call(
                    client,
                    request.tool_call,
                    tools,
                    request.timeout,
                )
            return MCPTestSuccess(
                tools=tools,
                tool_result=tool_result,
                oauth_state=None,
            )
    except MCPTimeoutError as exc:
        logger.info("MCP test timed out for server %r: %s", request.name, exc)
        return MCPTestFailure(error=str(exc), error_kind="timeout")
    except MCPError as exc:
        # ``MCPError("MCP Connection Failure")`` is what client.connect()
        # raises when the underlying fastmcp client fails to start. Surface
        # the root-cause message (e.g. "sh: 1: mcp-server-github: Permission
        # denied") because the wrapper alone isn't useful.
        cause = exc.__cause__ or exc.__context__
        detail = str(cause) if cause else str(exc) or "Failed to connect to MCP server"
        logger.info(
            "MCP test connection failed for server %r: %s", request.name, detail
        )
        return MCPTestFailure(error=detail, error_kind="connection")
    except Exception as exc:  # noqa: BLE001 - we want to surface anything else
        # Any other exception is unexpected but should still return a
        # structured response: the UI can't recover from a 500.
        logger.warning(
            "MCP test failed unexpectedly for server %r",
            request.name,
            exc_info=True,
        )
        return MCPTestFailure(
            error=f"{type(exc).__name__}: {exc}" if str(exc) else type(exc).__name__,
            error_kind="unknown",
        )


@mcp_router.post(
    "/test",
    response_model=MCPTestResponse,
    response_model_exclude_none=True,
    summary="Test an MCP server configuration",
    description=(
        "Attempt to connect to a candidate MCP server and list its tools, "
        "without persisting any settings. Useful for validating user input "
        "in 'add MCP server' flows before storing the config. "
        "For OAuth servers, any acquired state is returned as `oauth_state` "
        "so clients can persist it under the MCP server object's `auth.state`. "
        "Optionally invokes one caller-chosen (read-only) tool via "
        "`tool_call` and reports its outcome in `tool_result`, so callers "
        "can verify credentials that are only exercised on tool invocation. "
        "Encrypted `env`/`headers` values round-tripped from settings are "
        "decrypted before the connection is attempted. "
        "Returns 200 with `ok=false` for connection / timeout failures "
        "(those are expected during validation, not server errors)."
    ),
)
async def test_mcp_server(
    request: MCPTestRequest, http_request: Request
) -> MCPTestResponse:
    """Probe a single MCP server config and report whether it works."""
    # Resolve the cipher here: the threadpool function below must not
    # reach back into ``http_request.app.state``.
    cipher = get_cipher(http_request)
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, _probe_mcp_server, request, cipher)





@mcp_router.get(
    "/registry/search",
    summary="Search Official MCP Registry",
    description="Query the official MCP registry at registry.modelcontextprotocol.io",
)
async def search_mcp_registry(q: str = "") -> dict[str, Any]:
    url = "https://registry.modelcontextprotocol.io/v0/servers"
    params = {}
    if q:
        params["search"] = q

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, params=params)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as e:
        logger.error("Failed to query MCP registry: %s", e)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to query official MCP registry",
        )
