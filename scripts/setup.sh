#!/bin/bash

# IoT Web3 Setup Script
# This script helps set up the development environment

set -e

echo "🌊 IoT Web3 Water Quality Monitoring System - Setup"
echo "=================================================="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL is not installed. Please install PostgreSQL first."
    echo "   Database setup will be skipped."
    SKIP_DB=true
else
    echo "✅ PostgreSQL detected"
    SKIP_DB=false
fi

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

echo ""
echo "📦 Installing contract dependencies..."
cd contracts && npm install && cd ..

echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install && cd ..

echo ""
echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Database setup
if [ "$SKIP_DB" = false ]; then
    echo ""
    echo "🗄️  Setting up database..."
    
    # Check if database exists
    if psql -lqt | cut -d \| -f 1 | grep -qw iot_web3; then
        echo "✅ Database 'iot_web3' already exists"
    else
        echo "Creating database 'iot_web3'..."
        createdb iot_web3 || echo "⚠️  Could not create database. Please create it manually: createdb iot_web3"
    fi
    
    echo "Running database migrations..."
    cd backend
    npm run db:migrate || echo "⚠️  Migration failed. Please check your database connection."
    cd ..
fi

# Create .env files if they don't exist
echo ""
echo "⚙️  Setting up environment files..."

if [ ! -f "contracts/.env" ]; then
    echo "Creating contracts/.env.example..."
    if [ -f "contracts/.env.example" ]; then
        cp contracts/.env.example contracts/.env
        echo "✅ Created contracts/.env (please edit with your configuration)"
    fi
fi

if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env..."
    if [ -f "backend/.env.example" ]; then
        cp backend/.env.example backend/.env
        echo "✅ Created backend/.env (please edit with your configuration)"
    fi
fi

if [ ! -f "mqtt-simulator/.env" ]; then
    echo "Creating mqtt-simulator/.env..."
    if [ -f "mqtt-simulator/.env.example" ]; then
        cp mqtt-simulator/.env.example mqtt-simulator/.env
        echo "✅ Created mqtt-simulator/.env (please edit with your configuration)"
    fi
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Configure environment variables in:"
echo "   - contracts/.env"
echo "   - backend/.env"
echo "   - mqtt-simulator/.env"
echo ""
echo "2. Deploy smart contract:"
echo "   cd contracts && npm run deploy:sepolia"
echo ""
echo "3. Start the backend:"
echo "   cd backend && npm run dev"
echo ""
echo "4. Start the frontend (in another terminal):"
echo "   cd frontend && npm run dev"
echo ""
echo "5. (Optional) Start MQTT simulator:"
echo "   cd mqtt-simulator && npm start"
echo ""
echo "For detailed instructions, see SETUP.md"

