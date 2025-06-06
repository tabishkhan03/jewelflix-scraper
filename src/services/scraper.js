import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://seller.jewelflix.com';
const SESSION_COOKIE_NAME = 'remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d';
const SESSION_COOKIE_VALUE = process.env.SESSION_COOKIE;

// Configuration from environment variables
const BATCH_SIZE = parseInt(process.env.SCRAPER_BATCH_SIZE) || 50;
const MAX_CONCURRENT_PAGES = parseInt(process.env.MAX_CONCURRENT_PAGES) || 10;
const DELAY_BETWEEN_BATCHES = parseInt(process.env.DELAY_BETWEEN_BATCHES) || 100;
const PAGE_TIMEOUT = parseInt(process.env.PAGE_TIMEOUT) || 10000;

console.log(`🚀 Scraper Configuration:`);
console.log(`   Batch Size: ${BATCH_SIZE}`);
console.log(`   Max Concurrent Pages: ${MAX_CONCURRENT_PAGES}`);
console.log(`   Delay Between Batches: ${DELAY_BETWEEN_BATCHES}ms`);
console.log(`   Page Timeout: ${PAGE_TIMEOUT}ms`);

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Progress tracker class
class ProgressTracker {
  constructor(total, operation) {
    this.total = total;
    this.completed = 0;
    this.failed = 0;
    this.operation = operation;
    this.startTime = Date.now();
    this.lastUpdate = Date.now();
  }

  update(success = true) {
    if (success) {
      this.completed++;
    } else {
      this.failed++;
    }

    const now = Date.now();
    // Update console every 2 seconds or when batch completes
    if (now - this.lastUpdate > 2000 || (this.completed + this.failed) % BATCH_SIZE === 0) {
      this.logProgress();
      this.lastUpdate = now;
    }
  }

  logProgress() {
    const processed = this.completed + this.failed;
    const percentage = ((processed / this.total) * 100).toFixed(1);
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const rate = (processed / (elapsed || 1)).toFixed(2);
    const eta = processed > 0 ? (((this.total - processed) / rate)).toFixed(0) : '?';

    console.log(`📊 ${this.operation} Progress: ${processed}/${this.total} (${percentage}%) | ✅ ${this.completed} ❌ ${this.failed} | Rate: ${rate}/s | ETA: ${eta}s`);
  }

  finish() {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(1);
    const rate = (this.completed / (elapsed || 1)).toFixed(2);
    console.log(`🎉 ${this.operation} Complete: ${this.completed}/${this.total} successful in ${elapsed}s (${rate}/s)`);
    if (this.failed > 0) {
      console.log(`⚠️  ${this.failed} items failed to process`);
    }
  }
}

// Improved Browser pool for better resource management
class BrowserPool {
  constructor(size = MAX_CONCURRENT_PAGES) {
    this.browsers = [];
    this.size = size;
    this.currentIndex = 0;
    this.isClosing = false;
  }

  async initialize() {
    console.log(`🔧 Initializing browser pool with ${this.size} browsers...`);
    const browserPromises = [];
    
    for (let i = 0; i < this.size; i++) {
      browserPromises.push(this.createBrowser());
    }
    
    try {
      this.browsers = await Promise.all(browserPromises);
      console.log(`✅ Browser pool initialized with ${this.browsers.length} browsers`);
    } catch (error) {
      console.error('❌ Failed to initialize browser pool:', error);
      // Clean up any browsers that were created
      await this.close();
      throw error;
    }
  }

  async createBrowser() {
    return await puppeteer.launch({ 
      headless: true,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security',
        '--disable-images',
        '--disable-css',
        '--disable-plugins',
        '--disable-extensions',
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-default-apps',
        '--disable-translate',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection'
      ]
    });
  }

  getBrowser() {
    if (this.isClosing || this.browsers.length === 0) {
      throw new Error('Browser pool is closed or not initialized');
    }
    const browser = this.browsers[this.currentIndex];
    this.currentIndex = (this.currentIndex + 1) % this.browsers.length;
    return browser;
  }

  async close() {
    if (this.isClosing) return;
    this.isClosing = true;
    
    console.log('🔧 Closing browser pool...');
    const closePromises = this.browsers.map(async (browser) => {
      try {
        if (browser && browser.isConnected()) {
          await browser.close();
        }
      } catch (error) {
        console.warn('⚠️ Error closing browser:', error.message);
      }
    });
    
    await Promise.allSettled(closePromises);
    this.browsers = [];
    console.log('✅ Browser pool closed');
  }
}

// --- Helper: Set session cookie ---
export async function setSessionCookie(page) {
  const cookies = [
    {
      name: SESSION_COOKIE_NAME,
      value: SESSION_COOKIE_VALUE,
      domain: 'seller.jewelflix.com',
      path: '/',
      httpOnly: true,
      secure: true,
    }
  ];

  if (process.env.LARAVEL_SESSION_COOKIE) {
    cookies.push({
      name: process.env.LARAVEL_SESSION_COOKIE_NAME,
      value: process.env.LARAVEL_SESSION_COOKIE,
      domain: 'seller.jewelflix.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
  }

  await page.setCookie(...cookies);
}

// --- Helper: Setup optimized page with better error handling ---
async function setupPage(browser) {
  if (!browser || !browser.isConnected()) {
    throw new Error('Browser is not connected');
  }

  const page = await browser.newPage();
  
  try {
    await setSessionCookie(page);
    
    // Optimize page settings
    await page.setViewport({ width: 1280, height: 720 });
    await page.setRequestInterception(true);
    
    // Block unnecessary resources more aggressively
    page.on('request', (req) => {
      if (page.isClosed()) {
        return;
      }
      
      const resourceType = req.resourceType();
      const url = req.url();
      
      if (
        resourceType === 'image' || 
        resourceType === 'stylesheet' || 
        resourceType === 'font' ||
        resourceType === 'media' ||
        url.includes('google-analytics') ||
        url.includes('facebook') ||
        url.includes('twitter') ||
        url.includes('.css') ||
        url.includes('.jpg') ||
        url.includes('.png') ||
        url.includes('.gif')
      ) {
        req.abort().catch(() => {});
      } else {
        req.continue().catch(() => {});
      }
    });
    
    // Set shorter timeouts
    page.setDefaultTimeout(PAGE_TIMEOUT);
    page.setDefaultNavigationTimeout(PAGE_TIMEOUT);
    
    return page;
  } catch (error) {
    // Clean up page if setup fails
    try {
      if (!page.isClosed()) {
        await page.close();
      }
    } catch (closeError) {
      console.warn('⚠️ Error closing page during setup failure:', closeError.message);
    }
    throw error;
  }
}

// --- Helper: Safe page closure ---
async function safeClosePage(page) {
  if (!page) return;
  
  try {
    if (!page.isClosed()) {
      await page.close();
    }
  } catch (error) {
    console.warn('⚠️ Error closing page:', error.message);
  }
}

// --- Helper: Get customer IDs with caching ---
const customerIdCache = new Map();

async function getCustomerIds(page, type) {
  const cacheKey = `${type}_ids`;
  const cacheExpiry = 5 * 60 * 1000; // 5 minutes
  
  if (customerIdCache.has(cacheKey)) {
    const cached = customerIdCache.get(cacheKey);
    if (Date.now() - cached.timestamp < cacheExpiry) {
      console.log(`📋 Using cached ${type} customer IDs (${cached.data.length} customers)`);
      return cached.data;
    }
  }

  console.log(`🔍 Fetching ${type} customer IDs...`);
  const url = `${BASE_URL}/customer_${type}`;
  
  try {
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: PAGE_TIMEOUT 
    });
    
    await page.waitForSelector('.row.gutters .col-xl-3', { timeout: PAGE_TIMEOUT });
    
    const customerIds = await page.$$eval('.row.gutters .col-xl-3 figure.user-card a', links => 
      links.map(link => {
        const href = link.getAttribute('href');
        const match = href.match(/details\/(\d+)/);
        return match ? match[1] : null;
      }).filter(Boolean)
    );
    
    // Cache the result
    customerIdCache.set(cacheKey, {
      data: customerIds,
      timestamp: Date.now()
    });
    
    console.log(`✅ Found ${customerIds.length} customers on ${type} page`);
    return customerIds;
  } catch (error) {
    console.error(`❌ Error fetching ${type} customer IDs:`, error.message);
    return [];
  }
}

// --- Optimized customer data scraper with better error handling ---
async function scrapeCustomerData(browser, customerId, type, retries = 2) {
  let page;
  try {
    page = await setupPage(browser);
    const detailsUrl = `${BASE_URL}/customer_${type}/details/${customerId}`;
    
    await page.goto(detailsUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: PAGE_TIMEOUT 
    });
    
    // Quick check for login redirect
    const isLoginPage = await page.evaluate(() => 
      document.querySelector('form[action*="login"]') !== null
    );

    if (isLoginPage) {
      throw new Error('Session expired');
    }

    // Get all data in one evaluation for efficiency
    const result = await page.evaluate((customerId, type) => {
      const customerName = document.querySelector('.page-header h1')?.textContent?.trim() || 
                          document.querySelector('.breadcrumb-item.active')?.textContent?.trim() || '';
      
      const phoneNumber = document.querySelector('.customer-phone')?.textContent?.trim() || 
                         document.querySelector('.phone-number')?.textContent?.trim() || '';

      const tableRows = document.querySelectorAll('table.custom-table tbody tr');
      const items = [];
      
      tableRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 4) {
          const item = {
            productId: cells[3]?.textContent?.trim() || '',
            name: cells[2]?.textContent?.trim() || '',
            price: parseFloat(cells[4]?.textContent?.trim()?.replace(/[^0-9.]/g, '')) || 0,
            image: cells[1]?.querySelector('img')?.src || ''
          };
          
          if (type === 'cart') {
            item.quantity = Number(cells[0]?.textContent?.trim()) || 1;
          }
          
          items.push(item);
        }
      });

      return {
        customerId,
        customerName,
        customerNumber: phoneNumber,
        items
      };
    }, customerId, type);

    return {
      ...result,
      [type]: {
        items: result.items,
        lastUpdated: new Date()
      }
    };
    
  } catch (error) {
    if (retries > 0 && !error.message.includes('Protocol error')) {
      console.log(`🔄 Retrying customer ${customerId} (${retries} retries left)`);
      await delay(1000);
      return await scrapeCustomerData(browser, customerId, type, retries - 1);
    }
    console.error(`❌ Failed to scrape ${type} for customer ${customerId}:`, error.message);
    return null;
  } finally {
    await safeClosePage(page);
  }
}

// --- Batch processor with progress tracking ---
async function processBatch(browserPool, customerIds, type, progress) {
  const promises = customerIds.map(async (customerId) => {
    try {
      const browser = browserPool.getBrowser();
      const result = await scrapeCustomerData(browser, customerId, type);
      progress.update(result !== null);
      return result;
    } catch (error) {
      console.error(`❌ Error processing customer ${customerId}:`, error.message);
      progress.update(false);
      return null;
    }
  });

  const results = await Promise.allSettled(promises);
  return results
    .filter(result => result.status === 'fulfilled' && result.value !== null)
    .map(result => result.value);
}

// --- Main scraping functions ---
export async function scrapeCartForCustomers(limit = null, specificCustomerId = null) {
  const browserPool = new BrowserPool();
  
  try {
    await browserPool.initialize();
    
    let customerIds;
    if (specificCustomerId) {
      customerIds = [specificCustomerId];
    } else {
      const page = await setupPage(browserPool.getBrowser());
      try {
        customerIds = await getCustomerIds(page, 'cart');
      } finally {
        await safeClosePage(page);
      }
      
      if (limit) customerIds = customerIds.slice(0, limit);
    }

    console.log(`🛒 Starting cart scraping for ${customerIds.length} customers`);
    const progress = new ProgressTracker(customerIds.length, 'Cart Scraping');
    
    const results = [];
    
    // Process in batches
    for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
      const batch = customerIds.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(customerIds.length / BATCH_SIZE)} (${batch.length} customers)`);
      
      const batchResults = await processBatch(browserPool, batch, 'cart', progress);
      results.push(...batchResults);
      
      // Small delay between batches to prevent overwhelming the server
      if (i + BATCH_SIZE < customerIds.length) {
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }
    
    progress.finish();
    return results;
    
  } finally {
    await browserPool.close();
  }
}

export async function scrapeWishlistForCustomers(limit = null, specificCustomerId = null) {
  const browserPool = new BrowserPool();
  
  try {
    await browserPool.initialize();
    
    let customerIds;
    if (specificCustomerId) {
      customerIds = [specificCustomerId];
    } else {
      const page = await setupPage(browserPool.getBrowser());
      try {
        customerIds = await getCustomerIds(page, 'wishlist');
      } finally {
        await safeClosePage(page);
      }
      
      if (limit) customerIds = customerIds.slice(0, limit);
    }

    console.log(`💝 Starting wishlist scraping for ${customerIds.length} customers`);
    const progress = new ProgressTracker(customerIds.length, 'Wishlist Scraping');
    
    const results = [];
    
    for (let i = 0; i < customerIds.length; i += BATCH_SIZE) {
      const batch = customerIds.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(customerIds.length / BATCH_SIZE)} (${batch.length} customers)`);
      
      const batchResults = await processBatch(browserPool, batch, 'wishlist', progress);
      results.push(...batchResults);
      
      if (i + BATCH_SIZE < customerIds.length) {
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }
    
    progress.finish();
    return results;
    
  } finally {
    await browserPool.close();
  }
}

export async function scrapeBothForCustomers(customerIds = null, limit = null) {
  const browserPool = new BrowserPool();
  
  try {
    await browserPool.initialize();
    
    let ids;
    if (customerIds && Array.isArray(customerIds)) {
      ids = customerIds;
    } else {
      console.log('🔍 Fetching customer IDs from both pages...');
      const page1 = await setupPage(browserPool.getBrowser());
      const page2 = await setupPage(browserPool.getBrowser());
      
      let cartIds = [];
      let wishlistIds = [];
      
      try {
        [cartIds, wishlistIds] = await Promise.all([
          getCustomerIds(page1, 'cart'),
          getCustomerIds(page2, 'wishlist')
        ]);
      } finally {
        await Promise.all([
          safeClosePage(page1),
          safeClosePage(page2)
        ]);
      }
      
      const allIds = [...new Set([...cartIds, ...wishlistIds])];
      ids = limit ? allIds.slice(0, limit) : allIds;
    }

    console.log(`🔄 Starting combined scraping for ${ids.length} customers`);
    const progress = new ProgressTracker(ids.length, 'Combined Scraping');
    
    const results = [];
    
    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      console.log(`📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(ids.length / BATCH_SIZE)} (${batch.length} customers)`);
      
      const batchPromises = batch.map(async (customerId) => {
        try {
          const browser1 = browserPool.getBrowser();
          const browser2 = browserPool.getBrowser();
          
          const [cartData, wishlistData] = await Promise.allSettled([
            scrapeCustomerData(browser1, customerId, 'cart'),
            scrapeCustomerData(browser2, customerId, 'wishlist')
          ]);
          
          const cartResult = cartData.status === 'fulfilled' ? cartData.value : null;
          const wishlistResult = wishlistData.status === 'fulfilled' ? wishlistData.value : null;
          
          progress.update(cartResult !== null || wishlistResult !== null);
          
          if (cartResult && wishlistResult) {
            return {
              customerId: cartResult.customerId,
              customerName: cartResult.customerName || wishlistResult.customerName,
              customerNumber: cartResult.customerNumber || wishlistResult.customerNumber,
              cart: cartResult.cart,
              wishlist: wishlistResult.wishlist
            };
          }
          
          return cartResult || wishlistResult;
        } catch (error) {
          console.error(`❌ Error processing customer ${customerId}:`, error.message);
          progress.update(false);
          return null;
        }
      });
      
      const batchResults = await Promise.allSettled(batchPromises);
      const validResults = batchResults
        .filter(result => result.status === 'fulfilled' && result.value !== null)
        .map(result => result.value);
      
      results.push(...validResults);
      
      if (i + BATCH_SIZE < ids.length) {
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }
    
    progress.finish();
    return results;
    
  } finally {
    await browserPool.close();
  }
}