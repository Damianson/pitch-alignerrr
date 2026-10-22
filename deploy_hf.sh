#!/usr/bin/env bash
set -e

SPACE_REMOTE="${1:-https://huggingface.co/spaces/Damianson/pitch-alignerrr-api}"
DEPLOY_DIR=$(mktemp -d -t hf-space-XXXXXX)

echo "==> Preparing clean backend bundle (excluding binary files & frontend)..."
cp app.py requirements.txt README.md "$DEPLOY_DIR/"
cp -r src "$DEPLOY_DIR/"
echo -e "__pycache__/\n*.pyc" > "$DEPLOY_DIR/.gitignore"
find "$DEPLOY_DIR" -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true

cd "$DEPLOY_DIR"
git init -q
git checkout -b main -q
git add .
git commit -m "deploy: update backend for Hugging Face Space" -q
git remote add space "$SPACE_REMOTE"

echo "==> Pushing clean backend to $SPACE_REMOTE..."
git push space main --force

rm -rf "$DEPLOY_DIR"
echo "==> Successfully deployed to Hugging Face Space!"
