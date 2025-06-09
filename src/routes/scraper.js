import express from 'express';
import { scrapeCartForCustomers, scrapeWishlistForCustomers, scrapeBothForCustomers } from '../services/scraper.js';
import { triggerSequence } from '../services/scheduler.js';
import Customer from '../models/Customer.js';

const router = express.Router();

// Configuration
const DB_BATCH_SIZE = parseInt(process.env.DB_BATCH_SIZE) || 100;

// Performance monitoring helper
class PerformanceMonitor {
  constructor(operation) {
    this.operation = operation;
    this.startTime = Date.now();
    this.memoryStart = process.memoryUsage();
  }

  finish(dataLength = 0) {
    const endTime = Date.now();
    const memoryEnd = process.memoryUsage();
    const duration = endTime - this.startTime;
    const memoryDiff = {
      rss: ((memoryEnd.rss - this.memoryStart.rss) / 1024 / 1024).toFixed(2),
      heapUsed: ((memoryEnd.heapUsed - this.memoryStart.heapUsed) / 1024 / 1024).toFixed(2)
    };

    console.log(`⚡ ${this.operation} Performance:`);
    console.log(`   Duration: ${duration}ms (${(duration/1000).toFixed(2)}s)`);
    console.log(`   Items: ${dataLength}`);
    console.log(`   Rate: ${dataLength > 0 ? (dataLength / (duration/1000)).toFixed(2) : 0} items/sec`);
    console.log(`   Memory: RSS +${memoryDiff.rss}MB, Heap +${memoryDiff.heapUsed}MB`);

    return {
      duration,
      itemsPerSecond: dataLength > 0 ? parseFloat((dataLength / (duration/1000)).toFixed(2)) : 0,
      memoryUsage: memoryDiff
    };
  }
}

// Optimized batch database operations with progress tracking
async function batchUpdateCustomers(customerDataArray, type) {
  if (!customerDataArray || customerDataArray.length === 0) {
    console.log('📝 No data to update in database');
    return;
  }

  console.log(`📝 Starting database batch update for ${customerDataArray.length} customers (type: ${type})`);
  const monitor = new PerformanceMonitor(`Database Update - ${type}`);
  
  try {
    // Process in chunks to avoid memory issues
    const chunks = [];
    for (let i = 0; i < customerDataArray.length; i += DB_BATCH_SIZE) {
      chunks.push(customerDataArray.slice(i, i + DB_BATCH_SIZE));
    }

    let totalProcessed = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📊 Processing DB chunk ${i + 1}/${chunks.length} (${chunk.length} items)`);
      
      const bulkOps = chunk.map(customerData => ({
        updateOne: {
          filter: { customerId: customerData.customerId },
          update: {
            $set: {
              customerName: customerData.customerName,
              customerNumber: customerData.customerNumber,
              [`${type}.items`]: customerData[type].items,
              [`${type}.lastUpdated`]: new Date()
            }
          },
          upsert: true
        }
      }));

      await Customer.bulkWrite(bulkOps);
      totalProcessed += chunk.length;
      console.log(`✅ Updated ${totalProcessed}/${customerDataArray.length} customers`);
    }

    const stats = monitor.finish(customerDataArray.length);
    console.log(`🎉 Database update completed successfully`);
    return stats;
    
  } catch (error) {
    console.error('❌ Database batch update failed:', error);
    throw error;
  }
}

// Optimized batch update for both types
async function batchUpdateBothTypes(customerDataArray) {
  if (!customerDataArray || customerDataArray.length === 0) {
    console.log('📝 No data to update in database');
    return;
  }

  console.log(`📝 Starting database batch update for ${customerDataArray.length} customers (both types)`);
  const monitor = new PerformanceMonitor('Database Update - Both Types');
  
  try {
    const chunks = [];
    for (let i = 0; i < customerDataArray.length; i += DB_BATCH_SIZE) {
      chunks.push(customerDataArray.slice(i, i + DB_BATCH_SIZE));
    }

    let totalProcessed = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      console.log(`📊 Processing DB chunk ${i + 1}/${chunks.length} (${chunk.length} items)`);
      
      const bulkOps = chunk.map(customerData => {
        const updateFields = {
          customerName: customerData.customerName,
          customerNumber: customerData.customerNumber,
        };

        if (customerData.cart) {
          updateFields['cart.items'] = customerData.cart.items;
          updateFields['cart.lastUpdated'] = new Date();
        }

        if (customerData.wishlist) {
          updateFields['wishlist.items'] = customerData.wishlist.items;
          updateFields['wishlist.lastUpdated'] = new Date();
        }

        return {
          updateOne: {
            filter: { customerId: customerData.customerId },
            update: { $set: updateFields },
            upsert: true
          }
        };
      });

      await Customer.bulkWrite(bulkOps);
      totalProcessed += chunk.length;
      console.log(`✅ Updated ${totalProcessed}/${customerDataArray.length} customers`);
    }

    const stats = monitor.finish(customerDataArray.length);
    console.log(`🎉 Database update completed successfully`);
    return stats;
    
  } catch (error) {
    console.error('❌ Database batch update failed:', error);
    throw error;
  }
}

// Middleware for request logging
router.use((req, res, next) => {
  console.log(`🌐 ${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// Add connection timeout middleware
const timeoutMiddleware = (req, res, next) => {
  req.setTimeout(300000); // 5 minutes
  res.setTimeout(300000);
  next();
};

// Apply timeout middleware to all routes
router.use(timeoutMiddleware);

// GET /api/cart?limit=5
router.get('/cart', async (req, res) => {
  const monitor = new PerformanceMonitor('Cart Scraping API');
  
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    
    console.log(`🛒 Starting cart scraping API for ${limit || 'all'} customers...`);
    const cartData = await scrapeCartForCustomers(limit);
    
    // Batch update database
    const dbStats = await batchUpdateCustomers(cartData, 'cart');
    const apiStats = monitor.finish(cartData.length);
    
    res.json({ 
      success: true, 
      message: 'Cart data updated successfully', 
      data: cartData,
      stats: {
        totalCustomers: cartData.length,
        scraping: {
          duration: `${apiStats.duration}ms`,
          itemsPerSecond: apiStats.itemsPerSecond
        },
        database: {
          duration: `${dbStats?.duration || 0}ms`,
          itemsPerSecond: dbStats?.itemsPerSecond || 0
        },
        memory: apiStats.memoryUsage
      }
    });
  } catch (error) {
    console.error('❌ Error in cart API:', error);
    res.status(500).json({ 
      error: error.message,
      duration: `${Date.now() - monitor.startTime}ms`
    });
  }
});

// GET /api/wishlist?limit=5
router.get('/wishlist', async (req, res) => {
  const monitor = new PerformanceMonitor('Wishlist Scraping API');
  
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    
    console.log(`💝 Starting wishlist scraping API for ${limit || 'all'} customers...`);
    const wishlistData = await scrapeWishlistForCustomers(limit);
    
    // Batch update database
    const dbStats = await batchUpdateCustomers(wishlistData, 'wishlist');
    const apiStats = monitor.finish(wishlistData.length);
    
    res.json({ 
      success: true, 
      message: 'Wishlist data updated successfully', 
      data: wishlistData,
      stats: {
        totalCustomers: wishlistData.length,
        scraping: {
          duration: `${apiStats.duration}ms`,
          itemsPerSecond: apiStats.itemsPerSecond
        },
        database: {
          duration: `${dbStats?.duration || 0}ms`,
          itemsPerSecond: dbStats?.itemsPerSecond || 0
        },
        memory: apiStats.memoryUsage
      }
    });
  } catch (error) {
    console.error('❌ Error in wishlist API:', error);
    res.status(500).json({ 
      error: error.message,
      duration: `${Date.now() - monitor.startTime}ms`
    });
  }
});

// GET /api/customer/:customerId/cart - Get cart data for a specific customer
router.get('/customer/:customerId/cart', async (req, res) => {
  const monitor = new PerformanceMonitor('Single Customer Cart');
  
  try {
    const { customerId } = req.params;
    
    // Check if we have fresh data (less than 1 hour old)
    let customer = await Customer.findOne({ customerId });
    
    if (!customer || !customer.cart?.lastUpdated || 
        (Date.now() - customer.cart.lastUpdated.getTime() > 3600000)) {
      
      console.log(`🔄 Scraping fresh cart data for customer ${customerId}...`);
      const cartData = await scrapeCartForCustomers(1, customerId);
      
      if (cartData && cartData.length > 0) {
        await batchUpdateCustomers(cartData, 'cart');
        customer = await Customer.findOne({ customerId });
      }
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const stats = monitor.finish(1);
    
    res.json({
      success: true,
      data: {
        customerId: customer.customerId,
        customerName: customer.customerName,
        customerNumber: customer.customerNumber,
        cart: customer.cart
      },
      stats: {
        duration: `${stats.duration}ms`,
        fromCache: customer.cart?.lastUpdated && (Date.now() - customer.cart.lastUpdated.getTime() < 3600000)
      }
    });
  } catch (error) {
    console.error('❌ Error getting customer cart:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customer/:customerId/wishlist - Get wishlist data for a specific customer
router.get('/customer/:customerId/wishlist', async (req, res) => {
  const monitor = new PerformanceMonitor('Single Customer Wishlist');
  
  try {
    const { customerId } = req.params;
    
    let customer = await Customer.findOne({ customerId });
    
    if (!customer || !customer.wishlist?.lastUpdated || 
        (Date.now() - customer.wishlist.lastUpdated.getTime() > 3600000)) {
      
      console.log(`🔄 Scraping fresh wishlist data for customer ${customerId}...`);
      const wishlistData = await scrapeWishlistForCustomers(1, customerId);
      
      if (wishlistData && wishlistData.length > 0) {
        await batchUpdateCustomers(wishlistData, 'wishlist');
        customer = await Customer.findOne({ customerId });
      }
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const stats = monitor.finish(1);
    
    res.json({
      success: true,
      data: {
        customerId: customer.customerId,
        customerName: customer.customerName,
        customerNumber: customer.customerNumber,
        wishlist: customer.wishlist
      },
      stats: {
        duration: `${stats.duration}ms`,
        fromCache: customer.wishlist?.lastUpdated && (Date.now() - customer.wishlist.lastUpdated.getTime() < 3600000)
      }
    });
  } catch (error) {
    console.error('❌ Error getting customer wishlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/all/cart - Get cart data for all customers
router.get('/customers/all/cart', async (req, res) => {
  const monitor = new PerformanceMonitor('All Customers Cart');
  
  try {
    console.log('🛒 Starting full cart scraping for all customers...');
    const cartData = await scrapeCartForCustomers(null);
    
    // Batch update database
    const dbStats = await batchUpdateCustomers(cartData, 'cart');
    const apiStats = monitor.finish(cartData.length);
    
    res.json({
      success: true,
      message: 'All customers cart data updated successfully',
      data: cartData,
      stats: {
        totalCustomers: cartData.length,
        scraping: {
          duration: `${apiStats.duration}ms`,
          itemsPerSecond: apiStats.itemsPerSecond
        },
        database: {
          duration: `${dbStats?.duration || 0}ms`,
          itemsPerSecond: dbStats?.itemsPerSecond || 0
        },
        memory: apiStats.memoryUsage
      }
    });
  } catch (error) {
    console.error('❌ Error scraping all customers cart:', error);
    res.status(500).json({ 
      error: error.message,
      duration: `${Date.now() - monitor.startTime}ms`
    });
  }
});

// GET /api/customers/all/wishlist - Get wishlist data for all customers
router.get('/customers/all/wishlist', async (req, res) => {
  const monitor = new PerformanceMonitor('All Customers Wishlist');
  
  try {
    console.log('💝 Starting full wishlist scraping for all customers...');
    const wishlistData = await scrapeWishlistForCustomers(null);
    
    // Batch update database
    const dbStats = await batchUpdateCustomers(wishlistData, 'wishlist');
    const apiStats = monitor.finish(wishlistData.length);
    
    res.json({
      success: true,
      message: 'All customers wishlist data updated successfully',
      data: wishlistData,
      stats: {
        totalCustomers: wishlistData.length,
        scraping: {
          duration: `${apiStats.duration}ms`,
          itemsPerSecond: apiStats.itemsPerSecond
        },
        database: {
          duration: `${dbStats?.duration || 0}ms`,
          itemsPerSecond: dbStats?.itemsPerSecond || 0
        },
        memory: apiStats.memoryUsage
      }
    });
  } catch (error) {
    console.error('❌ Error scraping all customers wishlist:', error);
    res.status(500).json({ 
      error: error.message,
      duration: `${Date.now() - monitor.startTime}ms`
    });
  }
});

// GET /api/customers/all/both - Get both cart and wishlist data for all customers
router.get('/customers/all/both', async (req, res) => {
  const monitor = new PerformanceMonitor('All Customers Combined');
  
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    
    console.log(`🔄 Starting combined scraping for ${limit || 'all'} customers...`);
    const combinedData = await scrapeBothForCustomers(null, limit);
    
    // Batch update database with both types
    const dbStats = await batchUpdateBothTypes(combinedData);
    const apiStats = monitor.finish(combinedData.length);
    
    res.json({
      success: true,
      message: 'All customers data (cart & wishlist) updated successfully',
      data: combinedData,
      stats: {
        totalCustomers: combinedData.length,
        scraping: {
          duration: `${apiStats.duration}ms`,
          itemsPerSecond: apiStats.itemsPerSecond
        },
        database: {
          duration: `${dbStats?.duration || 0}ms`,
          itemsPerSecond: dbStats?.itemsPerSecond || 0
        },
        memory: apiStats.memoryUsage
      }
    });
  } catch (error) {
    console.error('❌ Error scraping combined data:', error);
    res.status(500).json({ 
      error: error.message,
      duration: `${Date.now() - monitor.startTime}ms`
    });
  }
});

// POST /api/customers/all/both - Trigger combined scraping for all customers
router.post('/customers/all/both', async (req, res) => {
  const monitor = new PerformanceMonitor('All Customers Combined (POST)');
  
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    
    console.log(`🔄 Starting combined scraping for ${limit || 'all'} customers...`);
    const combinedData = await scrapeBothForCustomers(null, limit);
    
    // Batch update database with both types
    const dbStats = await batchUpdateBothTypes(combinedData);
    const apiStats = monitor.finish(combinedData.length);
    
    res.json({
      success: true,
      message: 'All customers data (cart & wishlist) updated successfully',
      data: combinedData,
      stats: {
        totalCustomers: combinedData.length,
        scraping: {
          duration: `${apiStats.duration}ms`,
          itemsPerSecond: apiStats.itemsPerSecond
        },
        database: {
          duration: `${dbStats?.duration || 0}ms`,
          itemsPerSecond: dbStats?.itemsPerSecond || 0
        },
        memory: apiStats.memoryUsage
      }
    });
  } catch (error) {
    console.error('❌ Error scraping combined data:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      duration: `${Date.now() - monitor.startTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/health - Health check endpoint with system info
router.get('/health', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  res.json({
    success: true,
    message: 'Scraper service is running',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    },
    configuration: {
      batchSize: process.env.SCRAPER_BATCH_SIZE || 'default (50)',
      maxConcurrentPages: process.env.MAX_CONCURRENT_PAGES || 'default (10)',
      dbBatchSize: process.env.DB_BATCH_SIZE || 'default (100)',
      delayBetweenBatches: process.env.DELAY_BETWEEN_BATCHES || 'default (100ms)'
    }
  });
});

// GET /api/stats - Performance statistics endpoint
router.get('/stats', async (req, res) => {
  try {
    const customerCount = await Customer.countDocuments();
    const cartCount = await Customer.countDocuments({ 'cart.items': { $exists: true, $not: { $size: 0 } } });
    const wishlistCount = await Customer.countDocuments({ 'wishlist.items': { $exists: true, $not: { $size: 0 } } });
    
    // Get recent updates
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentCartUpdates = await Customer.countDocuments({ 'cart.lastUpdated': { $gte: oneHourAgo } });
    const recentWishlistUpdates = await Customer.countDocuments({ 'wishlist.lastUpdated': { $gte: oneHourAgo } });
    
    res.json({
      success: true,
      database: {
        totalCustomers: customerCount,
        customersWithCart: cartCount,
        customersWithWishlist: wishlistCount,
        recentUpdates: {
          cart: recentCartUpdates,
          wishlist: recentWishlistUpdates,
          timeframe: 'last 1 hour'
        }
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: `${Math.floor(process.uptime() / 60)}m ${Math.floor(process.uptime() % 60)}s`
      }
    });
  } catch (error) {
    console.error('❌ Error getting stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/trigger-sequence - Manually trigger the sequence
router.post('/trigger-sequence', async (req, res) => {
  const monitor = new PerformanceMonitor('Manual Sequence Trigger');
  
  try {
    console.log('🔄 Starting manual sequence trigger...');
    
    // Step 1: Scrape cart data
    console.log('🛒 Scraping cart data...');
    const cartData = await scrapeCartForCustomers(null);
    await batchUpdateCustomers(cartData, 'cart');
    
    // Step 2: Scrape wishlist data
    console.log('💝 Scraping wishlist data...');
    const wishlistData = await scrapeWishlistForCustomers(null);
    await batchUpdateCustomers(wishlistData, 'wishlist');
    
    // Step 3: Scrape combined data
    console.log('🔄 Scraping combined data...');
    const combinedData = await scrapeBothForCustomers(null);
    await batchUpdateBothTypes(combinedData);
    
    const stats = monitor.finish(1);
    
    res.json({
      success: true,
      message: 'Sequence executed successfully',
      stats: {
        duration: `${stats.duration}ms`,
        memory: stats.memoryUsage
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error triggering sequence:', error);
    res.status(500).json({ 
      success: false,
      error: error.message,
      duration: `${Date.now() - monitor.startTime}ms`,
      timestamp: new Date().toISOString()
    });
  }
});

// Add error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('❌ Route Error:', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    timestamp: new Date().toISOString()
  });
};

// Apply error handler to all routes
router.use(errorHandler);

export default router;