import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/database.js';
import scraperRoutes from './routes/scraper.js';
import { initializeScheduler } from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Increase timeout and add proper error handling
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Add request timeout
app.use((req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
});

// Add health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use('/api', scraperRoutes);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});

// Initialize database and start server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Initialize the scheduler
    initializeScheduler();
  });

  // Handle server errors
  server.on('error', (err) => {
    console.error('❌ Server Error:', err);
  });

  // Handle client connection errors
  server.on('connection', (socket) => {
    socket.setTimeout(300000); // 5 minutes
    socket.on('error', (err) => {
      console.error('❌ Socket Error:', err);
    });
  });
}); 