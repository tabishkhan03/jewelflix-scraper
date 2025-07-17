// test-connection.js
// Test script to verify MongoDB Atlas connection and data operations

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Customer from './src/models/Customer.js';

dotenv.config();

// Your current connection string (with issues fixed)
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://navya-aabharan:navya@navya-aabharan.1wistst.mongodb.net/jewelflix?retryWrites=true&w=majority&ssl=true';

console.log('🧪 Starting MongoDB Atlas Connection Test...\n');

async function testConnection() {
  try {
    // Step 1: Connect to MongoDB
    console.log('📡 Step 1: Connecting to MongoDB Atlas...');
    console.log(`🔗 Using URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
    
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
      ssl: true,
      authSource: 'admin'
    });
    
    console.log('✅ Connected successfully!\n');

    // Step 2: Test database operations
    console.log('📊 Step 2: Testing database operations...');
    
    // Get database info
    const db = mongoose.connection.db;
    const dbName = mongoose.connection.name;
    console.log(`📚 Connected to database: ${dbName}`);
    
    // List existing collections
    const collections = await db.listCollections().toArray();
    console.log(`📁 Existing collections: ${collections.map(c => c.name).join(', ') || 'None'}`);
    
    // Step 3: Test data insertion
    console.log('\n💾 Step 3: Testing data insertion...');
    
    // Create a test customer
    const testCustomer = new Customer({
      customerId: 'TEST_001',
      customerName: 'Test Customer',
      customerNumber: 'TEST_CUST_001',
      cart: {
        items: [
          {
            productId: 'PROD_001',
            name: 'Test Product',
            price: 99.99,
            quantity: 1,
            image: 'https://example.com/image.jpg'
          }
        ],
        lastUpdated: new Date()
      },
      wishlist: {
        items: [
          {
            productId: 'PROD_002',
            name: 'Wishlist Product',
            price: 199.99,
            image: 'https://example.com/wishlist.jpg'
          }
        ],
        lastUpdated: new Date()
      }
    });

    // Save the test customer
    const savedCustomer = await testCustomer.save();
    console.log(`✅ Test customer saved with ID: ${savedCustomer._id}`);
    
    // Step 4: Test data retrieval
    console.log('\n🔍 Step 4: Testing data retrieval...');
    
    const retrievedCustomer = await Customer.findOne({ customerId: 'TEST_001' });
    if (retrievedCustomer) {
      console.log(`✅ Customer retrieved: ${retrievedCustomer.customerName}`);
      console.log(`🛒 Cart items: ${retrievedCustomer.cart.items.length}`);
      console.log(`💝 Wishlist items: ${retrievedCustomer.wishlist.items.length}`);
    } else {
      console.log('❌ Could not retrieve test customer');
    }
    
    // Step 5: Get database statistics
    console.log('\n📈 Step 5: Database statistics...');
    
    const customerCount = await Customer.countDocuments();
    console.log(`👥 Total customers in database: ${customerCount}`);
    
    const customersWithCart = await Customer.countDocuments({
      'cart.items': { $exists: true, $not: { $size: 0 } }
    });
    console.log(`🛒 Customers with cart items: ${customersWithCart}`);
    
    const customersWithWishlist = await Customer.countDocuments({
      'wishlist.items': { $exists: true, $not: { $size: 0 } }
    });
    console.log(`💝 Customers with wishlist items: ${customersWithWishlist}`);
    
    // Step 6: Clean up test data
    console.log('\n🧹 Step 6: Cleaning up test data...');
    await Customer.deleteOne({ customerId: 'TEST_001' });
    console.log('✅ Test customer deleted');
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n💡 Your MongoDB Atlas connection is working properly.');
    console.log('   If your scraper data is not showing up, the issue might be:');
    console.log('   1. The scraper is not running');
    console.log('   2. The scraper is encountering errors during execution');
    console.log('   3. The scraper is connected to a different database');
    console.log('\n🚀 Try running your scraper now with: npm start');
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('\n🔐 Authentication Error Solutions:');
      console.error('   1. Check your username and password in the connection string');
      console.error('   2. Verify the database user exists in Atlas');
      console.error('   3. Ensure the user has readWrite permissions');
      console.error('   4. Try creating a new database user in Atlas');
    } else if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      console.error('\n🌐 Network Error Solutions:');
      console.error('   1. Check your internet connection');
      console.error('   2. Verify the cluster URL is correct');
      console.error('   3. Add 0.0.0.0/0 to Network Access in Atlas (for testing)');
      console.error('   4. Check if your ISP blocks MongoDB ports');
    } else if (error.message.includes('timeout')) {
      console.error('\n⏰ Timeout Error Solutions:');
      console.error('   1. Check Network Access settings in Atlas');
      console.error('   2. Verify your IP is whitelisted');
      console.error('   3. Try connecting from a different network');
      console.error('   4. Ensure your Atlas cluster is running');
    }
    
    console.error('\n🔧 General troubleshooting:');
    console.error('   1. Go to Atlas dashboard and check cluster status');
    console.error('   2. Test connection from Atlas dashboard');
    console.error('   3. Verify your connection string format');
  } finally {
    // Close connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('\n📱 Connection closed');
    }
  }
}

// Run the test
testConnection().catch(console.error); 