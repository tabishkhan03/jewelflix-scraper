import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/database.js';
import scraperRoutes from './routes/scraper.js';
import { initializeScheduler } from './services/scheduler.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', scraperRoutes);

// Initialize database and start server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    
    // Initialize the scheduler
    initializeScheduler();
  });
}); 