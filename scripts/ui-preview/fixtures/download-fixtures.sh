#!/usr/bin/env bash
# Download and normalize ui-preview fixture photos (1280×720 JPEG).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
TMP="$ROOT/.download-tmp"
mkdir -p "$TMP"

# Pexels photo IDs — see sources.json for page URLs and license.
IDS=(
  417173
  3225517
  2662116
  1287145
  1108099
  1578750
  2387869
  1054218
  1866144
  145939
  1323550
  2437299
  3408744
  414612
  268533
)

for i in "${!IDS[@]}"; do
  n=$((i + 1))
  id="${IDS[$i]}"
  raw="$TMP/source-${n}.jpg"
  out="$ROOT/mock-photo-${n}.jpg"
  url="https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1920"

  echo "Downloading mock-photo-${n}.jpg (Pexels ${id})..."
  curl -fsSL "$url" -o "$raw"
  ffmpeg -y -loglevel error -i "$raw" \
    -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" \
    -q:v 4 \
    -frames:v 1 "$out"
done

rm -rf "$TMP"
echo "Wrote ${#IDS[@]} fixture photos to $ROOT"
