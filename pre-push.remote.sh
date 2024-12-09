#!/bin/bash
PDF_HOST="u"

echo "SSH to remote machine to generate PDFs..."
ssh $PDF_HOST "cd ~/dev/cv && bun run pdfs"