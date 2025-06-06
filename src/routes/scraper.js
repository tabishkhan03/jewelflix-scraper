import express from 'express';
import { scrapeCartForCustomers, scrapeWishlistForCustomers } from '../services/scraper.js';
import Customer from '../models/Customer.js';

const router = express.Router();

// GET /api/cart?limit=5
router.get('/cart', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const cartData = await scrapeCartForCustomers(limit);
    
    // Update or insert cart data for each customer
    const updatePromises = cartData.map(customerData => {
      return Customer.findOneAndUpdate(
        { customerId: customerData.customerId },
        { 
          $set: { 
            customerName: customerData.customerName,
            customerNumber: customerData.customerNumber,
            'cart.items': customerData.cart.items,
            'cart.lastUpdated': new Date()
          }
        },
        { upsert: true, new: true }
      );
    });
    
    await Promise.all(updatePromises);
    res.json({ success: true, message: 'Cart data updated successfully', data: cartData });
  } catch (error) {
    console.error('Error scraping cart:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/wishlist?limit=5
router.get('/wishlist', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : null;
    const wishlistData = await scrapeWishlistForCustomers(limit);
    
    // Update or insert wishlist data for each customer
    const updatePromises = wishlistData.map(customerData => {
      return Customer.findOneAndUpdate(
        { customerId: customerData.customerId },
        { 
          $set: { 
            customerName: customerData.customerName,
            customerNumber: customerData.customerNumber,
            'wishlist.items': customerData.wishlist.items,
            'wishlist.lastUpdated': new Date()
          }
        },
        { upsert: true, new: true }
      );
    });
    
    await Promise.all(updatePromises);
    res.json({ success: true, message: 'Wishlist data updated successfully', data: wishlistData });
  } catch (error) {
    console.error('Error scraping wishlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customer/:customerId/cart - Get cart data for a specific customer
router.get('/customer/:customerId/cart', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // First check if we have the customer in our database
    let customer = await Customer.findOne({ customerId });
    
    // If customer doesn't exist or cart data is old (more than 1 hour), scrape new data
    if (!customer || !customer.cart?.lastUpdated || 
        (Date.now() - customer.cart.lastUpdated.getTime() > 3600000)) {
      const cartData = await scrapeCartForCustomers(1, customerId);
      if (cartData && cartData.length > 0) {
        customer = await Customer.findOneAndUpdate(
          { customerId },
          { 
            $set: { 
              customerName: cartData[0].customerName,
              customerNumber: cartData[0].customerNumber,
              'cart.items': cartData[0].cart.items,
              'cart.lastUpdated': new Date()
            }
          },
          { upsert: true, new: true }
        );
      }
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({
      success: true,
      data: {
        customerId: customer.customerId,
        customerName: customer.customerName,
        customerNumber: customer.customerNumber,
        cart: customer.cart
      }
    });
  } catch (error) {
    console.error('Error getting customer cart:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customer/:customerId/wishlist - Get wishlist data for a specific customer
router.get('/customer/:customerId/wishlist', async (req, res) => {
  try {
    const { customerId } = req.params;
    
    // First check if we have the customer in our database
    let customer = await Customer.findOne({ customerId });
    
    // If customer doesn't exist or wishlist data is old (more than 1 hour), scrape new data
    if (!customer || !customer.wishlist?.lastUpdated || 
        (Date.now() - customer.wishlist.lastUpdated.getTime() > 3600000)) {
      const wishlistData = await scrapeWishlistForCustomers(1, customerId);
      if (wishlistData && wishlistData.length > 0) {
        customer = await Customer.findOneAndUpdate(
          { customerId },
          { 
            $set: { 
              customerName: wishlistData[0].customerName,
              customerNumber: wishlistData[0].customerNumber,
              'wishlist.items': wishlistData[0].wishlist.items,
              'wishlist.lastUpdated': new Date()
            }
          },
          { upsert: true, new: true }
        );
      }
    }
    
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    res.json({
      success: true,
      data: {
        customerId: customer.customerId,
        customerName: customer.customerName,
        customerNumber: customer.customerNumber,
        wishlist: customer.wishlist
      }
    });
  } catch (error) {
    console.error('Error getting customer wishlist:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/all/cart - Get cart data for all customers
router.get('/customers/all/cart', async (req, res) => {
  try {
    // Get all customers from database
    const customers = await Customer.find({});
    
    // Scrape cart data for all customers
    const cartData = await scrapeCartForCustomers(null);
    
    // Update database with new cart data
    const updatePromises = cartData.map(customerData => {
      return Customer.findOneAndUpdate(
        { customerId: customerData.customerId },
        { 
          $set: { 
            customerName: customerData.customerName,
            customerNumber: customerData.customerNumber,
            'cart.items': customerData.cart.items,
            'cart.lastUpdated': new Date()
          }
        },
        { upsert: true, new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: 'All customers cart data updated successfully',
      totalCustomers: cartData.length,
      data: cartData
    });
  } catch (error) {
    console.error('Error scraping all customers cart:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/all/wishlist - Get wishlist data for all customers
router.get('/customers/all/wishlist', async (req, res) => {
  try {
    // Get all customers from database
    const customers = await Customer.find({});
    
    // Scrape wishlist data for all customers
    const wishlistData = await scrapeWishlistForCustomers(null);
    
    // Update database with new wishlist data
    const updatePromises = wishlistData.map(customerData => {
      return Customer.findOneAndUpdate(
        { customerId: customerData.customerId },
        { 
          $set: { 
            customerName: customerData.customerName,
            customerNumber: customerData.customerNumber,
            'wishlist.items': customerData.wishlist.items,
            'wishlist.lastUpdated': new Date()
          }
        },
        { upsert: true, new: true }
      );
    });
    
    await Promise.all(updatePromises);
    
    res.json({
      success: true,
      message: 'All customers wishlist data updated successfully',
      totalCustomers: wishlistData.length,
      data: wishlistData
    });
  } catch (error) {
    console.error('Error scraping all customers wishlist:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router; 