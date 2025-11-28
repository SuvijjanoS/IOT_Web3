# Server Deployment Guide

This guide covers deploying the IoT Web3 system to various cloud platforms and servers.

## Table of Contents

1. [Deployment Options](#deployment-options)
2. [Option 1: Docker Compose (Recommended)](#option-1-docker-compose-recommended)
3. [Option 2: Individual Services](#option-2-individual-services)
4. [Option 3: Cloud Platforms](#option-3-cloud-platforms)
5. [Post-Deployment](#post-deployment)

---

## Deployment Options

### Quick Comparison

| Option | Difficulty | Cost | Best For |
|-------|-----------|------|----------|
| Docker Compose | Easy | Low | Single server, VPS |
| Individual Services | Medium | Medium | Full control, custom setup |
| Heroku | Easy | Medium | Quick deployment, managed services |
| AWS/GCP/Azure | Hard | Variable | Enterprise, scaling |
| DigitalOcean App Platform | Easy | Low-Medium | Simple cloud deployment |

---

## Option 1: Docker Compose (Recommended)

**Best for**: Single VPS, DigitalOcean Droplet, AWS EC2, or any Linux server

### Prerequisites

- Server with Ubuntu 20.04+ or similar Linux
- Docker and Docker Compose installed
- Domain name (optional but recommended)
- SSH access to server

### Step 1: Set Up Server

#### On Your Local Machine

```bash
# Clone your repository
git clone https://github.com/SUVIJJANOS/IOT_web3.git
cd IOT_web3
```

#### On Your Server (via SSH)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version

# Add your user to docker group (optional, to avoid sudo)
sudo usermod -aG docker $USER
# Log out and back in for this to take effect
```

### Step 2: Clone Repository on Server

```bash
# Clone your repository
git clone https://github.com/SUVIJJANOS/IOT_web3.git
cd IOT_web3

# Or if you prefer SSH:
git clone git@github.com:SUVIJJANOS/IOT_web3.git
cd IOT_web3
```

### Step 3: Configure Environment Variables

```bash
# Copy docker-compose.example.yml
cp docker-compose.example.yml docker-compose.yml

# Create .env file for docker-compose
nano docker-compose.yml
```

Edit `docker-compose.yml` and update environment variables:

```yaml
services:
  backend:
    environment:
      DB_PASSWORD: your_secure_password_here
      SEPOLIA_RPC_URL: https://sepolia.infura.io/v3/YOUR_KEY
      CONTRACT_ADDRESS: 0x...
      PRIVATE_KEY: your_private_key
      MQTT_BROKER_URL: mqtt://mqtt:1883
```

### Step 4: Deploy with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps

# Stop services
docker-compose down

# Restart services
docker-compose restart
```

### Step 5: Set Up Reverse Proxy (Nginx)

For HTTPS and domain access:

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx config
sudo nano /etc/nginx/sites-available/iot-web3
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/iot-web3 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 6: Set Up SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

### Step 7: Verify Deployment

- Frontend: https://your-domain.com
- Backend API: https://your-domain.com/api/health
- MQTT: your-domain.com:1883 (if exposed)

---

## Option 2: Individual Services

**Best for**: Full control, custom configurations, existing infrastructure

### Architecture

```
┌─────────────┐
│   Nginx     │ (Port 80/443)
│  (Reverse   │
│   Proxy)    │
└──────┬──────┘
       │
   ┌───┴───┐
   │       │
┌──▼──┐ ┌─▼────┐
│React│ │Node.js│ (Port 3001)
│Build│ │ API   │
└─────┘ └───┬──┘
            │
    ┌───────┼───────┐
    │       │       │
┌───▼──┐ ┌─▼───┐ ┌─▼────┐
│PostgreSQL│ │MQTT│ │Redis│
│  :5432   │ │:1883│ │:6379│
└─────────┘ └────┘ └─────┘
```

### Step 1: Set Up PostgreSQL

```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE iot_web3;
CREATE USER iot_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE iot_web3 TO iot_user;
\q

# Run migrations
cd /path/to/IOT_web3/backend
npm run db:migrate
```

### Step 2: Set Up MQTT Broker (EMQX)

```bash
# Using Docker (easiest)
docker run -d \
  --name emqx \
  -p 1883:1883 \
  -p 8083:8083 \
  -p 8084:8084 \
  -p 18083:18083 \
  emqx/emqx:latest

# Access EMQX dashboard: http://your-server:18083
# Default username: admin, password: public
```

### Step 3: Set Up Backend (Node.js)

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Clone repository
cd /var/www
git clone https://github.com/SUVIJJANOS/IOT_web3.git
cd IOT_web3/backend

# Install dependencies
npm install --production

# Set up environment
cp .env.example .env
nano .env  # Edit with production values

# Install PM2 (process manager)
sudo npm install -g pm2

# Start backend with PM2
pm2 start src/index.js --name iot-backend

# Save PM2 configuration
pm2 save
pm2 startup  # Follow instructions to enable auto-start
```

### Step 4: Build and Deploy Frontend

```bash
cd /var/www/IOT_web3/frontend

# Install dependencies
npm install

# Build for production
npm run build

# The build output is in 'dist/' directory
# Serve with Nginx (see Step 5)
```

### Step 5: Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/iot-web3
```

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/IOT_web3/frontend/dist;
    index index.html;

    # Frontend (SPA)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable and restart:

```bash
sudo ln -s /etc/nginx/sites-available/iot-web3 /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Option 3: Cloud Platforms

### Heroku Deployment

#### Backend on Heroku

```bash
# Install Heroku CLI
# https://devcenter.heroku.com/articles/heroku-cli

# Login
heroku login

# Create app
heroku create iot-web3-backend

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev -a iot-web3-backend

# Set environment variables
heroku config:set DB_HOST=... -a iot-web3-backend
heroku config:set MQTT_BROKER_URL=... -a iot-web3-backend
heroku config:set SEPOLIA_RPC_URL=... -a iot-web3-backend
heroku config:set CONTRACT_ADDRESS=... -a iot-web3-backend
heroku config:set PRIVATE_KEY=... -a iot-web3-backend

# Deploy
cd backend
git subtree push --prefix . heroku main
```

#### Frontend on Heroku

```bash
# Create frontend app
heroku create iot-web3-frontend

# Set buildpack
heroku buildpacks:set heroku/nodejs -a iot-web3-frontend

# Set environment
heroku config:set VITE_API_URL=https://iot-web3-backend.herokuapp.com/api -a iot-web3-frontend

# Deploy
cd frontend
git subtree push --prefix . heroku main
```

### DigitalOcean App Platform

1. Go to https://cloud.digitalocean.com/apps
2. Click "Create App"
3. Connect GitHub repository: `SUVIJJANOS/IOT_web3`
4. Configure:
   - **Backend**: Root directory `backend/`, Build command `npm install`, Run command `npm start`
   - **Frontend**: Root directory `frontend/`, Build command `npm run build`
   - **Database**: Add PostgreSQL managed database
   - **Environment Variables**: Add all required vars
5. Deploy

### AWS Deployment

#### Using EC2 + RDS + Elastic Beanstalk

1. **Create RDS PostgreSQL Database**
   - Go to RDS Console
   - Create PostgreSQL instance
   - Note endpoint and credentials

2. **Deploy Backend to Elastic Beanstalk**
   ```bash
   # Install EB CLI
   pip install awsebcli

   # Initialize
   cd backend
   eb init

   # Create environment
   eb create iot-web3-backend

   # Set environment variables
   eb setenv DB_HOST=your-rds-endpoint DB_PASSWORD=...
   ```

3. **Deploy Frontend to S3 + CloudFront**
   ```bash
   cd frontend
   npm run build

   # Upload to S3
   aws s3 sync dist/ s3://your-bucket-name

   # Create CloudFront distribution
   # Point to S3 bucket
   ```

### Google Cloud Platform

#### Using Cloud Run

```bash
# Install gcloud CLI
# https://cloud.google.com/sdk/docs/install

# Build and deploy backend
cd backend
gcloud builds submit --tag gcr.io/YOUR_PROJECT/iot-backend
gcloud run deploy iot-backend --image gcr.io/YOUR_PROJECT/iot-backend

# Build and deploy frontend
cd frontend
npm run build
gcloud app deploy
```

---

## Post-Deployment

### Step 1: Verify All Services

```bash
# Check backend health
curl https://your-domain.com/api/health

# Check database connection
# SSH into server and run:
psql -h localhost -U iot_user -d iot_web3 -c "SELECT COUNT(*) FROM water_readings;"

# Check MQTT
mosquitto_pub -h your-domain.com -t "test" -m "test"
```

### Step 2: Set Up Monitoring

#### PM2 Monitoring (if using PM2)

```bash
pm2 monit
pm2 logs
```

#### Set Up Uptime Monitoring

- Use services like:
  - UptimeRobot (free)
  - Pingdom
  - StatusCake

Monitor:
- Backend health endpoint
- Frontend URL
- MQTT broker

### Step 3: Set Up Backups

#### Database Backups

```bash
# Create backup script
nano /usr/local/bin/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -h localhost -U iot_user iot_web3 > $BACKUP_DIR/iot_web3_$DATE.sql
# Keep only last 7 days
find $BACKUP_DIR -name "iot_web3_*.sql" -mtime +7 -delete
```

```bash
chmod +x /usr/local/bin/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-db.sh
```

### Step 4: Set Up Logging

```bash
# View application logs
pm2 logs iot-backend

# View Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# View system logs
journalctl -u nginx -f
```

### Step 5: Security Hardening

1. **Firewall Setup**
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

2. **MQTT Security**
   - Enable authentication in EMQX/Mosquitto
   - Use TLS for MQTT (port 8883)
   - Restrict access to specific IPs if possible

3. **Database Security**
   - Change default PostgreSQL port (optional)
   - Use strong passwords
   - Restrict database access to localhost only

4. **API Security**
   - Add rate limiting
   - Use API keys for external access
   - Enable CORS only for your frontend domain

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
pm2 logs iot-backend

# Check environment variables
pm2 env iot-backend

# Restart
pm2 restart iot-backend
```

### Database Connection Issues

```bash
# Test connection
psql -h localhost -U iot_user -d iot_web3

# Check PostgreSQL is running
sudo systemctl status postgresql

# Check firewall
sudo ufw status
```

### Frontend Can't Connect to Backend

- Verify backend URL in frontend environment variables
- Check CORS settings in backend
- Verify Nginx proxy configuration
- Check browser console for errors

### MQTT Connection Issues

```bash
# Test MQTT
mosquitto_pub -h localhost -t "test" -m "test"

# Check EMQX/Mosquitto logs
docker logs emqx
# or
sudo journalctl -u mosquitto -f
```

---

## Cost Estimation

### Small Deployment (Docker Compose on VPS)

- **DigitalOcean Droplet**: $6-12/month (1-2GB RAM)
- **Domain**: $10-15/year
- **Total**: ~$7-13/month

### Medium Deployment (Managed Services)

- **Heroku**: $7-25/month (backend + frontend)
- **Database**: Included or $9/month
- **Domain**: $10-15/year
- **Total**: ~$16-34/month

### Enterprise (AWS/GCP)

- **EC2/Compute**: $20-100/month
- **RDS/Cloud SQL**: $15-50/month
- **S3/Storage**: $5-20/month
- **Load Balancer**: $20-50/month
- **Total**: $60-220/month

---

## Next Steps

1. ✅ Set up monitoring and alerts
2. ✅ Configure automated backups
3. ✅ Set up CI/CD pipeline
4. ✅ Add SSL certificates
5. ✅ Configure domain DNS
6. ✅ Test all functionality
7. ✅ Document your specific deployment

Your system is now deployed! 🚀

