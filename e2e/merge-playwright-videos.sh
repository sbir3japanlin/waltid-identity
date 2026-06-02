#!/usr/bin/env bash
set -euo pipefail

# Merge Playwright per-test videos into a single combined video
# Requires ffmpeg to be installed and available on PATH

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_DIR="$ROOT_DIR/test-results"
OUT_FILE="$RESULTS_DIR/combined-playwright-video.webm"

echo "Looking for video files under $RESULTS_DIR"
FILELIST="$RESULTS_DIR/ffmpeg-filelist.txt"
rm -f "$FILELIST"

# Find video files and append to filelist (portable across macOS bash)
found=0
# Find all video files and sort by modification time (oldest first)
# Using ls -1tr to order by time; works on macOS and Linux
files=$(find "$RESULTS_DIR" -type f -name "video.*" -print0 | xargs -0 ls -1tr 2>/dev/null || true)
if [ -z "$files" ]; then
  echo "No video files found. Exiting." >&2
  exit 1
fi

while IFS= read -r v; do
  echo "file '$v'" >> "$FILELIST"
  found=1
done <<< "$files"

if [ "$found" -ne 1 ]; then
  echo "No video files found. Exiting." >&2
  exit 1
fi

count=$(wc -l < "$FILELIST" || true)
echo "Merging $count videos into $OUT_FILE"
ffmpeg -y -f concat -safe 0 -i "$FILELIST" -c copy "$OUT_FILE"

echo "Combined video created at: $OUT_FILE"
