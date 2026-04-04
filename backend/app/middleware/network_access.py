from __future__ import annotations

from ipaddress import ip_address, ip_network

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import get_settings


class NetworkAccessMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        allowed_subnets = get_settings().allowed_subnets
        if not allowed_subnets:
            return await call_next(request)

        client_ip = _extract_client_ip(request)
        if client_ip is None:
            return JSONResponse(status_code=403, content={"detail": "Access is limited to the laboratory network."})

        try:
            remote_ip = ip_address(client_ip)
        except ValueError:
            return JSONResponse(status_code=403, content={"detail": "Access is limited to the laboratory network."})

        networks = [ip_network(subnet, strict=False) for subnet in allowed_subnets]
        if remote_ip.is_loopback or any(remote_ip in network for network in networks):
            return await call_next(request)

        return JSONResponse(status_code=403, content={"detail": "Access is limited to the laboratory network."})


def _extract_client_ip(request: Request) -> str | None:
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()

    if request.client is None:
        return None
    return request.client.host
