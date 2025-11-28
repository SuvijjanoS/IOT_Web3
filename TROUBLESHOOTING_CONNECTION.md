# Troubleshooting Connection Issues

If you cannot connect to your server, try these steps:

## Quick Checks

### 1. Verify Services Are Running

SSH into your server and check:
```bash
ssh root@152.42.239.238
cd /root/IOT_web3
docker-compose ps
```

All services should show "Up" status.

### 2. Check DigitalOcean Firewall

DigitalOcean has a cloud firewall that might be blocking ports. You need to:

1. Go to https://cloud.digitalocean.com/networking/firewalls
2. Find your server's firewall (or create one)
3. Add these inbound rules:
   - **HTTP (80)** - Allow all
   - **HTTPS (443)** - Allow all  
   - **Custom Port 3000** - Allow all (for frontend)
   - **Custom Port 3001** - Allow all (for backend)
   - **Custom Port 1883** - Allow all (for MQTT, optional)
   - **SSH (22)** - Allow all (or your IP only)

### 3. Check Server Firewall (UFW)

The server firewall might be blocking connections:

```bash
ssh root@152.42.239.238

# Check status
ufw status

# If active, allow ports
ufw allow 3000/tcp
ufw allow 3001/tcp
ufw allow 1883/tcp
ufw allow 22/tcp
```

### 4. Test Connection from Your Computer

Try these commands from your local machine:

```bash
# Test frontend
curl http://152.42.239.238:3000

# Test backend
curl http://152.42.239.238:3001/health

# Test with browser
# Open: http://152.42.239.238:3000
```

### 5. Check Browser Console

If accessing via browser:
1. Open browser developer tools (F12)
2. Go to Console tab
3. Look for errors
4. Check Network tab for failed requests

### 6. Check Frontend Configuration

The frontend might not be configured to connect to the backend. Check:

```bash
ssh root@152.42.239.238
cd /root/IOT_web3
cat docker-compose.yml | grep VITE_API_URL
```

It should be: `VITE_API_URL: http://152.42.239.238:3001/api`

If it's set to `localhost`, update it:
```bash
nano docker-compose.yml
# Change VITE_API_URL to: http://152.42.239.238:3001/api
docker-compose restart frontend
```

### 7. Check Backend Logs

```bash
ssh root@152.42.239.238
cd /root/IOT_web3
docker-compose logs backend | tail -50
```

Look for errors or connection issues.

### 8. Restart All Services

```bash
ssh root@152.42.239.238
cd /root/IOT_web3
docker-compose restart
```

Wait 30 seconds, then try accessing again.

## Common Issues

### Issue: "Connection Refused"

**Cause**: Firewall blocking or services not running

**Solution**:
1. Check DigitalOcean firewall settings
2. Check UFW firewall: `ufw status`
3. Verify services: `docker-compose ps`

### Issue: "This site can't be reached"

**Cause**: Ports not open or wrong URL

**Solution**:
1. Verify you're using: `http://152.42.239.238:3000` (not https)
2. Check DigitalOcean firewall allows port 3000
3. Try from different network (mobile hotspot)

### Issue: Frontend loads but shows errors

**Cause**: Frontend can't connect to backend API

**Solution**:
1. Check browser console for errors
2. Verify backend is running: `curl http://152.42.239.238:3001/health`
3. Update VITE_API_URL in docker-compose.yml
4. Restart frontend: `docker-compose restart frontend`

### Issue: "ERR_CONNECTION_TIMED_OUT"

**Cause**: Firewall blocking or server down

**Solution**:
1. Ping server: `ping 152.42.239.238`
2. Check if server is running in DigitalOcean dashboard
3. Verify firewall rules

## Step-by-Step Fix

1. **Open DigitalOcean Dashboard**
   - Go to https://cloud.digitalocean.com
   - Click on your droplet
   - Go to "Networking" tab
   - Check "Firewalls" section

2. **Create/Edit Firewall Rules**
   - Click "Create Firewall" or edit existing
   - Add inbound rules for ports 3000, 3001, 1883
   - Apply to your droplet

3. **Check Server Firewall**
   ```bash
   ssh root@152.42.239.238
   ufw status
   ufw allow 3000/tcp
   ufw allow 3001/tcp
   ```

4. **Verify Services**
   ```bash
   docker-compose ps
   docker-compose logs
   ```

5. **Test Access**
   - Try: http://152.42.239.238:3000
   - Check browser console for errors

## Still Having Issues?

1. **Check if server is accessible**:
   ```bash
   ping 152.42.239.238
   ```

2. **Try SSH connection**:
   ```bash
   ssh root@152.42.239.238
   ```
   If SSH works but web doesn't, it's a firewall issue.

3. **Check DigitalOcean Networking**:
   - Go to Networking → Firewalls
   - Make sure your droplet is assigned to a firewall
   - Or create a firewall with open ports

4. **View all logs**:
   ```bash
   ssh root@152.42.239.238
   cd /root/IOT_web3
   docker-compose logs
   ```

## Quick Fix Script

Run this on the server to open all necessary ports:

```bash
ssh root@152.42.239.238
ufw allow 22/tcp
ufw allow 3000/tcp
ufw allow 3001/tcp
ufw allow 1883/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
```

Then configure DigitalOcean firewall in the web dashboard.

