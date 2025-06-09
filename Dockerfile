# Use Node.js LTS version
FROM node:20-slim

# Install MongoDB
RUN apt-get update && apt-get install -y \
    gnupg \
    curl \
    && curl -fsSL https://pgp.mongodb.com/server-7.0.asc | \
       gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor \
    && echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update \
    && apt-get install -y mongodb-org \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create MongoDB data directory
RUN mkdir -p /data/db

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create startup script
RUN echo '#!/bin/bash\n\
mongod --bind_ip_all --fork --logpath /var/log/mongodb.log\n\
sleep 5\n\
node dist/index.js\n\
' > /app/start.sh && chmod +x /app/start.sh

# Expose ports
EXPOSE 3000 27017

# Start MongoDB and the application
CMD ["/app/start.sh"]