# Auto-Startup Guide for IOT_Web3

This guide explains how the IOT_Web3 system automatically starts on boot, restart, or container restart.

## Overview

The IOT_Web3 system is configured to automatically start and load all services, data, and configurations whenever:
- The system boots
- The system restarts
- Docker containers restart
- The systemd service is triggered

## Components

### 1. Docker Compose Restart Policies

All containers in `docker-compose.yml` have `restart: unless-stopped`:

- **`iot_web3_postgres`** - PostgreSQL database
- **`iot_web3_mqtt`** - MQTT broker
- **`iot_web3_backend`** - Backend API server
- **`iot_web3_frontend`** - Frontend web application

This means:
- Containers automatically restart if they crash
- Containers automatically start when Docker daemon starts (on boot)
- Containers persist across system reboots

### 2. Systemd Service

**Service File**: `/etc/systemd/system/iot-web3.service`

The systemd service:
- Starts **after** Docker and Nginx services are ready
- Runs the startup script to ensure all services are properly initialized
- Ensures Nginx is configured and running
- Verifies all services are healthy before completing

**Service Configuration**:
```ini
[Unit]
After=docker.service network-online.target nginx.service
Requires=docker.service
Wants=network-online.target nginx.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/root/IOT_Web3/scripts/startup-iot-web3.sh
TimeoutStartSec=600
Restart=on-failure
RestartSec=30

[Install]
WantedBy=multi-user.target
```

### 3. Startup Script

**Script**: `scripts/startup-iot-web3.sh`

The startup script performs the following steps:

1. **Ensures Nginx Service is Running**
   - Enables Nginx to start on boot
   - Starts Nginx if not running
   - Handles both host Nginx and Docker Nginx containers

2. **Checks Docker**
   - Verifies Docker daemon is running
   - Starts Docker if needed

3. **Verifies Data Persistence**
   - Checks PostgreSQL data volume exists
   - Ensures data will persist across restarts

4. **Starts Docker Containers in Order**
   - PostgreSQL (waits for health check)
   - MQTT broker
   - Backend API (waits for health check)
   - Frontend (waits for backend)

5. **Configures Nginx**
   - Sets up configuration for `iot.namisense.com`
   - Enables HTTP to HTTPS redirect
   - Configures SSL certificates

6. **Verifies Services**
   - Tests API endpoints
   - Verifies frontend is serving
   - Checks Nginx proxy is working

7. **Reloads Nginx**
   - Applies latest configuration
   - Ensures proxy is routing correctly

### 4. Data Persistence

**PostgreSQL Data**:
- Stored in Docker volume: `iot_web3_postgres_data`
- Persists across container restarts and system reboots
- Location: `/var/lib/docker/volumes/iot_web3_postgres_data`

**Logs**:
- Startup logs: `/var/log/iot-web3-startup.log`
- Container logs: `docker-compose logs`
- Systemd logs: `journalctl -u iot-web3.service`

## Installation

### On the Server

1. **Deploy the startup service**:
   ```bash
   cd /root/IOT_Web3
   sudo bash scripts/deploy-startup-service.sh
   ```

2. **Verify installation**:
   ```bash
   sudo systemctl status iot-web3.service
   ```

3. **Test manual start**:
   ```bash
   sudo systemctl start iot-web3.service
   sudo systemctl status iot-web3.service
   ```

## What Happens on Boot

When the system boots:

1. **Systemd starts** → Docker service starts → Nginx service starts
2. **iot-web3.service triggers** → Runs startup script
3. **Startup script**:
   - Ensures Nginx is running
   - Starts Docker containers (or they auto-start)
   - Configures Nginx for iot.namisense.com
   - Verifies all services are healthy
   - Reloads Nginx with latest config

4. **All services are ready** → System is accessible at `https://iot.namisense.com`

## What Happens on Container Restart

When a container restarts (manually or due to crash):

1. **Docker Compose** automatically restarts the container (due to `restart: unless-stopped`)
2. **Health checks** ensure containers are ready before dependent services start
3. **Data persists** because volumes are mounted
4. **Nginx** continues routing traffic (containers restart transparently)

## Manual Operations

### Start Services Manually
```bash
cd /root/IOT_Web3
docker-compose up -d
```

### Restart Services
```bash
cd /root/IOT_Web3
docker-compose restart
```

### Run Startup Script Manually
```bash
cd /root/IOT_Web3
sudo bash scripts/startup-iot-web3.sh
```

### Check Service Status
```bash
# Systemd service
sudo systemctl status iot-web3.service

# Docker containers
cd /root/IOT_Web3
docker-compose ps

# Nginx
sudo systemctl status nginx
```

## Viewing Logs

### Startup Logs
```bash
# Real-time startup log
tail -f /var/log/iot-web3-startup.log

# Systemd journal
sudo journalctl -u iot-web3.service -f

# Last 100 lines
sudo journalctl -u iot-web3.service -n 100
```

### Container Logs
```bash
# All containers
cd /root/IOT_Web3
docker-compose logs -f

# Specific container
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Nginx Logs
```bash
# Error log
sudo tail -f /var/log/nginx/iot.namisense.com.error.log

# Access log
sudo tail -f /var/log/nginx/iot.namisense.com.access.log

# General Nginx log
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting

### Services Not Starting on Boot

1. **Check if service is enabled**:
   ```bash
   sudo systemctl is-enabled iot-web3.service
   ```

2. **Check service status**:
   ```bash
   sudo systemctl status iot-web3.service
   ```

3. **Check startup logs**:
   ```bash
   sudo journalctl -u iot-web3.service -n 50
   tail -f /var/log/iot-web3-startup.log
   ```

4. **Check Docker**:
   ```bash
   sudo systemctl status docker
   docker ps -a
   ```

5. **Check Nginx**:
   ```bash
   sudo systemctl status nginx
   sudo nginx -t
   ```

### Containers Not Restarting

1. **Check restart policy**:
   ```bash
   cd /root/IOT_Web3
   docker-compose config | grep restart
   ```

2. **Check container status**:
   ```bash
   docker ps -a | grep iot_web3
   ```

3. **Check container logs**:
   ```bash
   docker logs iot_web3_backend
   docker logs iot_web3_frontend
   ```

### Data Not Persisting

1. **Check volume exists**:
   ```bash
   docker volume ls | grep iot_web3
   docker volume inspect iot_web3_postgres_data
   ```

2. **Verify data directory**:
   ```bash
   docker volume inspect iot_web3_postgres_data --format '{{.Mountpoint}}'
   ```

### Nginx Not Routing Correctly

1. **Test Nginx configuration**:
   ```bash
   sudo nginx -t
   ```

2. **Check Nginx is running**:
   ```bash
   sudo systemctl status nginx
   ```

3. **Check site is enabled**:
   ```bash
   ls -la /etc/nginx/sites-enabled/ | grep iot.namisense.com
   ```

4. **Reload Nginx**:
   ```bash
   sudo systemctl reload nginx
   ```

## Service Management Commands

```bash
# Enable service to start on boot
sudo systemctl enable iot-web3.service

# Disable service from starting on boot
sudo systemctl disable iot-web3.service

# Start service now
sudo systemctl start iot-web3.service

# Stop service
sudo systemctl stop iot-web3.service

# Restart service
sudo systemctl restart iot-web3.service

# Check if service is enabled
sudo systemctl is-enabled iot-web3.service

# Check service status
sudo systemctl status iot-web3.service
```

## Summary

The IOT_Web3 system is fully automated:

✅ **Docker containers** restart automatically (`restart: unless-stopped`)  
✅ **Systemd service** starts on boot and ensures all services are ready  
✅ **Nginx** is configured and enabled to start on boot  
✅ **Data persists** in Docker volumes across restarts  
✅ **Logs** are preserved for troubleshooting  
✅ **Health checks** ensure services are ready before accepting traffic  

Everything loads automatically whenever the system boots, restarts, or containers restart!

