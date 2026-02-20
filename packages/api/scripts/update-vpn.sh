#!/bin/bash
# Update VPN IP ranges from X4BNet
# Recommended frequency: daily
#
# Usage: ./update-vpn.sh [data_dir]

set -e

DATA_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../data}"
mkdir -p "$DATA_DIR"

LOG_PREFIX="[vpn-update $(date '+%Y-%m-%d %H:%M:%S')]"
DEST="$DATA_DIR/vpn-ipv4.txt"
TEMP="$DEST.tmp"

echo "$LOG_PREFIX Downloading VPN IP list..."
if curl -s -L --max-time 60 \
    "https://raw.githubusercontent.com/X4BNet/lists_vpn/main/output/vpn/ipv4.txt" \
    -o "$TEMP"; then

  COUNT=$(wc -l < "$TEMP" | tr -d ' ')
  mv "$TEMP" "$DEST"
  echo "$LOG_PREFIX OK — $COUNT CIDR ranges"
  exit 0
else
  rm -f "$TEMP"
  echo "$LOG_PREFIX FAILED — keeping existing list"
  exit 1
fi
