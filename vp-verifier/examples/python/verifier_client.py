"""
Verifier API client library.

Provides a clean Python interface to the walt.id verifier-api for
OID4VP (OpenID for Verifiable Presentations) verification flows.

Usage:
    from verifier_client import VerifierClient

    client = VerifierClient("http://localhost:7003")
    auth_uri = client.create_verification_request(
        credentials=[{
            "format": "vc+sd-jwt",
            "input_descriptor": { ... }
        }],
        vp_policies=["signature_sd-jwt-vc"],
        vc_policies=["not-before", "expired"]
    )
    # Parse auth_uri, present credential, then:
    result = client.get_session(auth_uri.state)
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from typing import Any


@dataclass
class AuthRequest:
    """Parsed OID4VP authorization request URI."""

    uri: str
    state: str
    nonce: str
    presentation_definition_uri: str
    response_uri: str
    client_id: str
    response_mode: str = "direct_post"

    @classmethod
    def parse(cls, uri: str) -> AuthRequest:
        """Parse an openid4vp:// URI into its components."""
        parsed = urllib.parse.urlparse(uri)
        params = urllib.parse.parse_qs(parsed.query)

        def first(key: str) -> str:
            return params.get(key, [""])[0]

        return cls(
            uri=uri,
            state=first("state"),
            nonce=first("nonce"),
            presentation_definition_uri=first("presentation_definition_uri"),
            response_uri=first("response_uri"),
            client_id=first("client_id"),
            response_mode=first("response_mode") or "direct_post",
        )


@dataclass
class VerificationResult:
    """Result of a verification session."""

    session_id: str
    verification_result: bool
    policy_results: dict[str, bool] = field(default_factory=dict)
    raw: dict[str, Any] = field(default_factory=dict)


class VerifierClient:
    """Client for the walt.id verifier-api.

    The verifier-api is stateless — sessions are stored in memory and
    expire when the container stops. No authentication is required.
    """

    def __init__(self, base_url: str = "http://localhost:7003"):
        self.base_url = base_url.rstrip("/")

    def _post(self, path: str, body: dict, headers: dict | None = None) -> str:
        """Make a POST request and return the response body as a string."""
        all_headers = {"Content-Type": "application/json"}
        if headers:
            all_headers.update(headers)

        data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(
            f"{self.base_url}{path}",
            data=data,
            headers=all_headers,
            method="POST",
        )
        with urllib.request.urlopen(req) as resp:
            return resp.read().decode("utf-8")

    def _get(self, path: str) -> str:
        """Make a GET request and return the response body as a string."""
        with urllib.request.urlopen(f"{self.base_url}{path}") as resp:
            return resp.read().decode("utf-8")

    def create_verification_request(
        self,
        credentials: list[dict[str, Any]],
        vp_policies: list[str] | None = None,
        vc_policies: list[str] | None = None,
        *,
        authorize_base_url: str = "openid4vp://authorize",
        response_mode: str = "direct_post",
    ) -> AuthRequest:
        """Create an OID4VP authorization request.

        Args:
            credentials: List of credential request objects. Each must have
                ``format`` and ``input_descriptor`` keys.
            vp_policies: VP-level policies. Common values:
                ``"signature_sd-jwt-vc"``, ``"signature_jwt-vc"``.
            vc_policies: VC-level policies. Common values:
                ``"not-before"``, ``"expired"``, ``"schema"``.
            authorize_base_url: Base URL for the authorization request.
                Default is ``"openid4vp://authorize"``.
            response_mode: Response mode. ``"direct_post"`` means the wallet
                POSTs the VP token directly to the verifier.

        Returns:
            Parsed ``AuthRequest`` with the state, nonce, PD URI, and response URI.

        Example:
            >>> client = VerifierClient()
            >>> auth = client.create_verification_request(
            ...     credentials=[{
            ...         "format": "vc+sd-jwt",
            ...         "input_descriptor": {
            ...             "id": "my-request",
            ...             "format": {"vc+sd-jwt": {}},
            ...             "constraints": {
            ...                 "fields": [{
            ...                     "path": ["$.given_name"],
            ...                     "filter": {"type": "string", "pattern": ".*"}
            ...                 }],
            ...                 "limit_disclosure": "required"
            ...             }
            ...         }
            ...     }],
            ...     vp_policies=["signature_sd-jwt-vc"],
            ...     vc_policies=["not-before", "expired"]
            ... )
        """
        body: dict[str, Any] = {
            "request_credentials": credentials,
        }
        if vp_policies:
            body["vp_policies"] = vp_policies
        if vc_policies:
            body["vc_policies"] = vc_policies

        headers = {
            "authorizeBaseUrl": authorize_base_url,
            "responseMode": response_mode,
        }

        uri = self._post("/openid4vc/verify", body, headers)
        return AuthRequest.parse(uri)

    def get_presentation_definition(self, pd_id: str) -> dict[str, Any]:
        """Fetch a Presentation Definition by ID.

        Args:
            pd_id: The presentation definition ID from the auth request.
                This is the path segment after ``/openid4vc/pd/``.

        Returns:
            Presentation Definition JSON object (PE 2.0 format).
        """
        body = self._get(f"/openid4vc/pd/{pd_id}")
        return json.loads(body)

    def get_session(self, state: str) -> VerificationResult:
        """Poll a verification session for its result.

        Call this after the wallet has posted the VP token to the
        ``response_uri``. The session tracks whether verification passed.

        Args:
            state: The state token from the auth request.

        Returns:
            ``VerificationResult`` with ``verification_result`` as a bool.
        """
        body = self._get(f"/openid4vc/session/{state}")
        data = json.loads(body)
        return VerificationResult(
            session_id=data.get("id", state),
            verification_result=data.get("verificationResult") == "true",
            policy_results=data.get("policyResults", {}),
            raw=data,
        )

    def get_presentation_definition_from_uri(self, pd_uri: str) -> dict[str, Any]:
        """Fetch a Presentation Definition from a full URI.

        Convenience method — extracts the PD ID from the URI and calls
        ``get_presentation_definition``.

        Args:
            pd_uri: Full presentation definition URI (as returned in auth request).
        """
        # Extract the last path segment as the PD ID
        parsed = urllib.parse.urlparse(pd_uri)
        pd_id = parsed.path.rstrip("/").rsplit("/", 1)[-1]
        return self.get_presentation_definition(pd_id)
