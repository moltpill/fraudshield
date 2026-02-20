#!/bin/bash
# Update datacenter IP ranges from ipcat (client9)
# Recommended frequency: weekly
#
# Usage: ./update-datacenter.sh [data_dir]

set -e

DATA_DIR="${1:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/../data}"
mkdir -p "$DATA_DIR"

LOG_PREFIX="[datacenter-update $(date '+%Y-%m-%d %H:%M:%S')]"
DEST="$DATA_DIR/datacenters.csv"
TEMP="$DEST.tmp"

echo "$LOG_PREFIX Downloading datacenter IP list..."
if curl -s -L --max-time 60 \
    "https://raw.githubusercontent.com/client9/ipcat/master/datacenters.csv" \
    -o "$TEMP"; then

  COUNT=$(wc -l < "$TEMP" | tr -d ' ')
  mv "$TEMP" "$DEST"
  echo "$LOG_PREFIX OK — $COUNT entries"
  exit 0
else
  rm -f "$TEMP"
  echo "$LOG_PREFIX FAILED — keeping existing list"
  exit 1
fi
