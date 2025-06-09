# Use Node.js LTS version
FROM node:20-slim

# Install latest chrome dev package and fonts to support major charsets
RUN apt-get update \
    && apt-get install -y wget gnupg curl \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Install MongoDB
RUN apt-get update \
    && apt-get install -y gnupg curl \
    && curl -fsSL https://pgp.mongodb.com/server-6.0.asc | gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor \
    && echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list \
    && apt-get update \
    && apt-get install -y mongodb-org \
    && mkdir -p /data/db \
    && chown -R mongodb:mongodb /data/db \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source
COPY . .

# Create startup script
RUN echo '#!/bin/bash\n\
# Start MongoDB\n\
mongod --fork --logpath /var/log/mongodb.log\n\
\n\
# Wait for MongoDB to start\n\
sleep 5\n\
\n\
# Start the Node.js application\n\
npm start' > /usr/src/app/start.sh \
    && chmod +x /usr/src/app/start.sh

# Create logs directory
RUN mkdir -p /usr/src/app/logs

# Expose the ports
EXPOSE 3000 27017

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    MONGODB_URI=mongodb://localhost:27017/jewflix \
    API_BASE_URL=http://localhost:3000/api \
    SCRAPER_BATCH_SIZE=50 \
    MAX_CONCURRENT_PAGES=10 \
    DELAY_BETWEEN_BATCHES=100 \
    PAGE_TIMEOUT=10000 \
    DB_BATCH_SIZE=100

# Start both MongoDB and Node.js application
CMD ["/usr/src/app/start.sh"] 