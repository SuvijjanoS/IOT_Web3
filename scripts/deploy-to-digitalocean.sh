#!/bin/bash

# DigitalOcean Deployment Script
# This script deploys the IoT Web3 system to your DigitalOcean server

set -e

# Server details
SERVER_IP="152.42.239.238"
SERVER_USER="root"
SERVER_PASS="d290980Throng"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploying IoT Web3 to DigitalOcean${NC}"
echo "=========================================="
echo ""

# Check if sshpass is installed (needed for password auth)
if ! command -v sshpass &> /dev/null; then
    echo -e "${YELLOW}⚠️  sshpass not found. Installing...${NC}"
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install hudochenkov/sshpass/sshpass
        else
            echo -e "${RED}Please install sshpass: brew install hudochenkov/sshpass/sshpass${NC}"
            exit 1
        fi
    else
        # Linux
        sudo apt-get update && sudo apt-get install -y sshpass
    fi
fi

echo -e "${GREEN}✅ sshpass installed${NC}"

# Function to run command on remote server
run_remote() {
    sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no "$SERVER_USER@$SERVER_IP" "$1"
}

# Function to copy file to remote server
copy_to_remote() {
    sshpass -p "$SERVER_PASS" scp -o StrictHostKeyChecking=no "$1" "$SERVER_USER@$SERVER_IP:$2"
}

echo "Step 1: Testing SSH connection..."
if run_remote "echo 'Connection successful'"; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    exit 1
fi

echo ""
echo "Step 2: Updating system packages..."
run_remote "apt update && apt upgrade -y"

echo ""
echo "Step 3: Installing Docker..."
run_remote "curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && rm get-docker.sh"

echo ""
echo "Step 4: Installing Docker Compose..."
run_remote "curl -L 'https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)' -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose"

echo ""
echo "Step 5: Installing Git..."
run_remote "apt install -y git"

echo ""
echo "Step 6: Cloning repository..."
run_remote "cd /root && rm -rf IOT_web3 && git clone https://github.com/SUVIJJANOS/IOT_web3.git"

echo ""
echo "Step 7: Setting up docker-compose.yml..."
# Create docker-compose.yml on server
run_remote "cd /root/IOT_web3 && cp docker-compose.example.yml docker-compose.yml"

echo ""
echo "Step 8: Configuring environment variables..."
echo -e "${YELLOW}⚠️  You'll need to edit docker-compose.yml on the server with your configuration${NC}"
echo "Run this command to edit:"
echo "  ssh root@152.42.239.238"
echo "  cd /root/IOT_web3"
echo "  nano docker-compose.yml"
echo ""
echo "Update these values:"
echo "  - DB_PASSWORD: Set a secure password"
echo "  - SEPOLIA_RPC_URL: Your Infura/Alchemy URL"
echo "  - CONTRACT_ADDRESS: Your deployed contract address"
echo "  - PRIVATE_KEY: Your wallet private key"

echo ""
read -p "Press Enter after you've configured docker-compose.yml on the server..."

echo ""
echo "Step 9: Starting services..."
run_remote "cd /root/IOT_web3 && docker-compose up -d"

echo ""
echo "Step 10: Checking service status..."
run_remote "cd /root/IOT_web3 && docker-compose ps"

echo ""
echo "Step 11: Viewing logs..."
run_remote "cd /root/IOT_web3 && docker-compose logs --tail=50"

echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "Your application should be available at:"
echo "  Frontend: http://152.42.239.238:3000"
echo "  Backend:  http://152.42.239.238:3001/health"
echo ""
echo "To view logs:"
echo "  ssh root@152.42.239.238"
echo "  cd /root/IOT_web3"
echo "  docker-compose logs -f"
echo ""
echo "To restart services:"
echo "  docker-compose restart"
echo ""

