"""
Reputation service - aggregates threat intel from AbuseIPDB, Shodan, VirusTotal.
API keys read from .env; gracefully skips sources with no key.
"""

import os
import asyncio
import httpx
from dotenv import load_dotenv

load_dotenv()

ABUSEIPDB_KEY = os.getenv("ABUSEIPDB_KEY", "")
SHODAN_KEY = os.getenv("SHODAN_KEY", "")
VIRUSTOTAL_KEY = os.getenv("VIRUSTOTAL_KEY", "")

ABUSE_CAT_MAP = {
    3: "Fraud Orders", 4: "DDoS Attack", 5: "FTP Brute-Force",
    6: "Ping of Death", 7: "Phishing", 8: "Fraud VoIP",
    9: "Open Proxy", 10: "Web Spam", 11: "Email Spam",
    12: "Blog Spam", 13: "VPN IP", 14: "Port Scan",
    15: "Hacking", 16: "SQL Injection", 17: "Spoofing",
    18: "Brute-Force", 19: "Bad Web Bot", 20: "Exploited Host",
    21: "Web App Attack", 22: "SSH Brute-Force", 23: "IoT Targeted",
}


async def _abuseipdb(ip, client):
    if not ABUSEIPDB_KEY:
        return {"available": False, "reason": "No ABUSEIPDB_KEY configured"}
    try:
        r = await client.get(
            "https://api.abuseipdb.com/api/v2/check",
            headers={"Key": ABUSEIPDB_KEY, "Accept": "application/json"},
            params={"ipAddress": ip, "maxAgeInDays": 90, "verbose": True},
            timeout=8.0
        )
        d = r.json().get("data", {})
        seen_cats = set()
        for rep in d.get("reports", []):
            for c in rep.get("categories", []):
                seen_cats.add(c)
        return {
            "available": True,
            "abuse_confidence_score": d.get("abuseConfidenceScore", 0),
            "total_reports": d.get("totalReports", 0),
            "distinct_users": d.get("numDistinctUsers", 0),
            "last_reported": d.get("lastReportedAt"),
            "is_whitelisted": d.get("isWhitelisted", False),
            "usage_type": d.get("usageType", ""),
            "isp": d.get("isp", ""),
            "domain": d.get("domain", ""),
            "categories": [ABUSE_CAT_MAP.get(c, "Unknown") for c in sorted(seen_cats)],
        }
    except Exception as e:
        return {"available": False, "error": str(e)}


async def _shodan(ip, client):
    if not SHODAN_KEY:
        return {"available": False, "reason": "No SHODAN_KEY configured"}
    try:
        r = await client.get(
            f"https://api.shodan.io/shodan/host/{ip}",
            params={"key": SHODAN_KEY},
            timeout=10.0
        )
        if r.status_code == 404:
            return {"available": True, "found": False}
        d = r.json()
        return {
            "available": True,
            "found": True,
            "open_ports": d.get("ports", []),
            "vulns": list(d.get("vulns", {}).keys()),
            "hostnames": d.get("hostnames", []),
            "tags": d.get("tags", []),
            "last_update": d.get("last_update"),
            "os": d.get("os"),
        }
    except Exception as e:
        return {"available": False, "error": str(e)}


async def _virustotal(ip, client):
    if not VIRUSTOTAL_KEY:
        return {"available": False, "reason": "No VIRUSTOTAL_KEY configured"}
    try:
        r = await client.get(
            f"https://www.virustotal.com/api/v3/ip_addresses/{ip}",
            headers={"x-apikey": VIRUSTOTAL_KEY},
            timeout=10.0
        )
        if r.status_code != 200:
            return {"available": True, "found": False, "status_code": r.status_code}
        attrs = r.json().get("data", {}).get("attributes", {})
        stats = attrs.get("last_analysis_stats", {})
        return {
            "available": True,
            "found": True,
            "malicious_votes": stats.get("malicious", 0),
            "suspicious_votes": stats.get("suspicious", 0),
            "harmless_votes": stats.get("harmless", 0),
            "undetected_votes": stats.get("undetected", 0),
            "reputation": attrs.get("reputation", 0),
            "last_analysis_date": attrs.get("last_analysis_date"),
            "as_owner": attrs.get("as_owner", ""),
            "network": attrs.get("network", ""),
            "tags": attrs.get("tags", []),
        }
    except Exception as e:
        return {"available": False, "error": str(e)}


async def get_reputation(ip):
    async with httpx.AsyncClient() as client:
        abuse, shodan, vt = await asyncio.gather(
            _abuseipdb(ip, client),
            _shodan(ip, client),
            _virustotal(ip, client),
        )

    threat_score = 0
    threat_reasons = []

    if abuse.get("available") and abuse.get("abuse_confidence_score") is not None:
        sc = abuse["abuse_confidence_score"]
        threat_score = max(threat_score, sc)
        if sc > 50:
            threat_reasons.append(f"AbuseIPDB confidence: {sc}% ({abuse.get('total_reports', 0)} reports)")

    if vt.get("available") and vt.get("malicious_votes", 0) > 0:
        mv = vt["malicious_votes"]
        threat_score = max(threat_score, min(100, mv * 5))
        threat_reasons.append(f"VirusTotal: {mv} engines flagged as malicious")

    if shodan.get("available") and shodan.get("vulns"):
        threat_reasons.append(f"Shodan: {len(shodan['vulns'])} known CVEs on open ports")

    return {
        "threat_score": threat_score,
        "threat_reasons": threat_reasons,
        "sources": {
            "abuseipdb": abuse,
            "shodan": shodan,
            "virustotal": vt,
        }
    }
