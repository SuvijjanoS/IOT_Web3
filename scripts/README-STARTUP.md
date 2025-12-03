# IOT Web3 Startup Scripts

This directory contains scripts to automatically start and manage the IOT Web3 system on server boot.

## Files

- `startup-iot-web3.sh` - Main startup script that ensures all services start in the correct order
- `iot-web3.service` - Systemd service file for automatic startup
- `deploy-startup-service.sh` - Script to install the systemd service on the server

## Installation

### On the Server

1. **Clone or update the repository:**
   ```bash
   cd /opt
   git clone https://github.com/SuvijjanoS/IOT_Web3.git
   # OR if already cloned:
   cd /opt/IOT_Web3
   git pull
   ```

2. **Deploy the startup service:**
   ```bash
   cd /opt/IOT_Web3
   sudo ./scripts/deploy-startup-service.sh
   ```

3. **Start the service manually (optional):**
   ```bash
   sudo systemctl start iot-web3.service
   ```

4. **Check status:**
   ```bash
   sudo systemctl status iot-web3.service
   ```

## What the Startup Script Does

1. **Checks Docker** - Ensures Docker is running
2. **Starts PostgreSQL** - Waits for database to be ready (up to 60 seconds)
3. **Starts MQTT** - Starts the MQTT broker
4. **Starts Backend** - Waits for backend to be healthy (up to 3 minutes)
5. **Starts Frontend** - Waits for frontend to be ready
6. **Verifies APIs** - Checks that sensors and drone flights APIs are working
7. **Restarts Nginx** - Reloads nginx configuration

## Manual Usage

You can also run the startup script manually:

```bash
cd /opt/IOT_Web3
./scripts/startup-iot-web3.sh
```

## Logs

- **Systemd logs:** `sudo journalctl -u iot-web3.service -f`
- **Script logs:** `tail -f /var/log/iot-web3-startup.log`

## Troubleshooting

### Services not starting

1. Check Docker: `sudo systemctl status docker`
2. Check logs: `sudo journalctl -u iot-web3.service -n 100`
3. Check individual containers: `docker ps -a`
4. Check container logs: `docker logs iot_web3_backend`

### Database connection issues

The script includes retry logic, but if issues persist:
1. Check PostgreSQL: `docker logs iot_web3_postgres`
2. Verify network: `docker network inspect iot_web3_default`
3. Test connection: `docker exec iot_web3_backend wget -qO- http://localhost:3001/health`

### API not working

1. Check backend health: `curl http://localhost:3001/health`
2. Check API endpoints: `curl http://localhost:3001/api/sensors`
3. Check frontend: `curl http://localhost:3000`

## Service Management

```bash
# Start service
sudo systemctl start iot-web3.service

# Stop service
sudo systemctl stop iot-web3.service

# Restart service
sudo systemctl restart iot-web3.service

# Enable on boot
sudo systemctl enable iot-web3.service

# Disable on boot
sudo systemctl disable iot-web3.service

# Check status
sudo systemctl status iot-web3.service
```

## Notes

- The service runs as a oneshot type, meaning it runs once on boot and exits
- Services are managed by Docker Compose, so they will restart automatically if they crash
- The script waits for each service to be ready before starting the next one
- Maximum wait times are configured to prevent infinite waiting

