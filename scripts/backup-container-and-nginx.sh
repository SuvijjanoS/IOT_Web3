#!/bin/bash

# Backup IOT_Web3 containers and Nginx configuration
# Creates a complete backup of all data and configurations

set -e

PROJECT_DIR="${PROJECT_DIR:-/root/IOT_web3}"
BACKUP_DIR="/root/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="iot_web3_backup_${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

echo "========================================="
echo "BACKUP: IOT_Web3 Container & Nginx"
echo "========================================="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Please run as root (use sudo)"
    exit 1
fi

# Create backup directory
mkdir -p "$BACKUP_PATH"
echo "📁 Backup directory: $BACKUP_PATH"
echo ""

# Step 1: Backup Docker volumes
echo "1️⃣  Backing up Docker volumes..."
cd "$PROJECT_DIR"

# Backup PostgreSQL volume
if docker volume ls | grep -q "iot_web3_postgres_data"; then
    echo "   Backing up PostgreSQL volume..."
    docker run --rm \
        -v iot_web3_postgres_data:/data \
        -v "$BACKUP_PATH":/backup \
        alpine tar czf /backup/postgres_data.tar.gz -C /data .
    echo "   ✅ PostgreSQL volume backed up"
else
    echo "   ⚠️  PostgreSQL volume not found"
fi

# List all volumes for reference
echo "   Docker volumes:"
docker volume ls | grep iot_web3 || echo "   (none found)"
echo ""

# Step 2: Backup docker-compose.yml
echo "2️⃣  Backing up docker-compose.yml..."
if [ -f "$PROJECT_DIR/docker-compose.yml" ]; then
    cp "$PROJECT_DIR/docker-compose.yml" "$BACKUP_PATH/docker-compose.yml"
    echo "   ✅ docker-compose.yml backed up"
else
    echo "   ⚠️  docker-compose.yml not found"
fi
echo ""

# Step 3: Backup environment variables (if .env exists)
echo "3️⃣  Backing up environment files..."
if [ -f "$PROJECT_DIR/.env" ]; then
    cp "$PROJECT_DIR/.env" "$BACKUP_PATH/.env"
    echo "   ✅ .env backed up"
fi

# Backup any other config files
for file in mosquitto.conf nginx.conf nginx-iot-namisense.conf; do
    if [ -f "$PROJECT_DIR/$file" ]; then
        cp "$PROJECT_DIR/$file" "$BACKUP_PATH/$file"
        echo "   ✅ $file backed up"
    fi
done
echo ""

# Step 4: Backup Nginx configuration
echo "4️⃣  Backing up Nginx configuration..."
mkdir -p "$BACKUP_PATH/nginx"

# Backup main nginx.conf
if [ -f "/etc/nginx/nginx.conf" ]; then
    cp /etc/nginx/nginx.conf "$BACKUP_PATH/nginx/nginx.conf"
    echo "   ✅ Main nginx.conf backed up"
fi

# Backup sites-available
if [ -d "/etc/nginx/sites-available" ]; then
    cp -r /etc/nginx/sites-available "$BACKUP_PATH/nginx/"
    echo "   ✅ sites-available backed up"
fi

# Backup sites-enabled (as reference)
if [ -d "/etc/nginx/sites-enabled" ]; then
    cp -r /etc/nginx/sites-enabled "$BACKUP_PATH/nginx/"
    echo "   ✅ sites-enabled backed up"
fi

# Backup SSL certificates for iot.namisense.com
if [ -d "/etc/nginx/ssl/iot.namisense.com" ]; then
    cp -r /etc/nginx/ssl/iot.namisense.com "$BACKUP_PATH/nginx/ssl/"
    echo "   ✅ SSL certificates backed up"
fi

# Backup Let's Encrypt certificates if they exist
if [ -d "/etc/letsencrypt" ]; then
    echo "   Backing up Let's Encrypt certificates..."
    tar czf "$BACKUP_PATH/nginx/letsencrypt.tar.gz" -C /etc letsencrypt 2>/dev/null || {
        echo "   ⚠️  Could not backup Let's Encrypt (may need different permissions)"
    }
fi
echo ""

# Step 5: Export Docker images
echo "5️⃣  Backing up Docker images..."
mkdir -p "$BACKUP_PATH/images"

# Get list of IOT_Web3 images
IMAGES=$(docker images --format "{{.Repository}}:{{.Tag}}" | grep -E "iot_web3|iot-web3" || true)

if [ -n "$IMAGES" ]; then
    for image in $IMAGES; do
        echo "   Exporting image: $image"
        IMAGE_FILE=$(echo "$image" | tr '/:' '_')
        docker save "$image" | gzip > "$BACKUP_PATH/images/${IMAGE_FILE}.tar.gz" || {
            echo "   ⚠️  Failed to export $image"
        }
    done
    echo "   ✅ Docker images backed up"
else
    echo "   ⚠️  No IOT_Web3 images found (images will be rebuilt from docker-compose.yml)"
fi
echo ""

# Step 6: Create container status snapshot
echo "6️⃣  Creating container status snapshot..."
docker ps -a --filter "name=iot_web3" --format "{{.Names}}\t{{.Status}}\t{{.Image}}" > "$BACKUP_PATH/container_status.txt"
docker ps -a --filter "name=iot_web3" --format "json" > "$BACKUP_PATH/container_status.json" 2>/dev/null || true
echo "   ✅ Container status saved"
echo ""

# Step 7: Create backup manifest
echo "7️⃣  Creating backup manifest..."
cat > "$BACKUP_PATH/BACKUP_MANIFEST.txt" << EOF
IOT_Web3 Backup Manifest
========================
Backup Date: $(date)
Backup Name: $BACKUP_NAME
Backup Path: $BACKUP_PATH

Contents:
---------
- docker-compose.yml: Docker Compose configuration
- postgres_data.tar.gz: PostgreSQL database volume backup
- nginx/: Nginx configuration files
  - nginx.conf: Main Nginx configuration
  - sites-available/: All site configurations
  - sites-enabled/: Enabled site symlinks
  - ssl/: SSL certificates
- images/: Docker image exports
- container_status.txt: Container status at backup time

Restore Instructions:
---------------------
1. Extract backup: tar xzf ${BACKUP_NAME}.tar.gz
2. Restore PostgreSQL volume:
   docker run --rm -v iot_web3_postgres_data:/data -v \$(pwd):/backup alpine tar xzf /backup/postgres_data.tar.gz -C /data
3. Restore Nginx config:
   cp -r nginx/sites-available/* /etc/nginx/sites-available/
   cp -r nginx/sites-enabled/* /etc/nginx/sites-enabled/
   cp nginx/nginx.conf /etc/nginx/nginx.conf
   nginx -t && systemctl reload nginx
4. Load Docker images:
   docker load < images/*.tar.gz
5. Start containers:
   docker-compose up -d

EOF

echo "   ✅ Manifest created"
echo ""

# Step 8: Create compressed archive
echo "8️⃣  Creating compressed archive..."
cd "$BACKUP_DIR"
tar czf "${BACKUP_NAME}.tar.gz" "$BACKUP_NAME" 2>/dev/null || {
    echo "   ⚠️  Could not create compressed archive (continuing with directory backup)"
}

if [ -f "${BACKUP_NAME}.tar.gz" ]; then
    ARCHIVE_SIZE=$(du -h "${BACKUP_NAME}.tar.gz" | cut -f1)
    echo "   ✅ Archive created: ${BACKUP_NAME}.tar.gz ($ARCHIVE_SIZE)"
    echo "   📁 Location: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
else
    echo "   📁 Backup directory: $BACKUP_PATH"
fi

# Calculate backup size
BACKUP_SIZE=$(du -sh "$BACKUP_PATH" | cut -f1)
echo "   📊 Backup size: $BACKUP_SIZE"
echo ""

echo "========================================="
echo "✅ BACKUP COMPLETE"
echo "========================================="
echo ""
echo "Backup location: $BACKUP_PATH"
if [ -f "${BACKUP_DIR}/${BACKUP_NAME}.tar.gz" ]; then
    echo "Archive: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
fi
echo ""
echo "To restore, see: $BACKUP_PATH/BACKUP_MANIFEST.txt"

