#!/bin/bash
#
# Startup script for IOT Web3 system
# Ensures all services are started in the correct order and verifies they are working
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_FILE="/var/log/iot-web3-startup.log"

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

# Function to wait for a service to be healthy
wait_for_service() {
    local service_name=$1
    local health_url=$2
    local max_attempts=${3:-30}
    local delay=${4:-2}
    
    log "Waiting for $service_name to be ready..."
    for i in $(seq 1 $max_attempts); do
        if curl -sf "$health_url" > /dev/null 2>&1; then
            log_success "$service_name is ready"
            return 0
        fi
        if [ $i -lt $max_attempts ]; then
            log "Attempt $i/$max_attempts: $service_name not ready yet, waiting ${delay}s..."
            sleep $delay
        fi
    done
    
    log_error "$service_name failed to become ready after $max_attempts attempts"
    return 1
}

# Function to check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Starting Docker..."
        systemctl start docker || {
            log_error "Failed to start Docker"
            return 1
        }
        sleep 5
    fi
    log_success "Docker is running"
}

# Function to start IOT Web3 services
start_iot_web3() {
    log "Starting IOT Web3 services..."
    cd "$PROJECT_DIR"
    
    # Start services
    docker-compose up -d postgres mqtt
    
    # Wait for PostgreSQL to be ready
    log "Waiting for PostgreSQL to be ready..."
    wait_for_service "PostgreSQL" "http://localhost:5433" 30 2 || {
        log_error "PostgreSQL failed to start"
        return 1
    }
    
    # Start backend
    log "Starting backend service..."
    docker-compose up -d backend
    
    # Wait for backend to be ready
    wait_for_service "Backend" "http://localhost:3001/health" 60 3 || {
        log_error "Backend failed to start"
        docker-compose logs backend | tail -50 >> "$LOG_FILE"
        return 1
    }
    
    # Start frontend
    log "Starting frontend service..."
    
    # Ensure frontend is built with correct API URL
    log "Verifying frontend API configuration..."
    if ! grep -q "VITE_API_URL: /api" docker-compose.yml 2>/dev/null; then
        log_warning "Frontend API URL not set correctly in docker-compose.yml, updating..."
        sed -i 's|VITE_API_URL:.*|VITE_API_URL: /api|g' docker-compose.yml || {
            log_error "Failed to update docker-compose.yml"
        }
    fi
    
    # Rebuild frontend if needed to ensure correct API URL
    log "Rebuilding frontend with correct API URL..."
    docker-compose build --no-cache frontend || {
        log_warning "Frontend build had issues, but continuing..."
    }
    
    docker-compose up -d frontend
    
    # Wait for frontend to be ready
    wait_for_service "Frontend" "http://localhost:3000" 30 2 || {
        log_error "Frontend failed to start"
        return 1
    }
    
    log_success "All IOT Web3 services started successfully"
}

# Function to verify API endpoints
verify_apis() {
    log "Verifying API endpoints..."
    
    # Check sensors endpoint
    if curl -sf "http://localhost:3001/api/sensors" > /dev/null 2>&1; then
        log_success "Sensors API is working"
    else
        log_warning "Sensors API check failed (may be normal if no sensors exist)"
    fi
    
    # Check drone flights endpoint
    if curl -sf "http://localhost:3001/api/drone-flights" > /dev/null 2>&1; then
        log_success "Drone flights API is working"
    else
        log_warning "Drone flights API check failed (may be normal if no flights exist)"
    fi
    
    # Check health endpoint
    if curl -sf "http://localhost:3001/health" > /dev/null 2>&1; then
        log_success "Backend health check passed"
    else
        log_error "Backend health check failed"
        return 1
    fi
}

# Function to ensure Nginx service is running
ensure_nginx_service() {
    log "Ensuring Nginx service is running..."
    
    # Check if nginx is installed as a system service
    if command -v nginx > /dev/null 2>&1; then
        # Enable nginx to start on boot if not already enabled
        if ! systemctl is-enabled nginx > /dev/null 2>&1; then
            log "Enabling Nginx to start on boot..."
            systemctl enable nginx || log_warning "Failed to enable Nginx service"
        fi
        
        # Start nginx if not running
        if ! systemctl is-active --quiet nginx; then
            log "Starting Nginx service..."
            systemctl start nginx || {
                log_error "Failed to start Nginx service"
                return 1
            }
            sleep 2
        fi
        log_success "Nginx service is running"
    else
        log_warning "Nginx not found as system service, checking Docker container..."
    fi
    
    # Check if nginx container exists (for other services)
    if docker ps -a --format '{{.Names}}' | grep -q "^ade_dhammada-nginx-1$"; then
        log "Found Nginx Docker container, ensuring it's running..."
        docker start ade_dhammada-nginx-1 2>/dev/null || true
        docker exec ade_dhammada-nginx-1 nginx -t > /dev/null 2>&1 && {
            docker exec ade_dhammada-nginx-1 nginx -s reload
            log_success "Nginx container reloaded successfully"
        } || {
            log_warning "Nginx container configuration test failed"
        }
    fi
}

# Function to configure Nginx for iot.namisense.com
# This adds iot.namisense.com to existing Nginx config WITHOUT overriding other services
configure_nginx() {
    log "Configuring Nginx for iot.namisense.com (adding to existing config)..."
    
    # Use the script that adds to existing config without overriding
    if [ -f "$PROJECT_DIR/scripts/add-iot-namisense-to-nginx.sh" ]; then
        log "Running Nginx configuration script (adds to existing config)..."
        bash "$PROJECT_DIR/scripts/add-iot-namisense-to-nginx.sh" >> "$LOG_FILE" 2>&1 || {
            log_warning "Nginx configuration script had issues, but continuing..."
        }
    else
        log_warning "Nginx configuration script not found, skipping configuration"
        log_warning "Please run: sudo bash $PROJECT_DIR/scripts/add-iot-namisense-to-nginx.sh"
    fi
}

# Function to restart nginx
restart_nginx() {
    log "Reloading Nginx configuration..."
    
    # Reload host nginx if it exists
    if command -v nginx > /dev/null 2>&1 && systemctl is-active --quiet nginx; then
        if nginx -t > /dev/null 2>&1; then
            systemctl reload nginx || {
                log_warning "Nginx reload failed, attempting restart..."
                systemctl restart nginx
            }
            log_success "Nginx reloaded successfully"
        else
            log_error "Nginx configuration test failed"
            return 1
        fi
    fi
    
    # Also handle Docker nginx container if it exists
    if docker ps -a --format '{{.Names}}' | grep -q "^ade_dhammada-nginx-1$"; then
        docker exec ade_dhammada-nginx-1 nginx -t > /dev/null 2>&1 && {
            docker exec ade_dhammada-nginx-1 nginx -s reload
            log_success "Nginx container reloaded successfully"
        } || {
            log_warning "Nginx container configuration test failed"
        }
    fi
}

# Function to verify data persistence
verify_data_persistence() {
    log "Verifying data persistence..."
    
    # Check if PostgreSQL volume exists and has data
    if docker volume inspect iot_web3_postgres_data > /dev/null 2>&1; then
        log_success "PostgreSQL data volume exists"
    else
        log_warning "PostgreSQL data volume not found (will be created)"
    fi
    
    # Check if containers can access their data
    if docker ps --format '{{.Names}}' | grep -q "^iot_web3_postgres$"; then
        log_success "PostgreSQL container is running with persistent data"
    fi
}

# Main execution
main() {
    log "========================================="
    log "IOT Web3 Startup Script"
    log "========================================="
    
    # Ensure Nginx service is running first
    ensure_nginx_service || {
        log_warning "Nginx service check had issues, but continuing..."
    }
    
    # Check Docker
    check_docker || exit 1
    
    # Verify data persistence
    verify_data_persistence
    
    # Start IOT Web3 services
    start_iot_web3 || {
        log_error "Failed to start IOT Web3 services"
        exit 1
    }
    
    # Configure Nginx for iot.namisense.com
    configure_nginx || {
        log_warning "Nginx configuration had issues, but continuing..."
    }
    
    # Wait a bit for services to fully initialize
    sleep 5
    
    # Verify APIs
    verify_apis || {
        log_warning "Some API checks failed, but continuing..."
    }
    
    # Verify frontend can access APIs
    log "Verifying frontend API connectivity..."
    sleep 3
    if curl -sf "http://localhost:3000" > /dev/null 2>&1; then
        log_success "Frontend is serving correctly"
    else
        log_warning "Frontend may have issues, but continuing..."
    }
    
    # Restart nginx to ensure latest configuration is loaded
    restart_nginx || {
        log_warning "Nginx restart had issues, but continuing..."
    }
    
    # Final verification - check API through nginx
    log "Performing final API verification through nginx..."
    sleep 3
    if curl -sf "http://localhost/api/sensors" > /dev/null 2>&1 || curl -sf "http://iot.namisense.com/api/sensors" > /dev/null 2>&1 || curl -sf "https://iot.namisense.com/api/sensors" > /dev/null 2>&1; then
        log_success "API accessible through nginx proxy"
    else
        log_warning "API verification through nginx had issues (may need DNS or SSL setup)"
    fi
    
    log_success "========================================="
    log_success "Startup completed successfully!"
    log_success "========================================="
    log ""
    log "Services status:"
    docker-compose ps
    log ""
    log "Nginx status:"
    if command -v nginx > /dev/null 2>&1; then
        systemctl status nginx --no-pager -l | head -10 || true
    fi
    log ""
    log "Access the system at:"
    log "  - Frontend: https://iot.namisense.com"
    log "  - API: https://iot.namisense.com/api"
    log "  - Health: https://iot.namisense.com/health"
    log ""
    log "Data persistence:"
    log "  - PostgreSQL data: $(docker volume inspect iot_web3_postgres_data --format '{{.Mountpoint}}' 2>/dev/null || echo 'Volume will be created')"
    log "  - Logs: $LOG_FILE"
}

# Run main function
main "$@"

