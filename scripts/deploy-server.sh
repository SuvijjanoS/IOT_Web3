#!/bin/bash

# Direct Server Deployment Script
# Deploys IoT Web3 to DigitalOcean server

set -e

SERVER_IP="152.42.239.238"
SERVER_USER="root"

echo "🚀 Deploying IoT Web3 to DigitalOcean Server"
echo "=============================================="
echo ""

# Check if code is pushed to GitHub
echo "Step 1: Checking if code is on GitHub..."
if git remote get-url origin &> /dev/null; then
    echo "✅ GitHub remote configured"
    GITHUB_URL=$(git remote get-url origin)
    echo "Repository: $GITHUB_URL"
else
    echo "⚠️  No GitHub remote found. Please deploy to GitHub first."
    echo "Run: ./scripts/deploy-to-github.sh"
    exit 1
fi

echo ""
echo "Step 2: Connecting to server and setting up..."
echo "You'll be prompted for the password: d290980Throng"
echo ""

# Create deployment script to run on server
cat > /tmp/deploy-remote.sh << 'DEPLOYSCRIPT'
#!/bin/bash
set -e

echo "📦 Installing dependencies..."
apt update -qq
apt install -y curl git

echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
fi

echo "🐳 Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo "📥 Cloning repository..."
cd /root
if [ -d "IOT_web3" ]; then
    cd IOT_web3
    git pull
else
    git clone https://github.com/SUVIJJANOS/IOT_web3.git
    cd IOT_web3
fi

echo "⚙️  Setting up configuration..."
if [ ! -f "docker-compose.yml" ]; then
    cp docker-compose.example.yml docker-compose.yml
    echo "⚠️  docker-compose.yml created. You need to configure it!"
fi

echo "🛑 Stopping existing services (if any)..."
docker-compose down 2>/dev/null || true

echo "🚀 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to start..."
sleep 10

echo "📊 Service status:"
docker-compose ps

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Services are running at:"
echo "  Frontend: http://$(hostname -I | awk '{print $1}'):3000"
echo "  Backend:  http://$(hostname -I | awk '{print $1}'):3001/health"
echo ""
echo "To view logs: docker-compose logs -f"
DEPLOYSCRIPT

echo "Uploading deployment script..."
scp /tmp/deploy-remote.sh $SERVER_USER@$SERVER_IP:/root/deploy-remote.sh

echo ""
echo "Running deployment on server..."
ssh $SERVER_USER@$SERVER_IP "chmod +x /root/deploy-remote.sh && /root/deploy-remote.sh"

echo ""
echo "✅ Deployment initiated!"
echo ""
echo "Your application should be available at:"
echo "  Frontend: http://152.42.239.238:3000"
echo "  Backend:  http://152.42.239.238:3001/health"
echo ""
echo "Next steps:"
echo "1. SSH into server: ssh root@152.42.239.238"
echo "2. Configure docker-compose.yml: cd /root/IOT_web3 && nano docker-compose.yml"
echo "3. Restart services: docker-compose restart"
echo ""

rm /tmp/deploy-remote.sh

