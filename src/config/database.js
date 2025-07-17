// src/config/database.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

// Validate and clean up MongoDB URI
function validateAndCleanMongoURI(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI environment variable is required');
  }

  // Remove trailing ampersand if present
  uri = uri.replace(/&$/, '');

  // Check if it's an Atlas connection string without database name
  if (uri.includes('mongodb+srv://') && !uri.includes('/?') && !uri.includes('.net/')) {
    // If it ends with .mongodb.net, add database name
    if (uri.endsWith('.mongodb.net')) {
      uri += '/jewelflix';
    }
  }

  // Ensure required parameters for Atlas
  if (uri.includes('mongodb+srv://')) {
    const url = new URL(uri.replace('mongodb+srv://', 'https://'));
    const searchParams = new URLSearchParams(url.search);
    
    // Add required parameters if missing
    if (!searchParams.has('retryWrites')) {
      searchParams.set('retryWrites', 'true');
    }
    if (!searchParams.has('w')) {
      searchParams.set('w', 'majority');
    }
    if (!searchParams.has('ssl')) {
      searchParams.set('ssl', 'true');
    }
    
    // Reconstruct the URI
    uri = `mongodb+srv://${url.username}:${url.password}@${url.hostname}${url.pathname}?${searchParams.toString()}`;
  }

  return uri;
}

const connectDB = async () => {
  try {
    // Validate and clean the MongoDB URI
    const mongoURI = validateAndCleanMongoURI(process.env.MONGODB_URI);
    
    console.log('🔄 Connecting to MongoDB...');
    console.log(`🌐 Database URI: ${mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`); // Hide credentials in logs
    
    // Enhanced connection options for MongoDB Atlas
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT) || 30000,
      socketTimeoutMS: parseInt(process.env.MONGODB_SOCKET_TIMEOUT) || 45000,
      connectTimeoutMS: parseInt(process.env.MONGODB_CONNECT_TIMEOUT) || 30000,
      maxPoolSize: parseInt(process.env.MONGODB_MAX_POOL_SIZE) || 50,
      minPoolSize: parseInt(process.env.MONGODB_MIN_POOL_SIZE) || 5,
      keepAlive: true,
      keepAliveInitialDelay: 300000,
      // Retry configuration for Atlas
      retryWrites: true,
      w: 'majority',
      // Additional Atlas-specific options
      ssl: true,
      authSource: 'admin'
    };

    await mongoose.connect(mongoURI, options);
    
    console.log('✅ MongoDB connected successfully');
    
    // Log connection details (without sensitive info)
    const connection = mongoose.connection;
    console.log(`📊 Database: ${connection.name}`);
    console.log(`🌐 Host: ${connection.host}`);
    console.log(`📝 Ready state: ${connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
    
    // Test the connection by listing collections
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`📁 Available collections: ${collections.map(c => c.name).join(', ') || 'None (will be created when data is inserted)'}`);
    } catch (err) {
      console.warn('⚠️ Could not list collections:', err.message);
    }
    
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    
    // More detailed error logging for Atlas connections
    if (err.message.includes('authentication') || err.message.includes('auth')) {
      console.error('🔐 Authentication failed. Please check:');
      console.error('   - Username and password are correct');
      console.error('   - User has proper permissions (readWrite)');
      console.error('   - Database user is created in Atlas');
    } else if (err.message.includes('network') || err.message.includes('ENOTFOUND')) {
      console.error('🌐 Network error. Please check:');
      console.error('   - Internet connection is working');
      console.error('   - Atlas cluster is running');
      console.error('   - Network access is configured in Atlas (IP whitelist)');
    } else if (err.message.includes('timeout')) {
      console.error('⏰ Connection timeout. Please check:');
      console.error('   - Network connectivity');
      console.error('   - Atlas cluster status');
      console.error('   - IP address is whitelisted in Atlas');
    } else if (err.message.includes('URI')) {
      console.error('🔗 URI format error. Please check:');
      console.error('   - Connection string format is correct');
      console.error('   - All special characters in password are URL encoded');
      console.error('   - Database name is included in the URI');
    }
    
    console.error('\n💡 Troubleshooting tips:');
    console.error('   1. Verify your Atlas cluster is running');
    console.error('   2. Check Network Access in Atlas (add 0.0.0.0/0 for testing)');
    console.error('   3. Verify database user credentials');
    console.error('   4. Ensure the database name is in your connection string');
    
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('connected', () => {
  console.log('✅ Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ Mongoose disconnected from MongoDB');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔄 Mongoose reconnected to MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await mongoose.connection.close();
    console.log('📱 Mongoose connection closed due to app termination');
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
  }
  process.exit(0);
});

export default connectDB; 