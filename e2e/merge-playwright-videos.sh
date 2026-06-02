#!/usr/bin/env bash
set -euo pipefail

# Merge Playwright per-test videos into a single combined video
# Requires ffmpeg to be installed and available on PATH

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
RESULTS_DIR="$ROOT_DIR/test-results"
OUT_FILE="$RESULTS_DIR/combined-playwright-video.webm"

echo "Looking for video files under $RESULTS_DIR"
mapfile -t videos < <(find "$RESULTS_DIR" -type f -name "video.*" -print | sort)

if [ ${#videos[@]} -eq 0 ]; then
  echo "No video files found. Exiting." >&2
  exit 1
fi

FILELIST="$RESULTS_DIR/ffmpeg-filelist.txt"
rm -f "$FILELIST"
for v in "${videos[@]}"; do
  # ffmpeg concat demuxer requires paths with single quotes escaped
  echo "file '$v'" >> "$FILELIST"
done

echo "Merging ${#videos[@]} videos into $OUT_FILE"
ffmpeg -y -f concat -safe 0 -i "$FILELIST" -c copy "$OUT_FILE"

echo "Combined video created at: $OUT_FILE"
