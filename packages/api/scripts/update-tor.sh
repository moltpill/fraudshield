#!/bin/bash
# Update Tor exit node list from torproject.org
# Recommended frequency: hourly (Tor exits change frequently)
#
# Usage: ./update-tor.sh [data_dir]
#   data_dir defaults to ../data relative to this script

set -e

DATA_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../data}"
mkdir -p "$DATA_DIR"

LOG_PREFIX="[tor-update $(date '+%Y-%m-%d %H:%M:%S')]"
DEST="$DATA_DIR/tor-exits.txt"
TEMP="$DEST.tmp"

echo "$LOG_PREFIX Downloading Tor exit list..."
if curl -s -L --max-time 30 \
    "https://check.torproject.org/torbulkexitlist" \
    -o "$TEMP"; then

  COUNT=$(wc -l < "$TEMP" | tr -d ' ')
  mv "$TEMP" "$DEST"
  echo "$LOG_PREFIX OK — $COUNT exit nodes"
  exit 0
else
  rm -f "$TEMP"
  echo "$LOG_PREFIX FAILED — keeping existing list"
  exit 1
fi
