// src/services/scheduler.js
import axios from 'axios';
import cron from 'node-cron';

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';

// Function to execute the sequence of API calls
async function executeSequence() {
  console.log('🔄 Starting scheduled sequence...');
  const startTime = Date.now();

  try {
    // Step 1: Call /api/cart (not /api/cart/all)
    console.log('🛒 Calling /api/cart...');
    await axios.get(`${BASE_URL}/cart`);
    console.log('✅ Cart API completed');

    // Step 2: Call /api/wishlist (not /api/wishlist/all)
    console.log('💝 Calling /api/wishlist...');
    await axios.get(`${BASE_URL}/wishlist`);
    console.log('✅ Wishlist API completed');

    // Step 3: Call /api/customers/all/both (this was correct)
    console.log('🔄 Calling /api/customers/all/both...');
    await axios.post(`${BASE_URL}/customers/all/both`);
    console.log('✅ Combined API completed');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 Sequence completed successfully in ${duration}s`);
  } catch (error) {
    console.error('❌ Error in scheduled sequence:', error.message);
    throw error;
  }
}

// Initialize the scheduler
export function initializeScheduler() {
  // Schedule to run at 6 PM every day
  cron.schedule('55 13 * * *', async () => {
    console.log('⏰ Running scheduled sequence...');
    try {
      await executeSequence();
    } catch (error) {
      console.error('❌ Scheduled sequence failed:', error.message);
    }
  });

  console.log('📅 Scheduler initialized - Will run daily at 6 PM');
}

// Function to manually trigger the sequence
export async function triggerSequence() {
  try {
    await executeSequence();
    return { success: true, message: 'Sequence executed successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
} 