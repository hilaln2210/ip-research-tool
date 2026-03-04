"""
API routes for IP research endpoints.
"""

import asyncio
import time
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import List, Optional

from ..services.ip_classifier import classify_ip
from ..services.reputation_service import get_reputation

router = APIRouter()

# Simple in-memory cache: ip -> (timestamp, result)
_cache = {}
CACHE_TTL = 300  # 5 minutes


def _cached(key):
    if key in _cache:
        ts, val = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return val
    return None


def _store(key, val):
    _cache[key] = (time.time(), val)
    # Evict old entries if cache grows large
    if len(_cache) > 500:
        oldest = sorted(_cache.items(), key=lambda x: x[1][0])[:100]
        for k, _ in oldest:
            del _cache[k]


class BulkRequest(BaseModel):
    ips: List[str]


@router.get("/analyze/{ip}")
async def analyze_ip(ip: str, reputation: bool = Query(True)):
    """
    Full IP analysis: classification + optional reputation lookup.
    Returns uniqueness score, IP type, ownership, geo, and threat intel.
    """
    ip = ip.strip()
    cache_key = f"analyze:{ip}:{reputation}"
    cached = _cached(cache_key)
    if cached:
        return cached

    try:
        if reputation:
            classification, rep = await asyncio.gather(
                classify_ip(ip),
                get_reputation(ip),
            )
        else:
            classification = await classify_ip(ip)
            rep = None

        result = {**classification}
        if rep:
            # Basic intel from ip-api (no key) - merged from classification
            flags = classification.get("flags", {})
            rep["sources"]["basic"] = {
                "available": True,
                "proxy": flags.get("is_proxy", False),
                "hosting": flags.get("is_hosting", False),
                "mobile": flags.get("is_mobile", False),
            }
            if flags.get("is_proxy") and rep["threat_score"] < 30:
                rep["threat_score"] = max(rep["threat_score"], 25)
                if not any("Proxy" in r for r in (rep.get("threat_reasons") or [])):
                    rep["threat_reasons"] = rep.get("threat_reasons") or []
                    rep["threat_reasons"].insert(0, "Proxy/VPN detected (ip-api)")
            result["reputation"] = rep
            # Adjust uniqueness downward if high threat score on a shared IP
            if rep["threat_score"] > 50 and classification["uniqueness_score"] < 40:
                result["_warning"] = (
                    "This IP has a high threat score but LOW uniqueness — "
                    "it may be shared infrastructure (cloud/proxy/CGNAT). "
                    "Treat threat attribution with caution."
                )

        _store(cache_key, result)
        return result

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk")
async def bulk_analyze(body: BulkRequest, reputation: bool = Query(False)):
    """
    Analyze up to 20 IPs at once. Reputation lookup is off by default for bulk.
    """
    ips = [ip.strip() for ip in body.ips if ip.strip()][:20]
    if not ips:
        raise HTTPException(status_code=400, detail="No IPs provided")

    tasks = [analyze_ip(ip, reputation=reputation) for ip in ips]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    output = []
    for ip, res in zip(ips, results):
        if isinstance(res, Exception):
            err_msg = str(getattr(res, "detail", res))
            output.append({"ip": ip, "error": err_msg})
        else:
            output.append(res)

    return {"results": output, "count": len(output)}


@router.get("/classify/{ip}")
async def classify_only(ip: str):
    """
    Lightweight classification only — no reputation lookup.
    Faster, suitable for bulk pre-screening.
    """
    ip = ip.strip()
    cache_key = f"classify:{ip}"
    cached = _cached(cache_key)
    if cached:
        return cached
    try:
        result = await classify_ip(ip)
        _store(cache_key, result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health():
    return {"status": "ok"}
