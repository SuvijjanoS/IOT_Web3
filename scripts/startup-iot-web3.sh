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

# Function to restart nginx
restart_nginx() {
    log "Restarting nginx..."
    
    # Check if nginx container exists
    if docker ps -a --format '{{.Names}}' | grep -q "^ade_dhammada-nginx-1$"; then
        docker exec ade_dhammada-nginx-1 nginx -t > /dev/null 2>&1 && {
            docker exec ade_dhammada-nginx-1 nginx -s reload
            log_success "Nginx reloaded successfully"
        } || {
            log_error "Nginx configuration test failed"
            return 1
        }
    else
        log_warning "Nginx container not found, skipping nginx restart"
    fi
}

# Main execution
main() {
    log "========================================="
    log "IOT Web3 Startup Script"
    log "========================================="
    
    # Check Docker
    check_docker || exit 1
    
    # Start IOT Web3 services
    start_iot_web3 || {
        log_error "Failed to start IOT Web3 services"
        exit 1
    }
    
    # Wait a bit for services to fully initialize
    sleep 5
    
    # Verify APIs
    verify_apis || {
        log_warning "Some API checks failed, but continuing..."
    }
    
    # Restart nginx
    restart_nginx || {
        log_warning "Nginx restart had issues, but continuing..."
    }
    
    log_success "========================================="
    log_success "Startup completed successfully!"
    log_success "========================================="
    log ""
    log "Services status:"
    docker-compose ps
    log ""
    log "Access the system at:"
    log "  - Frontend: http://iot.namisense.com"
    log "  - API: http://iot.namisense.com/api"
    log "  - Health: http://iot.namisense.com/health"
}

# Run main function
main "$@"

