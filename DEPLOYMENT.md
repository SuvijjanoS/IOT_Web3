# Deployment Guide

This guide covers deploying the IoT Web3 Water Quality Monitoring System to production environments.

## 📦 Pre-Deployment Checklist

- [ ] PostgreSQL database set up and accessible
- [ ] MQTT broker (EMQX/Mosquitto) running and accessible
- [ ] Ethereum wallet with Sepolia testnet ETH
- [ ] Smart contract deployed and contract address saved
- [ ] All environment variables configured
- [ ] Domain name and SSL certificates (for production)

## 🐳 Option 1: Docker Deployment (Recommended)

### Prerequisites
- Docker and Docker Compose installed

### Steps

1. **Create docker-compose.yml** (example provided below)
2. **Set environment variables** in `.env` files or docker-compose
3. **Run**:
   ```bash
   docker-compose up -d
   ```

### Example docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: iot_web3
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  mqtt:
    image: eclipse-mosquitto:2.0
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto.conf:/mosquitto/config/mosquitto.conf

  backend:
    build: ./backend
    environment:
      PORT: 3001
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: iot_web3
      DB_USER: postgres
      DB_PASSWORD: ${DB_PASSWORD}
      MQTT_BROKER_URL: mqtt://mqtt:1883
      SEPOLIA_RPC_URL: ${SEPOLIA_RPC_URL}
      CONTRACT_ADDRESS: ${CONTRACT_ADDRESS}
      PRIVATE_KEY: ${PRIVATE_KEY}
    ports:
      - "3001:3001"
    depends_on:
      - postgres
      - mqtt

  frontend:
    build: ./frontend
    ports:
      - "3000:80"
    environment:
      VITE_API_URL: http://localhost:3001/api
    depends_on:
      - backend

volumes:
  postgres_data:
```

## ☁️ Option 2: Cloud Platform Deployment

### Heroku

1. **Install Heroku CLI**
2. **Create Heroku apps**:
   ```bash
   heroku create iot-web3-backend
   heroku create iot-web3-frontend
   ```

3. **Add PostgreSQL addon**:
   ```bash
   heroku addons:create heroku-postgresql:hobby-dev -a iot-web3-backend
   ```

4. **Set environment variables**:
   ```bash
   heroku config:set DB_HOST=... -a iot-web3-backend
   heroku config:set MQTT_BROKER_URL=... -a iot-web3-backend
   # ... etc
   ```

5. **Deploy**:
   ```bash
   git subtree push --prefix backend heroku main
   ```

### AWS / Google Cloud / Azure

1. **Set up managed PostgreSQL** (RDS, Cloud SQL, etc.)
2. **Deploy backend** to EC2/Compute Engine/App Service
3. **Deploy frontend** to S3+CloudFront / Cloud Storage / Static Web Apps
4. **Configure environment variables** in platform settings
5. **Set up load balancer** and SSL certificates

## 🔧 Environment Variables

### Backend (.env)

```bash
# Server
PORT=3001
NODE_ENV=production

# Database
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=iot_web3
DB_USER=postgres
DB_PASSWORD=your-secure-password

# MQTT
MQTT_BROKER_URL=mqtt://your-mqtt-broker:1883
MQTT_TOPIC_SENSOR=water/quality/+
MQTT_TOPIC_CONTROL=water/control/+

# Blockchain
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_KEY
CONTRACT_ADDRESS=0x...
PRIVATE_KEY=your-private-key
```

### Frontend (.env.production)

```bash
VITE_API_URL=https://your-backend-api.com/api
```

## 🗄️ Database Migration

Run migrations before starting the backend:

```bash
cd backend
npm run db:migrate
```

Or manually:

```bash
psql -h your-host -U postgres -d iot_web3 -f src/db/schema.sql
```

## 🔒 Security Best Practices

1. **Use HTTPS** in production
2. **Enable MQTT authentication**:
   ```bash
   # mosquitto.conf
   allow_anonymous false
   password_file /mosquitto/config/passwd
   ```
3. **Use environment variables** for all secrets
4. **Enable database SSL** connections
5. **Use a secrets manager** (AWS Secrets Manager, HashiCorp Vault, etc.)
6. **Set up firewall rules** to restrict access
7. **Regular security updates** for dependencies

## 📊 Monitoring

### Recommended Tools

- **Application Monitoring**: PM2, New Relic, Datadog
- **Database Monitoring**: pgAdmin, CloudWatch
- **MQTT Monitoring**: EMQX Dashboard, MQTT Explorer
- **Blockchain**: Etherscan API for transaction monitoring

### Health Checks

- Backend: `GET /health`
- Database: Connection pool status
- MQTT: Connection status logs
- Blockchain: Contract interaction success rate

## 🔄 CI/CD Setup

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy Backend
        run: |
          # Your deployment commands
```

## 🐛 Troubleshooting

### Backend won't start
- Check database connection
- Verify MQTT broker is accessible
- Check environment variables

### No sensor data appearing
- Verify MQTT broker is running
- Check MQTT topic subscriptions
- Verify sensor simulator is publishing

### Blockchain transactions failing
- Check Sepolia RPC URL
- Verify wallet has testnet ETH
- Check contract address is correct

### Frontend can't connect to backend
- Verify CORS settings
- Check API URL in frontend config
- Verify backend is running

## 📈 Scaling Considerations

- **Database**: Use connection pooling, consider read replicas
- **Backend**: Use PM2 cluster mode or Kubernetes
- **MQTT**: Use EMQX cluster for high availability
- **Frontend**: Use CDN for static assets
- **Blockchain**: Batch transactions if high volume

## 🔄 Backup Strategy

1. **Database**: Daily automated backups
2. **Configuration**: Version control all configs
3. **Blockchain**: Transaction hashes stored in DB (immutable)

## 📞 Support

For deployment issues, check:
1. Application logs
2. Database logs
3. MQTT broker logs
4. Blockchain transaction status

