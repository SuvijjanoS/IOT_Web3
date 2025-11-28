FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Expose port
EXPOSE 3001

# Run database migration and start server
CMD ["sh", "-c", "node src/db/migrate.js && node src/index.js"]

