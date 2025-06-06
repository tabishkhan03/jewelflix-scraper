// monitor.js - Performance monitoring and testing script
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api'; // Adjust to your server URL

class ScraperMonitor {
  constructor() {
    this.results = [];
  }

  async testEndpoint(endpoint, description) {
    console.log(`\n🧪 Testing: ${description}`);
    console.log(`   Endpoint: ${endpoint}`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${BASE_URL}${endpoint}`);
      const duration = Date.now() - startTime;
      
      const result = {
        endpoint,
        description,
        success: true,
        duration,
        stats: response.data.stats || {},
        totalCustomers: response.data.totalCustomers || response.data.stats?.totalCustomers || 0
      };
      
      this.results.push(result);
      
      console.log(`   ✅ Success: ${duration}ms`);
      if (response.data.stats) {
        console.log(`   📊 Customers processed: ${result.totalCustomers}`);
        if (response.data.stats.scraping) {
          console.log(`   ⚡ Scraping rate: ${response.data.stats.scraping.itemsPerSecond} items/sec`);
        }
        if (response.data.stats.database) {
          console.log(`   💾 Database rate: ${response.data.stats.database.itemsPerSecond} items/sec`);
        }
      }
      
      return result;
      
    } catch (error) {
      const duration = Date.now() - startTime;
      const result = {
        endpoint,
        description,
        success: false,
        duration,
        error: error.message
      };
      
      this.results.push(result);
      console.log(`   ❌ Failed: ${error.message} (${duration}ms)`);
      
      return result;
    }
  }

  async runHealthCheck() {
    console.log('🏥 Health Check');
    return await this.testEndpoint('/health', 'Health Check');
  }

  async runStatsCheck() {
    console.log('📈 Statistics Check');
    return await this.testEndpoint('/stats', 'Database Statistics');
  }

  async runSmallBatchTest() {
    console.log('🧪 Small Batch Test (5 customers)');
    return await this.testEndpoint('/cart?limit=5', 'Cart Scraping - 5 customers');
  }

  async runMediumBatchTest() {
    console.log('🧪 Medium Batch Test (20 customers)');
    return await this.testEndpoint('/wishlist?limit=20', 'Wishlist Scraping - 20 customers');
  }

  async runCombinedTest() {
    console.log('🧪 Combined Test (10 customers)');
    return await this.testEndpoint('/customers/all/both?limit=10', 'Combined Scraping - 10 customers');
  }

  async runPerformanceTest() {
    console.log('⚡ Performance Test (50 customers)');
    return await this.testEndpoint('/customers/all/both?limit=50', 'Performance Test - 50 customers');
  }

  generateReport() {
    console.log('\n📋 PERFORMANCE REPORT');
    console.log('=' .repeat(60));
    
    const successful = this.results.filter(r => r.success);
    const failed = this.results.filter(r => !r.success);
    
    console.log(`✅ Successful tests: ${successful.length}`);
    console.log(`❌ Failed tests: ${failed.length}`);
    
    if (successful.length > 0) {
      console.log('\n📊 Performance Metrics:');
      successful.forEach(result => {
        console.log(`\n${result.description}:`);
        console.log(`   Duration: ${result.duration}ms`);
        console.log(`   Customers: ${result.totalCustomers}`);
        
        if (result.stats.scraping) {
          console.log(`   Scraping Rate: ${result.stats.scraping.itemsPerSecond} items/sec`);
        }
        
        if (result.totalCustomers > 0) {
          const timePerCustomer = result.duration / result.totalCustomers;
          console.log(`   Time per Customer: ${timePerCustomer.toFixed(0)}ms`);
        }
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(result => {
        console.log(`   ${result.description}: ${result.error}`);
      });
    }
    
    // Performance recommendations
    console.log('\n💡 Performance Recommendations:');
    
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const avgRate = successful
      .filter(r => r.stats.scraping)
      .reduce((sum, r) => sum + r.stats.scraping.itemsPerSecond, 0) / 
      successful.filter(r => r.stats.scraping).length;
    
    if (avgRate < 5) {
      console.log('   ⚠️  Low scraping rate detected. Consider:');
      console.log('      - Increasing SCRAPER_BATCH_SIZE');
      console.log('      - Increasing MAX_CONCURRENT_PAGES');
      console.log('      - Decreasing DELAY_BETWEEN_BATCHES');
    } else if (avgRate > 20) {
      console.log('   🚀 Excellent scraping rate! Consider:');
      console.log('      - Processing larger batches');
      console.log('      - Monitoring server resources');
    } else {
      console.log('   ✅ Good scraping rate. System is well-tuned.');
    }
    
    console.log('\n📈 Scaling Estimates:');
    if (avgRate > 0) {
      console.log(`   100 customers: ~${(100 / avgRate).toFixed(0)} seconds`);
      console.log(`   500 customers: ~${(500 / avgRate / 60).toFixed(1)} minutes`);
      console.log(`   1000 customers: ~${(1000 / avgRate / 60).toFixed(1)} minutes`);
    }
  }

  async runFullTestSuite() {
    console.log('🚀 Starting Full Test Suite');
    console.log('=' .repeat(60));
    
    // Run tests in sequence
    await this.runHealthCheck();
    await this.runStatsCheck();
    await this.runSmallBatchTest();
    await this.runMediumBatchTest();
    await this.runCombinedTest();
    await this.runPerformanceTest();
    
    // Generate final report
    this.generateReport();
  }
}

// Command line interface
const args = process.argv.slice(2);
const monitor = new ScraperMonitor();

if (args.length === 0) {
  console.log('Usage: node monitor.js [test-name]');
  console.log('Available tests:');
  console.log('  health     - Health check');
  console.log('  stats      - Database statistics');
  console.log('  small      - Small batch test (5 customers)');
  console.log('  medium     - Medium batch test (20 customers)');
  console.log('  combined   - Combined test (10 customers)');
  console.log('  performance - Performance test (50 customers)');
  console.log('  full       - Run all tests');
  process.exit(0);
}

const testName = args[0].toLowerCase();

switch (testName) {
  case 'health':
    monitor.runHealthCheck().then(() => monitor.generateReport());
    break;
  case 'stats':
    monitor.runStatsCheck().then(() => monitor.generateReport());
    break;
  case 'small':
    monitor.runSmallBatchTest().then(() => monitor.generateReport());
    break;
  case 'medium':
    monitor.runMediumBatchTest().then(() => monitor.generateReport());
    break;
  case 'combined':
    monitor.runCombinedTest().then(() => monitor.generateReport());
    break;
  case 'performance':
    monitor.runPerformanceTest().then(() => monitor.generateReport());
    break;
  case 'full':
    monitor.runFullTestSuite();
    break;
  default:
    console.log(`Unknown test: ${testName}`);
    process.exit(1);
}

export default ScraperMonitor;