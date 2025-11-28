# 🎉 Deployment Complete!

Your IoT Web3 Water Quality Monitoring System has been successfully deployed to DigitalOcean!

## ✅ Deployment Status

**Server**: 152.42.239.238  
**Status**: All services running

### Services Running:

- ✅ **PostgreSQL Database** - Port 5432
- ✅ **MQTT Broker (Mosquitto)** - Port 1883
- ✅ **Backend API** - Port 3001
- ✅ **Frontend Dashboard** - Port 3000

## 🌐 Access Your Application

- **Frontend Dashboard**: http://152.42.239.238:3000
- **Backend API**: http://152.42.239.238:3001
- **Health Check**: http://152.42.239.238:3001/health

## 📝 Next Steps

### 1. Configure Blockchain (Optional)

If you want blockchain features, SSH into the server and edit docker-compose.yml:

```bash
ssh root@152.42.239.238
cd /root/IOT_web3
nano docker-compose.yml
```

Update these environment variables in the backend section:
- `SEPOLIA_RPC_URL`: Your Infura/Alchemy URL
- `CONTRACT_ADDRESS`: Your deployed contract address
- `PRIVATE_KEY`: Your wallet private key

Then restart:
```bash
docker-compose restart backend
```

### 2. Test the System

**Test Backend:**
```bash
curl http://152.42.239.238:3001/health
```

**Test MQTT:**
```bash
# Subscribe to test topic
mosquitto_sub -h 152.42.239.238 -t "test" -v

# In another terminal, publish
mosquitto_pub -h 152.42.239.238 -t "test" -m "Hello from IoT Web3"
```

**Send Test Sensor Data:**
```bash
mosquitto_pub -h 152.42.239.238 -t "water/quality/sensor_wq_001" -m '{
  "sensor_id": "sensor_wq_001",
  "ts": "2025-11-28T10:00:00Z",
  "location": {"lat": 13.7563, "lng": 100.5018},
  "parameters": {
    "ph": 7.2,
    "temperature_c": 27.5,
    "turbidity_ntu": 3.1,
    "tds_mg_l": 220,
    "dissolved_oxygen_mg_l": 6.8
  },
  "battery_pct": 89,
  "status": "OK"
}'
```

### 3. View Logs

```bash
ssh root@152.42.239.238
cd /root/IOT_web3

# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. Restart Services

```bash
ssh root@152.42.239.238
cd /root/IOT_web3

# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### 5. Update Code

When you push changes to GitHub:

```bash
ssh root@152.42.239.238
cd /root/IOT_web3
git pull
docker-compose down
docker-compose up -d --build
```

## 🔒 Security Recommendations

1. **Change Default Passwords**:
   - PostgreSQL password in docker-compose.yml
   - Server root password (use SSH keys instead)

2. **Set Up Firewall**:
   ```bash
   sudo ufw allow 22/tcp   # SSH
   sudo ufw allow 80/tcp    # HTTP
   sudo ufw allow 443/tcp   # HTTPS
   sudo ufw enable
   ```

3. **Set Up Domain & SSL**:
   - Point your domain to 152.42.239.238
   - Install Let's Encrypt SSL certificate
   - Configure Nginx reverse proxy

4. **Enable MQTT Authentication**:
   - Edit mosquitto.conf to require authentication
   - Create password file

## 📊 Monitoring

### Check Service Status

```bash
ssh root@152.42.239.238
cd /root/IOT_web3
docker-compose ps
```

### Check Resource Usage

```bash
docker stats
```

### Database Access

```bash
docker exec -it iot_web3_postgres psql -U postgres -d iot_web3

# Check readings
SELECT COUNT(*) FROM water_readings;

# View recent readings
SELECT sensor_id, ts, ph, turbidity_ntu, status FROM water_readings ORDER BY ts DESC LIMIT 10;
```

## 🐛 Troubleshooting

### Services Not Starting

```bash
# Check logs
docker-compose logs

# Check individual service
docker-compose logs backend
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Check database logs
docker-compose logs postgres
```

### Frontend Can't Connect to Backend

- Verify backend is running: `curl http://152.42.239.238:3001/health`
- Check backend logs for errors
- Verify CORS settings in backend

## 📚 Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build

# Check status
docker-compose ps
```

## 🎯 Your System is Live!

Visit http://152.42.239.238:3000 to see your dashboard!

For more information, see:
- [USER_MANUAL.md](USER_MANUAL.md) - How to use the system
- [SERVER_DEPLOYMENT.md](SERVER_DEPLOYMENT.md) - Deployment details
- [README.md](README.md) - Project documentation

---

**Deployment completed on**: $(date)  
**Server**: 152.42.239.238  
**Status**: ✅ All services running

