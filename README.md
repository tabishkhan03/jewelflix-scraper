# Jewelflix Scraper

A Node.js application for scraping customer cart and wishlist data from Jewelflix.

## GitHub Repository

The source code is available on GitHub:
[tabishkhan03/jewelflix-scraper](https://github.com/tabishkhan03/jewelflix-scraper)

## Docker Image

The application is available as a Docker image on Docker Hub:
[tabishkhan03/jewelflix-scraper](https://hub.docker.com/r/tabishkhan03/jewelflix-scraper)

## Database Options

This application supports both local MongoDB and **MongoDB Atlas (recommended for production)**.

### Option 1: MongoDB Atlas (Recommended)

1. Create a free MongoDB Atlas account at [https://www.mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Create a new cluster (M0 free tier is sufficient for testing)
3. Set up network access (add your IP or use 0.0.0.0/0 for cloud deployment)
4. Create a database user with read/write permissions
5. Get your connection string from the Atlas dashboard

### Option 2: Local MongoDB

1. Install MongoDB locally
2. Start the MongoDB service
3. Use the default connection string: `mongodb://localhost:27017/jewelflix`

## Running Locally

1. Clone the repository:
```bash
git clone https://github.com/tabishkhan03/jewelflix-scraper.git
cd jewelflix-scraper
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with your configuration (see Environment Variables section below)

4. Start MongoDB (only if using local MongoDB):
```bash
# On Windows
net start MongoDB

# On macOS/Linux
sudo service mongod start
# or
mongod --dbpath /path/to/data/directory
```

5. Run the application:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The application will be available at http://localhost:3000

## Quick Start (Docker with MongoDB Atlas)

1. Pull the Docker image:
```bash
docker pull tabishkhan03/jewelflix-scraper
```

2. Create a `.env` file with your MongoDB Atlas configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# MongoDB Atlas Configuration (Recommended)
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/jewelflix?retryWrites=true&w=majority

# API Configuration
API_BASE_URL=http://localhost:3000/api

# Session Cookies (Required)
SESSION_COOKIE=your_session_cookie_here
LARAVEL_SESSION_COOKIE=your_laravel_session_cookie_here
LARAVEL_SESSION_COOKIE_NAME=your_laravel_session_cookie_name_here

# Scraper Configuration
SCRAPER_BATCH_SIZE=50
MAX_CONCURRENT_PAGES=10
DELAY_BETWEEN_BATCHES=100
PAGE_TIMEOUT=10000
DB_BATCH_SIZE=100

# MongoDB Atlas Connection Options (optional)
MONGODB_MAX_POOL_SIZE=50
MONGODB_MIN_POOL_SIZE=5
MONGODB_SERVER_SELECTION_TIMEOUT=30000
MONGODB_SOCKET_TIMEOUT=45000
MONGODB_CONNECT_TIMEOUT=30000
```

3. Run the container (simplified for Atlas - no MongoDB container needed):
```bash
docker run -d \
    --name jewflix-scraper \
    -p 3000:3000 \
    -v $(pwd)/logs:/usr/src/app/logs \
    --env-file .env \
    --restart unless-stopped \
    tabishkhan03/jewelflix-scraper
```

## Quick Start (Docker with Local MongoDB)

If you prefer to use local MongoDB:

```bash
docker run -d \
    --name jewflix-scraper \
    -p 3000:3000 \
    -p 27017:27017 \
    -v $(pwd)/logs:/usr/src/app/logs \
    -v mongodb_data:/data/db \
    --env-file .env \
    --restart unless-stopped \
    tabishkhan03/jewelflix-scraper
```

## Features

- Scrapes customer cart and wishlist data
- Runs scheduled tasks daily at 5:51 PM
- Supports MongoDB Atlas and local MongoDB
- Automatic restart on failure
- Persistent storage for logs
- Environment variable configuration
- Shared database access for multiple applications

## API Endpoints

- Health Check: `GET /api/health`
- Stats: `GET /api/stats`
- Cart Data: `GET /api/cart?limit=10`
- Wishlist Data: `GET /api/wishlist?limit=10`
- Combined Data: `GET /api/customers/all/both`
- Manual Trigger: `POST /api/trigger-sequence`
- Single Customer Cart: `GET /api/customer/:customerId/cart`
- Single Customer Wishlist: `GET /api/customer/:customerId/wishlist`

## Container Management

### View Logs
```bash
docker logs -f jewflix-scraper
```

### Stop Container
```bash
docker stop jewflix-scraper
```

### Start Container
```bash
docker start jewflix-scraper
```

### Restart Container
```bash
docker restart jewflix-scraper
```

### Remove Container
```bash
docker rm -f jewflix-scraper
```

## Scheduled Tasks

The application automatically runs these tasks daily at 5:51 PM:
1. Scrape cart data for all customers
2. Scrape wishlist data for all customers
3. Scrape combined data for all customers

You can also manually trigger the sequence using:
```bash
curl -X POST http://localhost:3000/api/trigger-sequence
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| MONGODB_URI | MongoDB connection string (Atlas or local) | mongodb://localhost:27017/jewelflix |
| API_BASE_URL | Base URL for API | http://localhost:3000/api |
| SESSION_COOKIE | Required for authentication | - |
| LARAVEL_SESSION_COOKIE | Required for authentication | - |
| LARAVEL_SESSION_COOKIE_NAME | Required for authentication | - |
| SCRAPER_BATCH_SIZE | Number of customers to process in batch | 50 |
| MAX_CONCURRENT_PAGES | Maximum concurrent browser pages | 10 |
| DELAY_BETWEEN_BATCHES | Delay between batches in ms | 100 |
| PAGE_TIMEOUT | Page load timeout in ms | 10000 |
| DB_BATCH_SIZE | Database batch size | 100 |

### MongoDB Atlas Specific Variables (Optional)

| Variable | Description | Default |
|----------|-------------|---------|
| MONGODB_MAX_POOL_SIZE | Maximum connection pool size | 50 |
| MONGODB_MIN_POOL_SIZE | Minimum connection pool size | 5 |
| MONGODB_SERVER_SELECTION_TIMEOUT | Server selection timeout (ms) | 30000 |
| MONGODB_SOCKET_TIMEOUT | Socket timeout (ms) | 45000 |
| MONGODB_CONNECT_TIMEOUT | Connection timeout (ms) | 30000 |

## Accessing Data from Other Applications

Since you're using MongoDB Atlas, other applications can easily connect to the same database:

### Connection String Format
```
mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/jewelflix?retryWrites=true&w=majority
```

### Example Collections
- `customers` - Contains customer data with cart and wishlist items
- Customer document structure:
```json
{
  "customerId": "12345",
  "customerName": "John Doe",
  "customerNumber": "CUST001",
  "cart": {
    "items": [...],
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  },
  "wishlist": {
    "items": [...],
    "lastUpdated": "2024-01-01T00:00:00.000Z"
  }
}
```

## Development

### Building from Source

1. Clone the repository:
```bash
git clone https://github.com/tabishkhan03/jewelflix-scraper.git
cd jewelflix-scraper
```

2. Build the Docker image:
```bash
docker build -t jewflix-scraper .
```

3. Run the container:
```bash
docker run -d \
    --name jewflix-scraper \
    -p 3000:3000 \
    -v $(pwd)/logs:/usr/src/app/logs \
    --env-file .env \
    --restart unless-stopped \
    jewflix-scraper
```

## Deployment Considerations

### For Production with MongoDB Atlas:
- Use connection string with proper authentication
- Set up IP whitelisting in Atlas (or use 0.0.0.0/0 for cloud deployment)
- Enable retryWrites and use majority write concern
- Monitor connection pool usage
- Set appropriate timeouts for your network conditions

### For Multiple Applications:
- All applications can use the same MongoDB Atlas connection string
- Use different collections or databases if needed
- Implement proper indexing for query performance
- Consider read preferences for read-heavy applications

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

[Tabish Khan](https://github.com/tabishkhan03)