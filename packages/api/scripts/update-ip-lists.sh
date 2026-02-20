#!/bin/bash
# Download and update all IP intelligence lists:
# - VPN IP ranges (X4BNet)
# - Tor exit nodes (torproject.org)
# - Datacenter CIDR ranges (ipcat)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"

mkdir -p "$DATA_DIR"

echo "=== Updating IP intelligence lists ==="

# VPN list from X4BNet (daily update recommended)
echo "Downloading VPN IP list..."
curl -s -L "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt" \
  -o "$DATA_DIR/vpn-ipv4.txt" && echo "  VPN list: OK" || echo "  VPN list: FAILED"

# Tor exit nodes (hourly update recommended)
echo "Downloading Tor exit node list..."
curl -s -L "https://check.torproject.org/torbulkexitlist" \
  -o "$DATA_DIR/tor-exits.txt" && echo "  Tor list: OK" || echo "  Tor list: FAILED"

# Datacenter CIDR ranges from ipcat
echo "Downloading datacenter IP list..."
curl -s -L "https://raw.githubusercontent.com/client9/ipcat/master/datacenters.csv" \
  -o "$DATA_DIR/datacenters.csv" && echo "  Datacenter list: OK" || echo "  Datacenter list: FAILED"

echo ""
echo "=== IP lists updated ==="
ls -la "$DATA_DIR/"*.{txt,csv} 2>/dev/null || true
