#!/bin/bash

FLAG_FILE=".pdf_gen_ts"

CHANGED_FILES=$(git diff --cached --name-only HEAD | grep -E '^(versions|src)/')

if [ -z "$CHANGED_FILES" ]; then
    echo "No changes in versions/ or src/, skipping PDF generation..."
    exit 0
fi

# If PDF generation was run less than 5 minutes ago, skip
if [ -f "$FLAG_FILE" ]; then
    FLAG_TIME=$(cat "$FLAG_FILE")
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - FLAG_TIME))
    
    if [ $TIME_DIFF -lt 300 ]; then
        echo "PDFs were generated less than 5 minutes ago, skipping..."
        exit 0
    fi
fi

echo "Generating PDFs..."
bun run pdfs

git add static/*.pdf
git commit -m "chore: update PDFs [skip ci]" || true

date +%s > "$FLAG_FILE"
git push origin HEAD