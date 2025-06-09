# Jewelflix Scraper

A Node.js application for scraping customer cart and wishlist data from Jewelflix.

## GitHub Repository

The source code is available on GitHub:
[tabishkhan03/jewelflix-scraper](https://github.com/tabishkhan03/jewelflix-scraper)

## Docker Image

The application is available as a Docker image on Docker Hub:
[tabishkhan03/jewelflix-scraper](https://hub.docker.com/r/tabishkhan03/jewelflix-scraper)

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

4. Start MongoDB (if not already running):
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

## Quick Start (Docker)

1. Pull the Docker image:
```bash
docker pull tabishkhan03/jewelflix-scraper
```

2. Create a `.env` file with your configuration:
```env
# Server Configuration
PORT=3000
NODE_ENV=production

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/jewflix

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
```

3. Run the container:
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
- Runs scheduled tasks daily at 2 AM
- Includes MongoDB database
- Automatic restart on failure
- Persistent storage for logs and data
- Environment variable configuration

## API Endpoints

- Health Check: `GET /api/health`
- Stats: `GET /api/stats`
- Cart Data: `GET /api/cart/all`
- Wishlist Data: `GET /api/wishlist/all`
- Combined Data: `GET /api/customers/all/both`
- Manual Trigger: `POST /api/trigger-sequence`

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

The application automatically runs these tasks daily at 2 AM:
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
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/jewflix |
| API_BASE_URL | Base URL for API | http://localhost:3000/api |
| SESSION_COOKIE | Required for authentication | - |
| LARAVEL_SESSION_COOKIE | Required for authentication | - |
| LARAVEL_SESSION_COOKIE_NAME | Required for authentication | - |
| SCRAPER_BATCH_SIZE | Number of customers to process in batch | 50 |
| MAX_CONCURRENT_PAGES | Maximum concurrent browser pages | 10 |
| DELAY_BETWEEN_BATCHES | Delay between batches in ms | 100 |
| PAGE_TIMEOUT | Page load timeout in ms | 10000 |
| DB_BATCH_SIZE | Database batch size | 100 |

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
    -p 27017:27017 \
    -v $(pwd)/logs:/usr/src/app/logs \
    -v mongodb_data:/data/db \
    --env-file .env \
    --restart unless-stopped \
    jewflix-scraper
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Author

[Tabish Khan](https://github.com/tabishkhan03)