# GitHub Deployment Guide

This guide will walk you through deploying your IoT Web3 project to GitHub and setting it up for collaboration.

## Step 1: Initialize Git Repository

If you haven't already initialized git:

```bash
cd /Users/ss/IOT_Web3

# Initialize git repository
git init

# Check current status
git status
```

## Step 2: Verify .gitignore

Make sure `.gitignore` is properly configured to exclude sensitive files:

```bash
# Check .gitignore exists and has correct entries
cat .gitignore
```

The `.gitignore` should exclude:
- `.env` files (contain secrets)
- `node_modules/`
- Build artifacts
- Database files
- Logs

## Step 3: Create .env.example Files (If Missing)

Ensure all `.env.example` files exist and are committed (these are safe to commit):

```bash
# Verify example files exist
ls contracts/.env.example
ls backend/.env.example
ls mqtt-simulator/.env.example
```

If any are missing, create them from the existing `.env` files (remove sensitive data).

## Step 4: Stage and Commit Files

```bash
# Add all files (respecting .gitignore)
git add .

# Check what will be committed (verify no .env files)
git status

# Create initial commit
git commit -m "Initial commit: IoT Web3 Water Quality Monitoring System

- Smart contracts for blockchain data verification
- Backend API with MQTT and PostgreSQL integration
- React frontend with data and control dashboards
- MQTT simulator for testing
- Complete documentation and deployment guides"
```

## Step 5: Add GitHub Remote

```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/SUVIJJANOS/IOT_web3.git

# Verify remote was added
git remote -v
```

**Note**: If you haven't created the repository on GitHub yet:
1. Go to https://github.com/new
2. Repository name: `IOT_web3`
3. Description: "Industrial IoT + Web3 Water Quality Monitoring System"
4. Choose Public or Private
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 6: Push to GitHub

```bash
# Push to GitHub (first time)
git push -u origin main

# If you get an error about branch name, try:
git branch -M main
git push -u origin main

# Or if your default branch is 'master':
git push -u origin master
```

## Step 7: Verify on GitHub

1. Go to: https://github.com/SUVIJJANOS/IOT_web3
2. Verify all files are present
3. Check that `.env` files are **NOT** visible (they should be ignored)
4. Verify README.md displays correctly

## Step 8: Set Up Repository Settings

### Add Repository Description

1. Go to repository Settings
2. Update description: "Industrial IoT + Web3 Water Quality Monitoring System with blockchain verification"

### Add Topics/Tags

Click "Add topics" and add:
- `iot`
- `web3`
- `blockchain`
- `mqtt`
- `postgresql`
- `react`
- `ethereum`
- `water-quality`
- `sensors`

### Protect Main Branch (Optional but Recommended)

1. Go to Settings → Branches
2. Add rule for `main` branch
3. Require pull request reviews before merging
4. Require status checks to pass

## Step 9: Create GitHub Actions for CI/CD (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main, master ]
  pull_request:
    branches: [ main, master ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: iot_web3_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: |
        npm install
        cd contracts && npm install && cd ..
        cd backend && npm install && cd ..
        cd frontend && npm install && cd ..
    
    - name: Compile contracts
      run: |
        cd contracts
        npm run compile
    
    - name: Run database migrations
      run: |
        cd backend
        npm run db:migrate
      env:
        DB_HOST: localhost
        DB_PORT: 5432
        DB_NAME: iot_web3_test
        DB_USER: postgres
        DB_PASSWORD: postgres
    
    - name: Build frontend
      run: |
        cd frontend
        npm run build
```

## Step 10: Add GitHub Secrets (For Deployment)

If you plan to deploy from GitHub Actions, add secrets:

1. Go to Settings → Secrets and variables → Actions
2. Add the following secrets:
   - `SEPOLIA_RPC_URL`
   - `PRIVATE_KEY` (for contract deployment)
   - `DB_PASSWORD` (for production database)
   - `MQTT_BROKER_URL` (for production MQTT)

**⚠️ Important**: Never commit these values directly to the repository!

## Step 11: Create Release Tags

For versioning:

```bash
# Create a tag for v1.0.0
git tag -a v1.0.0 -m "Initial release: IoT Web3 Water Quality Monitoring System"

# Push tags to GitHub
git push origin v1.0.0

# Or push all tags
git push origin --tags
```

## Step 12: Update README with GitHub Badges (Optional)

Add badges to your README.md:

```markdown
![GitHub](https://img.shields.io/github/license/SUVIJJANOS/IOT_web3)
![GitHub last commit](https://img.shields.io/github/last-commit/SUVIJJANOS/IOT_web3)
![GitHub repo size](https://img.shields.io/github/repo-size/SUVIJJANOS/IOT_web3)
```

## Troubleshooting

### Error: "remote origin already exists"

```bash
# Remove existing remote
git remote remove origin

# Add new remote
git remote add origin https://github.com/SUVIJJANOS/IOT_web3.git
```

### Error: "failed to push some refs"

```bash
# Pull first (if repository has initial commit)
git pull origin main --allow-unrelated-histories

# Then push
git push -u origin main
```

### Error: Authentication failed

```bash
# Use GitHub Personal Access Token instead of password
# Or set up SSH keys:
ssh-keygen -t ed25519 -C "your_email@example.com"
# Add public key to GitHub: Settings → SSH and GPG keys
# Then use SSH URL:
git remote set-url origin git@github.com:SUVIJJANOS/IOT_web3.git
```

### Check if .env files are accidentally committed

```bash
# Search for .env files in git history
git ls-files | grep .env

# If found, remove them:
git rm --cached backend/.env
git rm --cached contracts/.env
git commit -m "Remove .env files from tracking"
```

## Next Steps

After pushing to GitHub:

1. ✅ Share repository with collaborators
2. ✅ Set up branch protection rules
3. ✅ Configure GitHub Actions (if desired)
4. ✅ Deploy to servers (see SERVER_DEPLOYMENT.md)

## Repository Structure on GitHub

Your repository should look like:

```
IOT_web3/
├── .github/              # GitHub Actions workflows (optional)
├── contracts/            # Smart contracts
├── backend/              # Backend API
├── frontend/             # Frontend React app
├── mqtt-simulator/       # MQTT test data generator
├── scripts/              # Setup scripts
├── .gitignore           # Git ignore rules
├── README.md            # Main documentation
├── USER_MANUAL.md       # User guide
├── SETUP.md             # Setup instructions
├── DEPLOYMENT.md        # Deployment guide
├── GITHUB_DEPLOYMENT.md # This file
└── LICENSE              # MIT License
```

## Security Checklist

Before making repository public:

- [ ] All `.env` files are in `.gitignore`
- [ ] No API keys or secrets in code
- [ ] No private keys committed
- [ ] Database passwords not in code
- [ ] `.env.example` files have placeholder values
- [ ] Sensitive data removed from commit history (if needed)

## Making Repository Public

If you want to make it public:

1. Go to Settings → General
2. Scroll to "Danger Zone"
3. Click "Change visibility"
4. Select "Make public"
5. Confirm

Your code is now on GitHub! 🎉

