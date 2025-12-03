# Security Remediation - Redis and Service Exposure

## Critical Security Issue Fixed

**Date**: $(date)
**Issue**: Redis and other services were exposed to the public internet, allowing unauthorized access to data.

## Changes Made

### 1. Docker Compose Services Secured
All services in `docker-compose.yml` are now bound to `127.0.0.1` (localhost only):
- **PostgreSQL**: `127.0.0.1:5433:5432` (was `5433:5432`)
- **MQTT**: `127.0.0.1:1883:1883` (was `1883:1883`)
- **Backend API**: `127.0.0.1:3001:3001` (was `3001:3001`)
- **Frontend**: `127.0.0.1:3000:80` (was `3000:80`)

### 2. MQTT Configuration Updated
- MQTT broker now listens only on `127.0.0.1:1883` instead of all interfaces
- Updated `mosquitto.conf` to bind to localhost only

### 3. Firewall Rules
Created firewall rules to block external access to sensitive ports:
- **Redis (6379)**: Blocked from external access
- **MQTT (1883)**: Blocked from external access
- **PostgreSQL (5433)**: Blocked from external access
- **Backend API (3001)**: Blocked from external access

### 4. Redis Security (if installed)
- Bound to `127.0.0.1` only
- Password protection enabled
- Dangerous commands disabled

## Access Control

All services are now **only accessible** through:
1. **Nginx reverse proxy** (ports 80/443) - Public access
2. **Localhost** - Internal access only

## Deployment Instructions

### On the Server

1. **Run the security remediation script**:
   ```bash
   sudo bash /root/IOT_Web3/scripts/secure-redis-and-services.sh
   ```

2. **Restart services**:
   ```bash
   cd /root/IOT_Web3
   docker-compose down
   docker-compose up -d
   ```

3. **Verify security**:
   ```bash
   # Check if ports are bound to localhost only
   netstat -tlnp | grep -E '5433|1883|3001|3000|6379'
   
   # Should show 127.0.0.1:PORT, not 0.0.0.0:PORT
   ```

4. **Test external access** (should fail):
   ```bash
   # From another machine, these should fail:
   telnet YOUR_SERVER_IP 6379  # Redis
   telnet YOUR_SERVER_IP 1883  # MQTT
   telnet YOUR_SERVER_IP 5433  # PostgreSQL
   telnet YOUR_SERVER_IP 3001  # Backend API
   ```

5. **Test through Nginx** (should work):
   ```bash
   curl https://iot.namisense.com/api/health
   ```

## Security Best Practices Applied

✅ **Principle of Least Privilege**: Services only accessible where needed
✅ **Network Isolation**: Services bound to localhost only
✅ **Firewall Protection**: Multiple layers of security
✅ **Reverse Proxy**: Single point of entry through Nginx
✅ **No Direct Exposure**: No services directly accessible from internet

## Verification Checklist

- [ ] All Docker services bound to 127.0.0.1
- [ ] Firewall rules blocking external access
- [ ] Redis secured (if installed)
- [ ] MQTT bound to localhost
- [ ] PostgreSQL not accessible externally
- [ ] Backend API only accessible through Nginx
- [ ] Frontend accessible through Nginx only
- [ ] External port scans show services blocked

## Notes

- **Redis**: If Redis is running outside Docker, the script will secure it automatically
- **MQTT**: If you need external MQTT access, use Nginx to proxy it with authentication
- **Monitoring**: All services remain accessible for monitoring via localhost
- **Backup**: Original configurations backed up with timestamp

## Rollback

If you need to rollback:
```bash
# Restore docker-compose.yml backup
cp docker-compose.yml.backup.* docker-compose.yml

# Restore mosquitto.conf backup
cp mosquitto.conf.backup.* mosquitto.conf

# Restart services
docker-compose restart
```

## Support

If you encounter issues:
1. Check logs: `/var/log/iot-web3-security.log`
2. Verify firewall: `sudo ufw status` or `sudo iptables -L`
3. Check service bindings: `netstat -tlnp | grep PORT`

