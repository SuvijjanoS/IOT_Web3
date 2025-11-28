# Quick Start: Deploy to GitHub and Servers

This is a condensed guide to get you from zero to deployed quickly.

## 🎯 Two-Step Process

1. **Deploy to GitHub** (5 minutes)
2. **Deploy to Server** (15-30 minutes)

---

## Part 1: Deploy to GitHub

### Option A: Using the Script (Easiest)

```bash
cd /Users/ss/IOT_Web3
./scripts/deploy-to-github.sh
```

Follow the prompts. The script will:
- Initialize git (if needed)
- Check for .env files
- Commit all files
- Push to GitHub

### Option B: Manual Steps

```bash
cd /Users/ss/IOT_Web3

# 1. Initialize git (if not already done)
git init

# 2. Add all files
git add .

# 3. Create initial commit
git commit -m "Initial commit: IoT Web3 Water Quality Monitoring System"

# 4. Add GitHub remote
git remote add origin https://github.com/SUVIJJANOS/IOT_web3.git

# 5. Push to GitHub
git branch -M main
git push -u origin main
```

**If repository doesn't exist:**
1. Go to https://github.com/new
2. Repository name: `IOT_web3`
3. **DO NOT** check "Initialize with README"
4. Click "Create repository"
5. Then run the push command above

**If authentication fails:**
- Use Personal Access Token instead of password
- Or set up SSH keys (see GITHUB_DEPLOYMENT.md)

---

## Part 2: Deploy to Server

### Choose Your Deployment Method

#### 🐳 Method 1: Docker Compose (Recommended for Beginners)

**Best for**: Single server, VPS, DigitalOcean Droplet

**Steps:**

1. **Get a server** (DigitalOcean, AWS EC2, Linode, etc.)
   - Minimum: 1GB RAM, 1 CPU
   - Recommended: 2GB RAM, 2 CPU
   - OS: Ubuntu 20.04 or 22.04

2. **SSH into server**
   ```bash
   ssh root@your-server-ip
   ```

3. **Install Docker**
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh
   ```

4. **Install Docker Compose**
   ```bash
   curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   chmod +x /usr/local/bin/docker-compose
   ```

5. **Clone repository**
   ```bash
   git clone https://github.com/SUVIJJANOS/IOT_web3.git
   cd IOT_web3
   ```

6. **Configure environment**
   ```bash
   cp docker-compose.example.yml docker-compose.yml
   nano docker-compose.yml
   ```
   
   Update these values:
   - `DB_PASSWORD`: Set a secure password
   - `SEPOLIA_RPC_URL`: Your Infura/Alchemy URL
   - `CONTRACT_ADDRESS`: Your deployed contract address
   - `PRIVATE_KEY`: Your wallet private key

7. **Start services**
   ```bash
   docker-compose up -d
   ```

8. **Check status**
   ```bash
   docker-compose ps
   docker-compose logs -f
   ```

9. **Access your application**
   - Frontend: http://your-server-ip:3000
   - Backend: http://your-server-ip:3001/health

**That's it!** Your system is running.

---

#### ☁️ Method 2: DigitalOcean App Platform (Easiest Cloud)

**Best for**: Quick deployment, managed services

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub: Select `SUVIJJANOS/IOT_web3`
4. Configure:
   - **Backend Component**:
     - Root: `backend/`
     - Build: `npm install`
     - Run: `npm start`
   - **Frontend Component**:
     - Root: `frontend/`
     - Build: `npm run build`
   - **Database**: Add PostgreSQL
   - **Environment Variables**: Add all from `backend/.env.example`
5. Click "Deploy"

**Done!** DigitalOcean handles everything.

---

#### 🚀 Method 3: Heroku (Quick but Limited)

**Backend:**

```bash
cd backend
heroku create iot-web3-backend
heroku addons:create heroku-postgresql:hobby-dev
heroku config:set DB_HOST=$(heroku config:get DATABASE_URL | cut -d'@' -f2 | cut -d'/' -f1)
heroku config:set DB_NAME=$(heroku config:get DATABASE_URL | cut -d'/' -f4)
heroku config:set DB_USER=$(heroku config:get DATABASE_URL | cut -d'/' -f3 | cut -d':' -f1)
heroku config:set DB_PASSWORD=$(heroku config:get DATABASE_URL | cut -d':' -f3 | cut -d'@' -f1)
# Add other environment variables
git subtree push --prefix . heroku main
```

**Frontend:**

```bash
cd frontend
heroku create iot-web3-frontend
heroku config:set VITE_API_URL=https://iot-web3-backend.herokuapp.com/api
git subtree push --prefix . heroku main
```

---

## Post-Deployment Checklist

- [ ] Verify backend health: `curl https://your-domain.com/api/health`
- [ ] Verify frontend loads: Open in browser
- [ ] Test MQTT: Send test message
- [ ] Check database: Verify data is being stored
- [ ] Test blockchain: Send sensor data, verify on Etherscan
- [ ] Set up domain (optional): Point DNS to your server
- [ ] Set up SSL (optional): Use Let's Encrypt
- [ ] Set up monitoring: UptimeRobot or similar
- [ ] Set up backups: Database backup script

---

## Common Issues & Quick Fixes

### "Repository not found"
- Create repository at https://github.com/new first

### "Permission denied" when pushing
- Use Personal Access Token or SSH keys

### "Port already in use"
- Change ports in docker-compose.yml or kill process using port

### "Database connection failed"
- Check PostgreSQL is running
- Verify credentials in .env

### "MQTT connection failed"
- Start MQTT broker (Mosquitto or EMQX)
- Check MQTT_BROKER_URL in .env

---

## Need More Details?

- **GitHub Deployment**: See [GITHUB_DEPLOYMENT.md](GITHUB_DEPLOYMENT.md)
- **Server Deployment**: See [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md)
- **User Manual**: See [USER_MANUAL.md](USER_MANUAL.md)

---

## Quick Commands Reference

```bash
# GitHub
git add .
git commit -m "Your message"
git push origin main

# Docker
docker-compose up -d          # Start
docker-compose down           # Stop
docker-compose logs -f        # View logs
docker-compose ps             # Status

# PM2 (if using individual services)
pm2 start src/index.js --name iot-backend
pm2 logs
pm2 restart iot-backend
```

---

**You're all set!** 🎉

For detailed instructions, see the full deployment guides.

