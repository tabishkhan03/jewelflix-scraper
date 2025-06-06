import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
import connectDB from './config/database.js';
import scraperRoutes from './routes/scraper.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api', scraperRoutes);

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 