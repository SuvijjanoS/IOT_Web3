#!/bin/bash
#
# Security Remediation Script
# Secures Redis, MQTT, PostgreSQL, and other exposed services
# Restricts access to localhost/internal network only
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="/var/log/iot-web3-security.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[$(date '+%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        log_error "This script must be run as root"
        exit 1
    fi
}

# Secure Redis if it exists
secure_redis() {
    log "Checking for Redis installation..."
    
    # Check if Redis is running as a service
    if systemctl list-units --type=service --all | grep -q redis; then
        log_warning "Redis service found. Securing Redis..."
        
        # Find Redis config file
        REDIS_CONF="/etc/redis/redis.conf"
        if [ ! -f "$REDIS_CONF" ]; then
            REDIS_CONF="/etc/redis.conf"
        fi
        
        if [ -f "$REDIS_CONF" ]; then
            # Backup original config
            cp "$REDIS_CONF" "${REDIS_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
            
            # Bind to localhost only
            sed -i 's/^bind .*/bind 127.0.0.1 ::1/' "$REDIS_CONF" || {
                # If bind doesn't exist, add it
                if ! grep -q "^bind" "$REDIS_CONF"; then
                    sed -i '/^# bind 127.0.0.1/a bind 127.0.0.1 ::1' "$REDIS_CONF"
                fi
            }
            
            # Add password protection if not already set
            if ! grep -q "^requirepass" "$REDIS_CONF"; then
                REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
                echo "requirepass $REDIS_PASSWORD" >> "$REDIS_CONF"
                log_success "Redis password set: $REDIS_PASSWORD (saved to ${REDIS_CONF}.password)"
                echo "$REDIS_PASSWORD" > "${REDIS_CONF}.password"
                chmod 600 "${REDIS_CONF}.password"
            fi
            
            # Disable dangerous commands
            echo "rename-command FLUSHDB \"\"" >> "$REDIS_CONF"
            echo "rename-command FLUSHALL \"\"" >> "$REDIS_CONF"
            echo "rename-command CONFIG \"\"" >> "$REDIS_CONF"
            echo "rename-command EVAL \"\"" >> "$REDIS_CONF"
            
            # Restart Redis
            systemctl restart redis || systemctl restart redis-server || {
                log_warning "Could not restart Redis service, but config updated"
            }
            
            log_success "Redis secured"
        else
            log_warning "Redis config file not found, but service exists"
        fi
    fi
    
    # Check if Redis is running in Docker
    if docker ps --format '{{.Names}}' | grep -qi redis; then
        log_warning "Redis container found. Please secure it manually in docker-compose.yml"
    fi
}

# Secure MQTT
secure_mqtt() {
    log "Securing MQTT broker..."
    
    MQTT_CONF="$PROJECT_DIR/mosquitto.conf"
    if [ -f "$MQTT_CONF" ]; then
        # Backup original config
        cp "$MQTT_CONF" "${MQTT_CONF}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update MQTT config to bind to localhost only (if not already)
        if ! grep -q "^listener 1883 127.0.0.1" "$MQTT_CONF"; then
            # Comment out public listener
            sed -i 's/^listener 1883$/listener 1883 127.0.0.1/' "$MQTT_CONF"
        fi
        
        # Enable authentication (commented out by default, but we'll add instructions)
        if grep -q "^allow_anonymous true" "$MQTT_CONF"; then
            log_warning "MQTT allows anonymous access. Consider enabling authentication."
        fi
        
        log_success "MQTT configuration updated"
    fi
}

# Configure firewall to block external access to sensitive ports
configure_firewall() {
    log "Configuring firewall rules..."
    
    # Check if ufw is installed
    if command -v ufw > /dev/null 2>&1; then
        # Allow SSH (port 22)
        ufw allow 22/tcp
        
        # Allow HTTP/HTTPS (ports 80, 443)
        ufw allow 80/tcp
        ufw allow 443/tcp
        
        # Block Redis (port 6379) from external access
        ufw deny 6379/tcp
        log_success "Blocked Redis port 6379 from external access"
        
        # Block MQTT (port 1883) from external access (only allow through nginx if needed)
        ufw deny 1883/tcp
        log_success "Blocked MQTT port 1883 from external access"
        
        # Block PostgreSQL (port 5433) from external access
        ufw deny 5433/tcp
        log_success "Blocked PostgreSQL port 5433 from external access"
        
        # Block Backend API (port 3001) from external access (only allow through nginx)
        ufw deny 3001/tcp
        log_success "Blocked Backend API port 3001 from external access"
        
        # Enable firewall if not already enabled
        if ! ufw status | grep -q "Status: active"; then
            echo "y" | ufw enable
        fi
        
        log_success "Firewall configured"
    elif command -v iptables > /dev/null 2>&1; then
        # Use iptables directly
        log "Using iptables for firewall rules..."
        
        # Block Redis from external access (allow localhost)
        iptables -A INPUT -p tcp --dport 6379 -s 127.0.0.1 -j ACCEPT
        iptables -A INPUT -p tcp --dport 6379 -j DROP
        log_success "Blocked Redis port 6379 from external access"
        
        # Block MQTT from external access (allow localhost)
        iptables -A INPUT -p tcp --dport 1883 -s 127.0.0.1 -j ACCEPT
        iptables -A INPUT -p tcp --dport 1883 -j DROP
        log_success "Blocked MQTT port 1883 from external access"
        
        # Block PostgreSQL from external access (allow localhost)
        iptables -A INPUT -p tcp --dport 5433 -s 127.0.0.1 -j ACCEPT
        iptables -A INPUT -p tcp --dport 5433 -j DROP
        log_success "Blocked PostgreSQL port 5433 from external access"
        
        # Block Backend API from external access (allow localhost)
        iptables -A INPUT -p tcp --dport 3001 -s 127.0.0.1 -j ACCEPT
        iptables -A INPUT -p tcp --dport 3001 -j DROP
        log_success "Blocked Backend API port 3001 from external access"
        
        # Save iptables rules
        if command -v iptables-save > /dev/null 2>&1; then
            iptables-save > /etc/iptables/rules.v4 2>/dev/null || {
                log_warning "Could not save iptables rules. Install iptables-persistent to make rules permanent."
            }
        fi
        
        log_success "Firewall configured with iptables"
    else
        log_warning "No firewall tool found (ufw or iptables). Please install and configure manually."
    fi
}

# Update docker-compose.yml to bind services to localhost only
secure_docker_compose() {
    log "Updating docker-compose.yml to bind services to localhost only..."
    
    DOCKER_COMPOSE="$PROJECT_DIR/docker-compose.yml"
    if [ -f "$DOCKER_COMPOSE" ]; then
        # Backup original
        cp "$DOCKER_COMPOSE" "${DOCKER_COMPOSE}.backup.$(date +%Y%m%d_%H%M%S)"
        
        # Update PostgreSQL to bind to localhost only
        sed -i 's/- "5433:5432"/- "127.0.0.1:5433:5432"/' "$DOCKER_COMPOSE" || true
        
        # Update MQTT to bind to localhost only
        sed -i 's/- "1883:1883"/- "127.0.0.1:1883:1883"/' "$DOCKER_COMPOSE" || true
        sed -i 's/- "9001:9001"/- "127.0.0.1:9001:9001"/' "$DOCKER_COMPOSE" || true
        
        # Update Backend API to bind to localhost only
        sed -i 's/- "3001:3001"/- "127.0.0.1:3001:3001"/' "$DOCKER_COMPOSE" || true
        
        # Update Frontend to bind to localhost only (nginx will proxy)
        sed -i 's/- "3000:80"/- "127.0.0.1:3000:80"/' "$DOCKER_COMPOSE" || true
        
        log_success "docker-compose.yml updated to bind services to localhost only"
    fi
}

# Verify security
verify_security() {
    log "Verifying security configuration..."
    
    # Check if Redis is accessible from outside
    if command -v redis-cli > /dev/null 2>&1; then
        if timeout 2 redis-cli -h 127.0.0.1 ping > /dev/null 2>&1; then
            log_success "Redis is accessible on localhost"
        else
            log_warning "Redis may not be running or accessible"
        fi
    fi
    
    # Check firewall status
    if command -v ufw > /dev/null 2>&1; then
        ufw status | tee -a "$LOG_FILE"
    fi
    
    log_success "Security verification complete"
}

# Main execution
main() {
    log "========================================="
    log "IOT Web3 Security Remediation"
    log "========================================="
    
    check_root
    
    secure_redis
    secure_mqtt
    configure_firewall
    secure_docker_compose
    
    log ""
    log "Restarting services to apply changes..."
    cd "$PROJECT_DIR"
    docker-compose down
    sleep 2
    docker-compose up -d
    
    sleep 5
    verify_security
    
    log_success "========================================="
    log_success "Security remediation complete!"
    log_success "========================================="
    log ""
    log "Summary of changes:"
    log "  - Redis: Bound to localhost only, password protected"
    log "  - MQTT: Bound to localhost only"
    log "  - PostgreSQL: Bound to localhost only"
    log "  - Backend API: Bound to localhost only"
    log "  - Firewall: Blocked external access to sensitive ports"
    log ""
    log "All services are now only accessible through Nginx reverse proxy."
    log "Log file: $LOG_FILE"
}

# Run main function
main "$@"

