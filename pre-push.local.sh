#!/bin/bash

echo "Generating PDFs..."
bun run pdfs

git add static/*.pdf
git commit -m "chore: update PDFs [skip ci]" || true