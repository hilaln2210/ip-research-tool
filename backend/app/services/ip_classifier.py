"""
IP Classification Service
Determines IP type, ownership, shareability, and uniqueness score.
"""

import ipaddress
import socket
import asyncio
import httpx
from concurrent.futures import ThreadPoolExecutor
from ipwhois import IPWhois
from .known_ranges import (
    CGNAT_RANGES, TOR_EXIT_CHECK_URL, CLOUD_ASN_PREFIXES,
    HOSTING_KEYWORDS, MOBILE_KEYWORDS, RESIDENTIAL_KEYWORDS,
    VPN_PROVIDER_ASNS, CDN_ASNS
)

_executor = ThreadPoolExecutor(max_workers=4)


def _classify_private(ip_str: str) -> dict:
    """Detect RFC-1918 / special-use ranges."""
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return None
    if ip.is_private:
        return {"type": "private", "label": "Private / RFC-1918", "uniqueness": 0}
    if ip.is_loopback:
        return {"type": "loopback", "label": "Loopback", "uniqueness": 0}
    if ip.is_multicast:
        return {"type": "multicast", "label": "Multicast", "uniqueness": 0}
    if ip.is_link_local:
        return {"type": "link_local", "label": "Link-Local", "uniqueness": 0}
    # CGNAT range 100.64.0.0/10
    try:
        cgnat = ipaddress.ip_network("100.64.0.0/10")
        if ip in cgnat:
            return {"type": "cgnat", "label": "CGNAT (Carrier-Grade NAT)", "uniqueness": 5}
    except Exception:
        pass
    return None


def _reverse_dns(ip_str: str) -> str:
    try:
        return socket.gethostbyaddr(ip_str)[0]
    except Exception:
        return ""


def _whois_lookup(ip_str: str) -> dict:
    try:
        obj = IPWhois(ip_str)
        result = obj.lookup_rdap(depth=1)
        return {
            "asn": result.get("asn"),
            "asn_cidr": result.get("asn_cidr"),
            "asn_description": result.get("asn_description", ""),
            "asn_country": result.get("asn_country_code", ""),
            "network_name": result.get("network", {}).get("name", ""),
            "network_cidr": result.get("network", {}).get("cidr", ""),
            "org": result.get("network", {}).get("remarks", [{}])[0].get("description", "")
                   if result.get("network", {}).get("remarks") else "",
        }
    except Exception as e:
        return {"error": str(e)}


async def _ipapi_lookup(ip_str: str, client: httpx.AsyncClient) -> dict:
    """ip-api.com — free, no key needed. 45 req/min."""
    try:
        r = await client.get(
            f"http://ip-api.com/json/{ip_str}",
            params={"fields": "status,message,country,countryCode,region,city,isp,org,as,asname,mobile,proxy,hosting,query"},
            timeout=6.0
        )
        data = r.json()
        if data.get("status") == "success":
            return data
    except Exception:
        pass
    return {}


def _cidr_size(cidr: str) -> int:
    """Return number of IPs in a CIDR block."""
    try:
        net = ipaddress.ip_network(cidr, strict=False)
        return net.num_addresses
    except Exception:
        return 0


def _score_uniqueness(ipapi: dict, whois: dict, rdns: str, special: dict) -> tuple[int, list[str]]:
    """
    Returns (score 0-100, list of reasoning strings).
    100 = highly unique (single dedicated IP, strong attribution)
    0   = not unique at all (shared, CGNAT, Tor, etc.)
    """
    if special:
        t = special.get("type")
        if t in ("private", "loopback", "multicast", "link_local"):
            return 0, ["Private/special-use address — not routable on public internet"]
        if t == "cgnat":
            return 5, ["CGNAT range: potentially thousands of users share this external IP"]

    score = 50
    reasons = []

    # --- Strongly LOWERS uniqueness ---
    if ipapi.get("proxy"):
        score -= 30
        reasons.append("Detected as proxy/VPN/anonymizer — shared by many users")
    if ipapi.get("hosting"):
        score -= 15
        reasons.append("Hosting/datacenter IP — could serve hundreds of tenants")
    if ipapi.get("mobile"):
        score -= 20
        reasons.append("Mobile carrier IP — dynamic, shared via carrier NAT")

    asn_desc = (whois.get("asn_description") or ipapi.get("asname") or "").lower()
    isp = (ipapi.get("isp") or "").lower()
    org = (ipapi.get("org") or "").lower()

    for kw in HOSTING_KEYWORDS:
        if kw in asn_desc or kw in isp or kw in org:
            score -= 10
            reasons.append(f"ASN/org contains hosting keyword '{kw}'")
            break

    for kw in MOBILE_KEYWORDS:
        if kw in asn_desc or kw in isp:
            score -= 10
            reasons.append(f"ASN/org looks like mobile carrier ('{kw}')")
            break

    # CIDR block size — larger = more shared
    cidr = whois.get("asn_cidr") or whois.get("network_cidr") or ""
    if cidr:
        net_size = _cidr_size(cidr)
        if net_size >= 65536:  # /16 or larger
            score -= 15
            reasons.append(f"Large IP block ({cidr}, {net_size:,} addresses) — many users")
        elif net_size >= 4096:  # /20
            score -= 8
            reasons.append(f"Medium IP block ({cidr}, {net_size:,} addresses)")
        elif 0 < net_size <= 8:  # /29 or smaller
            score += 15
            reasons.append(f"Very small IP block ({cidr}, {net_size} addresses) — likely dedicated")

    # --- Raises uniqueness ---
    for kw in RESIDENTIAL_KEYWORDS:
        if kw in asn_desc or kw in isp or kw in org:
            pass  # residential is NOT uniqueness — could be dynamic

    if rdns:
        score += 5
        reasons.append(f"Has reverse DNS: {rdns}")
        # Static-looking PTR (e.g. mail.company.com, not dynamic-xxx)
        dynamic_hints = ["dynamic", "dhcp", "broad", "pool", "cpe", "ppp", "dial", "cable", "dsl", "fiber", "clients"]
        if not any(h in rdns.lower() for h in dynamic_hints):
            score += 10
            reasons.append("PTR record looks static (not a dynamic pool pattern)")
        else:
            score -= 10
            reasons.append("PTR record pattern suggests dynamic/pool assignment")

    # Clamp
    score = max(0, min(100, score))
    return score, reasons


def _ip_type_label(ipapi: dict, whois: dict, special: dict) -> str:
    if special:
        return special.get("label", "Special")
    if ipapi.get("proxy"):
        return "Proxy / VPN / Anonymizer"
    if ipapi.get("hosting"):
        asn_desc = (whois.get("asn_description") or "").lower()
        if any(k in asn_desc for k in ["cloudflare", "akamai", "fastly", "cdn"]):
            return "CDN"
        return "Datacenter / Hosting"
    if ipapi.get("mobile"):
        return "Mobile Carrier"
    asn_desc = (whois.get("asn_description") or ipapi.get("asname") or "").lower()
    for kw in HOSTING_KEYWORDS:
        if kw in asn_desc:
            return "Datacenter / Hosting"
    for kw in MOBILE_KEYWORDS:
        if kw in asn_desc:
            return "Mobile Carrier"
    return "Residential / ISP"


async def classify_ip(ip_str: str) -> dict:
    ip_str = ip_str.strip()

    # 1. Special ranges (sync, fast)
    special = _classify_private(ip_str)

    # 2. Parallel async + thread lookups
    loop = asyncio.get_event_loop()
    async with httpx.AsyncClient() as client:
        whois_task = loop.run_in_executor(_executor, _whois_lookup, ip_str)
        rdns_task = loop.run_in_executor(_executor, _reverse_dns, ip_str)
        ipapi_task = _ipapi_lookup(ip_str, client)

        whois, rdns, ipapi = await asyncio.gather(whois_task, rdns_task, ipapi_task)

    # 3. Score
    uniqueness_score, reasons = _score_uniqueness(ipapi, whois, rdns, special)
    ip_type = _ip_type_label(ipapi, whois, special)

    # Attribution reliability label
    if uniqueness_score >= 75:
        attribution = "High — likely a dedicated or static IP; strong indicator"
    elif uniqueness_score >= 45:
        attribution = "Medium — semi-dedicated; verify with additional context"
    elif uniqueness_score >= 15:
        attribution = "Low — shared infrastructure; treat with caution"
    else:
        attribution = "Very Low — highly shared or special-use; unreliable for attribution"

    return {
        "ip": ip_str,
        "ip_type": ip_type,
        "uniqueness_score": uniqueness_score,
        "attribution_reliability": attribution,
        "reasons": reasons,
        "geo": {
            "country": ipapi.get("country", ""),
            "country_code": ipapi.get("countryCode", ""),
            "region": ipapi.get("region", ""),
            "city": ipapi.get("city", ""),
        },
        "network": {
            "asn": whois.get("asn") or ipapi.get("as", "").split()[0].replace("AS", ""),
            "asn_name": whois.get("asn_description") or ipapi.get("asname", ""),
            "cidr": whois.get("asn_cidr") or "",
            "network_name": whois.get("network_name", ""),
            "isp": ipapi.get("isp", ""),
            "org": ipapi.get("org", ""),
        },
        "flags": {
            "is_proxy": bool(ipapi.get("proxy")),
            "is_hosting": bool(ipapi.get("hosting")),
            "is_mobile": bool(ipapi.get("mobile")),
            "is_cgnat": special.get("type") == "cgnat" if special else False,
            "is_private": special.get("type") in ("private", "loopback") if special else False,
        },
        "reverse_dns": rdns,
        "raw": {
            "ipapi": ipapi,
            "whois": whois,
        }
    }
