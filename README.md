# Jewelflix Scraper

A Node.js application for scraping customer cart and wishlist data from Jewelflix.

## Features

- Scrape customer cart data
- Scrape wishlist data
- RESTful API endpoints
- MongoDB integration for data storage
- Puppeteer for web scraping

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/tabishkhan03/jewelflix-scraper.git
cd jewelflix-scraper
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file:
```bash
cp .sample.env .env
```

4. Update the `.env` file with your configuration values.

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/jewelflix

# Session Configuration
SESSION_COOKIE_NAME=your_session_cookie_name
SESSION_COOKIE=your_session_cookie_value
LARAVEL_SESSION_COOKIE_NAME=your_laravel_session_cookie_name
LARAVEL_SESSION_COOKIE=your_laravel_session_cookie_value

# Server Configuration
PORT=3000

# Scraper Configuration
SCRAPER_BATCH_SIZE=100        # Process 100 customers in parallel
MAX_CONCURRENT_PAGES=15       # Use 15 browser pages
DELAY_BETWEEN_BATCHES=200     # 200ms delay between batches
DB_BATCH_SIZE=150            # Database bulk operations size
```

### Environment Variables Description

- `MONGODB_URI`: MongoDB connection string
- `SESSION_COOKIE_NAME`: Name of the session cookie
- `SESSION_COOKIE`: Value of the session cookie
- `LARAVEL_SESSION_COOKIE_NAME`: Name of the Laravel session cookie
- `LARAVEL_SESSION_COOKIE`: Value of the Laravel session cookie
- `PORT`: Server port number
- `SCRAPER_BATCH_SIZE`: Number of customers to process in parallel
- `MAX_CONCURRENT_PAGES`: Maximum number of concurrent browser pages
- `DELAY_BETWEEN_BATCHES`: Delay in milliseconds between batch processing
- `DB_BATCH_SIZE`: Size of database bulk operations

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### API Endpoints

#### Cart Endpoints

1. Get Limited Cart Data
```bash
GET /api/cart?limit=5
```
Fetches cart data for a specified number of users (e.g., 5 users)

2. Get Customer Cart
```bash
GET /api/customer/:customerId/cart
```
Fetches cart items for a specific customer by their ID

3. Get All Customers Cart
```bash
GET /api/customer/all/cart
```
Fetches cart data for all customers

#### Wishlist Endpoints

4. Get Limited Wishlist Data
```bash
GET /api/wishlist?limit=5
```
Fetches wishlist data for a specified number of users (e.g., 5 users)

5. Get Customer Wishlist
```bash
GET /api/customer/:customerId/wishlist
```
Fetches wishlist items for a specific customer by their ID

6. Get All Customers Wishlist
```bash
GET /api/customer/all/wishlist
```
Fetches wishlist data for all customers

#### Combined Endpoint

7. Get All Customers Cart and Wishlist
```bash
GET /api/customer/all/both
```
Fetches both cart and wishlist data for all customers

#### Health Check
```bash
GET /health
```
Checks the health status of the API

## Testing

Run the test scraper:
```bash
npm test
```

Test cart endpoint:
```bash
npm run test:cart
```

Test wishlist endpoint:
```bash
npm run test:wishlist
```

Check health endpoint:
```bash
npm run health
```

## Dependencies

- express: Web framework
- mongoose: MongoDB ODM
- puppeteer: Headless browser for web scraping
- dotenv: Environment variable management
- cors: Cross-origin resource sharing
- nodemon: Development server with auto-reload

## License

MIT

## Author

[Tabish Khan](https://github.com/tabishkhan03) 