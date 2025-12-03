# IOT_Web3 Docker Container Setup

## Overview

The IOT_Web3 system runs as a **completely isolated Docker container stack** on the droplet, separated from other services. All services communicate through a dedicated Docker network.

## Architecture

### Docker Containers

1. **`iot_web3_postgres`** - PostgreSQL 15 database
   - Port: `127.0.0.1:5433` (host) → `5432` (container)
   - Data persisted in Docker volume: `postgres_data`

2. **`iot_web3_mqtt`** - Eclipse Mosquitto MQTT broker
   - Ports: `127.0.0.1:1883` (MQTT), `127.0.0.1:9001` (WebSocket)
   - Configuration: `mosquitto.conf` (bound to localhost only)

3. **`iot_web3_backend`** - Node.js/Express API server
   - Port: `127.0.0.1:3001` (host) → `3001` (container)
   - Health check endpoint: `/health`
   - Connects to PostgreSQL and MQTT via Docker network

4. **`iot_web3_frontend`** - React frontend served by Nginx
   - Port: `127.0.0.1:3000` (host) → `80` (container)
   - Built with `VITE_API_URL=/api` for relative API paths

### Docker Network

- **Network Name**: `iot_web3_network`
- **Type**: Bridge network
- **Isolation**: All IOT_Web3 containers communicate through this dedicated network
- **External Access**: Only through exposed ports bound to `127.0.0.1` (localhost)

## Nginx Configuration

Nginx runs on the **host** (not in Docker) and proxies requests from `iot.namisense.com` to the Docker containers:

- **HTTP (port 80)**: Redirects to HTTPS
- **HTTPS (port 443)**: 
  - `/api/*` → `http://127.0.0.1:3001/api/*` (backend container)
  - `/health` → `http://127.0.0.1:3001/health` (backend health check)
  - `/*` → `http://127.0.0.1:3000/*` (frontend container)

## Security

All services are secured:

- **Port Binding**: All container ports bound to `127.0.0.1` (localhost only)
- **Network Isolation**: Custom Docker network prevents access from other containers
- **Firewall**: UFW rules block external access to internal ports
- **MQTT**: Bound to localhost only via `mosquitto.conf`
- **PostgreSQL**: Only accessible from host localhost

## Deployment

### On the Server

1. **Start Docker containers**:
   ```bash
   cd /root/IOT_Web3
   docker-compose up -d
   ```

2. **Setup Nginx**:
   ```bash
   sudo bash /root/IOT_Web3/scripts/setup-iot-namisense-nginx.sh
   ```

3. **Generate SSL certificates** (if not already done):
   ```bash
   certbot certonly --nginx -d iot.namisense.com
   ```

4. **Verify containers are running**:
   ```bash
   docker ps | grep iot_web3
   ```

5. **Check network isolation**:
   ```bash
   docker network inspect iot_web3_network
   ```

## Container Management

### View Logs
```bash
# All containers
docker-compose logs -f

# Specific container
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Restart Services
```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Stop/Start
```bash
# Stop all containers
docker-compose down

# Start all containers
docker-compose up -d
```

### Rebuild Containers
```bash
# Rebuild and restart
docker-compose up -d --build
```

## Verification

### Check Container Status
```bash
docker ps --filter "name=iot_web3"
```

### Test Backend API
```bash
curl http://127.0.0.1:3001/health
```

### Test Frontend
```bash
curl http://127.0.0.1:3000
```

### Test via Domain
```bash
# HTTP (should redirect to HTTPS)
curl -I http://iot.namisense.com

# HTTPS
curl -I https://iot.namisense.com
```

## Network Isolation

The `iot_web3_network` ensures:
- IOT_Web3 containers can communicate with each other
- Other Docker containers cannot access IOT_Web3 services
- Only exposed ports on `127.0.0.1` are accessible from the host
- Nginx on the host can proxy to containers via localhost

## Troubleshooting

### Containers not starting
```bash
docker-compose logs
docker-compose ps
```

### Network issues
```bash
docker network ls
docker network inspect iot_web3_network
```

### Port conflicts
```bash
# Check if ports are in use
netstat -tlnp | grep -E '3000|3001|5433|1883'
```

### Nginx not proxying correctly
```bash
# Test Nginx config
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/iot.namisense.com.error.log
```

