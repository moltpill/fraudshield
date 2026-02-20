#!/bin/bash
# Download GeoLite2-City.mmdb from MaxMind
# Requires MAXMIND_LICENSE_KEY environment variable
# Sign up at: https://www.maxmind.com/en/geolite2/signup

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"
DB_FILE="$DATA_DIR/GeoLite2-City.mmdb"

if [ -z "$MAXMIND_LICENSE_KEY" ]; then
  echo "Error: MAXMIND_LICENSE_KEY environment variable is required"
  echo "Sign up at https://www.maxmind.com/en/geolite2/signup to get a free license key"
  exit 1
fi

mkdir -p "$DATA_DIR"

echo "Downloading GeoLite2-City database..."

DOWNLOAD_URL="https://download.maxmind.com/app/geoip_download?edition_id=GeoLite2-City&license_key=${MAXMIND_LICENSE_KEY}&suffix=tar.gz"

TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

curl -s -L "$DOWNLOAD_URL" -o "$TEMP_DIR/geolite2.tar.gz"
tar -xzf "$TEMP_DIR/geolite2.tar.gz" -C "$TEMP_DIR"
find "$TEMP_DIR" -name "GeoLite2-City.mmdb" -exec cp {} "$DB_FILE" \;

echo "GeoLite2-City database updated at: $DB_FILE"
echo "File size: $(du -sh "$DB_FILE" | cut -f1)"
