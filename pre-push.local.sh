#!/bin/bash

echo "Generating PDFs..."
bun run pdfs

# If there are PDF changes, stash other changes, commit PDFs, and restore stash
if [[ -n $(git status --porcelain static/*.pdf) ]]; then
    # Stash any other pending changes
    git stash push --keep-index

    # Stage and commit PDFs
    git add static/*.pdf
    git commit -m "chore: update PDFs [skip ci]"
    
    # Restore any stashed changes
    git stash pop || true
fi