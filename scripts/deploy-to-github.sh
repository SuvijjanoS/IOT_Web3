#!/bin/bash

# GitHub Deployment Script
# This script helps you deploy your IoT Web3 project to GitHub

set -e

echo "🚀 IoT Web3 - GitHub Deployment Script"
echo "========================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo -e "${RED}❌ Git is not installed. Please install Git first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Git is installed${NC}"

# Check if we're in a git repository
if [ -d ".git" ]; then
    echo -e "${YELLOW}⚠️  Git repository already initialized${NC}"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo "Initializing git repository..."
    git init
    echo -e "${GREEN}✅ Git repository initialized${NC}"
fi

# Check .gitignore exists
if [ ! -f ".gitignore" ]; then
    echo -e "${RED}❌ .gitignore file not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ .gitignore found${NC}"

# Check for .env files that shouldn't be committed
echo "Checking for .env files..."
ENV_FILES=$(find . -name ".env" -not -path "./node_modules/*" 2>/dev/null || true)
if [ -n "$ENV_FILES" ]; then
    echo -e "${YELLOW}⚠️  Found .env files. These should NOT be committed:${NC}"
    echo "$ENV_FILES"
    echo ""
    read -p "Continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ No .env files found (good!)${NC}"
fi

# Stage all files
echo ""
echo "Staging files..."
git add .

# Show what will be committed
echo ""
echo "Files to be committed:"
git status --short

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo -e "${YELLOW}⚠️  No changes to commit${NC}"
    exit 0
fi

# Create commit
echo ""
read -p "Enter commit message (or press Enter for default): " COMMIT_MSG
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Initial commit: IoT Web3 Water Quality Monitoring System"
fi

git commit -m "$COMMIT_MSG"
echo -e "${GREEN}✅ Changes committed${NC}"

# Check if remote exists
if git remote get-url origin &> /dev/null; then
    echo ""
    echo "Remote 'origin' already exists:"
    git remote get-url origin
    read -p "Do you want to change it? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git remote remove origin
        REMOTE_URL="https://github.com/SUVIJJANOS/IOT_web3.git"
        git remote add origin "$REMOTE_URL"
        echo -e "${GREEN}✅ Remote set to: $REMOTE_URL${NC}"
    fi
else
    REMOTE_URL="https://github.com/SUVIJJANOS/IOT_web3.git"
    echo ""
    read -p "GitHub repository URL (default: $REMOTE_URL): " USER_URL
    if [ -n "$USER_URL" ]; then
        REMOTE_URL="$USER_URL"
    fi
    git remote add origin "$REMOTE_URL"
    echo -e "${GREEN}✅ Remote added: $REMOTE_URL${NC}"
fi

# Check current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
echo ""
echo "Current branch: $CURRENT_BRANCH"

# Push to GitHub
echo ""
echo "Pushing to GitHub..."
echo ""

# Try to push
if git push -u origin "$CURRENT_BRANCH" 2>&1; then
    echo ""
    echo -e "${GREEN}✅ Successfully pushed to GitHub!${NC}"
    echo ""
    echo "Repository URL: https://github.com/SUVIJJANOS/IOT_web3"
    echo ""
    echo "Next steps:"
    echo "1. Visit https://github.com/SUVIJJANOS/IOT_web3 to verify"
    echo "2. Check that .env files are NOT visible"
    echo "3. Review SERVER_DEPLOYMENT.md for deploying to servers"
else
    echo ""
    echo -e "${RED}❌ Push failed. Common issues:${NC}"
    echo "1. Repository doesn't exist on GitHub - create it first at https://github.com/new"
    echo "2. Authentication failed - set up SSH keys or use Personal Access Token"
    echo "3. Branch name mismatch - try: git push -u origin $CURRENT_BRANCH:main"
    echo ""
    echo "Manual steps:"
    echo "1. Create repository at: https://github.com/new"
    echo "   Name: IOT_web3"
    echo "   DO NOT initialize with README, .gitignore, or license"
    echo "2. Then run: git push -u origin $CURRENT_BRANCH"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Deployment complete!${NC}"

