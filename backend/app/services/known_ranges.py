"""
Known IP range metadata: cloud ASNs, keyword lists, special ranges.
"""

# Carrier-Grade NAT range
CGNAT_RANGES = ["100.64.0.0/10"]

TOR_EXIT_CHECK_URL = "https://check.torproject.org/torbulkexitlist"

# Keywords in ASN description / ISP name that suggest hosting/datacenter
HOSTING_KEYWORDS = [
    "amazon", "aws", "azure", "microsoft", "google", "gcp", "digitalocean",
    "linode", "akamai", "cloudflare", "fastly", "hetzner", "ovh", "vultr",
    "leaseweb", "rackspace", "softlayer", "packet", "equinix", "cogent",
    "hosting", "datacenter", "data center", "cloud", "server", "colocation",
    "colo", "dedicated", "vps",
]

MOBILE_KEYWORDS = [
    "mobile", "cellular", "wireless", "t-mobile", "tmobile", "att", "verizon",
    "sprint", "boost", "cricket", "metro pcs", "metropcs", "tracfone",
    "orange", "vodafone", "o2", "three", "bouygues", "sfr", "cellco",
    "partner comm", "hot mobile", "cellcom", "pelephone", "bezeq intl",
]

RESIDENTIAL_KEYWORDS = [
    "residential", "broadband", "cable", "dsl", "fiber", "adsl", "xdsl",
    "comcast", "spectrum", "cox", "charter", "optimum", "cablevision",
    "bezeq", "hot net", "partner",
]

# ASNs known to be VPN providers (partial list of large ones)
VPN_PROVIDER_ASNS = {
    "209103",  # ExpressVPN
    "398722",  # NordVPN
    "396073",  # Surfshark
    "135134",  # PIA
    "19318",   # Mullvad
    "60068",   # CyberGhost
}

# ASNs known to be CDNs
CDN_ASNS = {
    "13335",  # Cloudflare
    "20940",  # Akamai
    "54113",  # Fastly
    "16509",  # Amazon CloudFront
    "15169",  # Google
}

# Cloud/hosting ASNs (partial — covers largest providers)
CLOUD_ASN_PREFIXES = {
    "16509",  # Amazon AWS
    "14618",  # Amazon
    "8075",   # Microsoft Azure
    "15169",  # Google Cloud
    "396982", # Google Cloud
    "19527",  # Google
    "14061",  # DigitalOcean
    "63949",  # Linode/Akamai
    "24940",  # Hetzner
    "16276",  # OVH
    "20473",  # Vultr
    "30633",  # Leaseweb
    "21844",  # Rackspace
    "33070",  # Rackspace
    "36351",  # SoftLayer
    "46606",  # Unified Layer
}
