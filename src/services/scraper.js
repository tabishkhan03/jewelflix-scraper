import puppeteer from 'puppeteer';
import dotenv from 'dotenv';
dotenv.config();

const BASE_URL = 'https://seller.jewelflix.com';
const SESSION_COOKIE_NAME = 'remember_web_59ba36addc2b2f9401580f014c7f58ea4e30989d';
const SESSION_COOKIE_VALUE = process.env.SESSION_COOKIE;

// Helper function for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

  // Add Laravel session cookie if available
  if (process.env.LARAVEL_SESSION_COOKIE) {
    cookies.push({
      name: 'laravel_session',
      value: process.env.LARAVEL_SESSION_COOKIE,
      domain: 'seller.jewelflix.com',
      path: '/',
      httpOnly: true,
      secure: true,
    });
  }

  await page.setCookie(...cookies);
}

// --- Helper: Get customer IDs from cart page ---
async function getCartCustomerIds(page) {
  const url = `${BASE_URL}/customer_cart`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Wait for the customer cards to load
  await page.waitForSelector('.row.gutters .col-xl-3', { timeout: 10000 });
  
  const customerIds = await page.$$eval('.row.gutters .col-xl-3 figure.user-card a', links => 
    links.map(link => {
      const href = link.getAttribute('href');
      const match = href.match(/details\/(\d+)/);
      return match ? match[1] : null;
    }).filter(Boolean)
  );
  
  console.log(`Found ${customerIds.length} customers on cart page`);
  return customerIds;
}

// --- Helper: Get customer IDs from wishlist page ---
async function getWishlistCustomerIds(page) {
  const url = `${BASE_URL}/customer_wishlist`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Wait for the customer cards to load
  await page.waitForSelector('.row.gutters .col-xl-3', { timeout: 10000 });
  
  const customerIds = await page.$$eval('.row.gutters .col-xl-3 figure.user-card a', links => 
    links.map(link => {
      const href = link.getAttribute('href');
      const match = href.match(/details\/(\d+)/);
      return match ? match[1] : null;
    }).filter(Boolean)
  );
  
  console.log(`Found ${customerIds.length} customers on wishlist page`);
  return customerIds;
}

// --- Helper: Get customer info from card ---
async function getCustomerInfoFromCard(page, customerId, type) {
  const url = `${BASE_URL}/customer_${type}`;
  await page.goto(url, { waitUntil: 'networkidle2' });
  
  // Wait for customer cards to load
  await page.waitForSelector('.row.gutters .col-xl-3', { timeout: 10000 });
  
  // Get customer info from the card
  const customerInfo = await page.evaluate((customerId, type) => {
    const link = document.querySelector(`figure.user-card a[href="customer_${type}/details/${customerId}"]`);
    if (!link) return null;
    
    const figure = link.closest('figure.user-card');
    const name = figure.querySelector('h5')?.textContent?.trim() || '';
    const phoneNumber = figure.querySelector('ul.list-group li:first-child')?.textContent?.trim() || '';
    
    return { name, phoneNumber };
  }, customerId, type);
  
  return customerInfo;
}

// --- Scrape cart for a single customer ---
export async function scrapeCartForCustomer(page, customerId) {
  try {
    // Get customer info from the card first
    const customerInfo = await getCustomerInfoFromCard(page, customerId, 'cart');
    if (!customerInfo) {
      console.warn(`Could not find customer card for ID ${customerId}`);
      return null;
    }

    // Navigate to details page
    const detailsUrl = `${BASE_URL}/customer_cart/details/${customerId}`;
    await page.goto(detailsUrl, { waitUntil: 'networkidle2' });
    
    // Wait for the page to load and check if we're redirected to login
    const isLoginPage = await page.evaluate(() => {
      return document.querySelector('form[action*="login"]') !== null;
    });

    if (isLoginPage) {
      console.error('Session expired, please update the session cookie');
      return null;
    }

    // Wait for table to load
    await page.waitForSelector('.table-container', { timeout: 5000 });
    
    // Check if table exists and has data
    const tableExists = await page.$('table.custom-table tbody tr');
    if (!tableExists) {
      console.log(`No cart items found for customer ${customerId}`);
      return {
        customerId,
        customerName: customerInfo.name,
        customerNumber: customerInfo.phoneNumber,
        cart: {
          items: [],
          lastUpdated: new Date()
        }
      };
    }
    
    // Scrape the table data using $$eval
    const cartItems = await page.$$eval('table.custom-table tbody tr', rows => 
      rows.map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 6) return null;
        
        return {
          productId: cells[3].textContent.trim(), // Using productCode as productId
          name: cells[2].textContent.trim(),
          price: parseFloat(cells[4].textContent.trim().replace(/[^0-9.]/g, '')) || 0,
          quantity: Number(cells[0].textContent.trim()) || 1,
          image: cells[1].querySelector('img')?.src || ''
        };
      }).filter(Boolean)
    );
    
    return {
      customerId,
      customerName: customerInfo.name,
      customerNumber: customerInfo.phoneNumber,
      cart: {
        items: cartItems,
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error(`Error scraping cart for customer ${customerId}:`, error);
    return null;
  }
}

// --- Scrape wishlist for a single customer ---
export async function scrapeWishlistForCustomer(page, customerId) {
  try {
    // Get customer info from the card first
    const customerInfo = await getCustomerInfoFromCard(page, customerId, 'wishlist');
    if (!customerInfo) {
      console.warn(`Could not find customer card for ID ${customerId}`);
      return null;
    }

    // Navigate to details page
    const detailsUrl = `${BASE_URL}/customer_wishlist/details/${customerId}`;
    await page.goto(detailsUrl, { waitUntil: 'networkidle2' });
    
    // Wait for the page to load and check if we're redirected to login
    const isLoginPage = await page.evaluate(() => {
      return document.querySelector('form[action*="login"]') !== null;
    });

    if (isLoginPage) {
      console.error('Session expired, please update the session cookie');
      return null;
    }

    // Wait for table to load
    await page.waitForSelector('.table-container', { timeout: 5000 });
    
    // Check if table exists and has data
    const tableExists = await page.$('table.custom-table tbody tr');
    if (!tableExists) {
      console.log(`No wishlist items found for customer ${customerId}`);
      return {
        customerId,
        customerName: customerInfo.name,
        customerNumber: customerInfo.phoneNumber,
        wishlist: {
          items: [],
          lastUpdated: new Date()
        }
      };
    }
    
    // Scrape the table data using $$eval
    const wishlistItems = await page.$$eval('table.custom-table tbody tr', rows => 
      rows.map(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 6) return null;
        
        return {
          productId: cells[3].textContent.trim(), // Using productCode as productId
          name: cells[2].textContent.trim(),
          price: parseFloat(cells[4].textContent.trim().replace(/[^0-9.]/g, '')) || 0,
          image: cells[1].querySelector('img')?.src || ''
        };
      }).filter(Boolean)
    );
    
    return {
      customerId,
      customerName: customerInfo.name,
      customerNumber: customerInfo.phoneNumber,
      wishlist: {
        items: wishlistItems,
        lastUpdated: new Date()
      }
    };
  } catch (error) {
    console.error(`Error scraping wishlist for customer ${customerId}:`, error);
    return null;
  }
}

// --- Scrape cart for customers ---
export async function scrapeCartForCustomers(limit = null, specificCustomerId = null) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await setSessionCookie(page);
    
    let ids;
    if (specificCustomerId) {
      ids = [specificCustomerId];
    } else {
      const allIds = await getCartCustomerIds(page);
      ids = limit ? allIds.slice(0, limit) : allIds;
    }
    
    console.log(`Scraping cart for ${ids.length} customers...`);
    const results = [];
    
    for (let i = 0; i < ids.length; i++) {
      const customerId = ids[i];
      console.log(`Processing customer ${i + 1}/${ids.length}: ${customerId}`);
      
      const data = await scrapeCartForCustomer(page, customerId);
      if (data) {
        results.push(data);
      }
      
      await delay(1000);
    }
    
    console.log(`Successfully scraped cart data for ${results.length} customers`);
    return results;
  } finally {
    await browser.close();
  }
}

// --- Scrape wishlist for customers ---
export async function scrapeWishlistForCustomers(limit = null, specificCustomerId = null) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await setSessionCookie(page);
    
    let ids;
    if (specificCustomerId) {
      ids = [specificCustomerId];
    } else {
      const allIds = await getWishlistCustomerIds(page);
      ids = limit ? allIds.slice(0, limit) : allIds;
    }
    
    console.log(`Scraping wishlist for ${ids.length} customers...`);
    const results = [];
    
    for (let i = 0; i < ids.length; i++) {
      const customerId = ids[i];
      console.log(`Processing customer ${i + 1}/${ids.length}: ${customerId}`);
      
      const data = await scrapeWishlistForCustomer(page, customerId);
      if (data) {
        results.push(data);
      }
      
      await delay(1000);
    }
    
    console.log(`Successfully scraped wishlist data for ${results.length} customers`);
    return results;
  } finally {
    await browser.close();
  }
}

// --- Combined scraper for both cart and wishlist ---
export async function scrapeBothForCustomers(customerIds = null, limit = null) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await setSessionCookie(page);
    
    let ids;
    
    if (customerIds && Array.isArray(customerIds)) {
      ids = customerIds;
    } else {
      console.log('Getting all customer IDs...');
      const allIds = await getAllCustomerIds(page);
      ids = limit ? allIds.slice(0, limit) : allIds;
    }
    
    console.log(`Scraping both cart and wishlist for ${ids.length} customers...`);
    const results = [];
    
    for (let i = 0; i < ids.length; i++) {
      const customerId = ids[i];
      console.log(`Processing customer ${i + 1}/${ids.length}: ${customerId}`);
      
      const cartData = await scrapeCartForCustomer(page, customerId);
      const wishlistData = await scrapeWishlistForCustomer(page, customerId);
      
      if (cartData && wishlistData) {
        // Combine the data
        const combinedData = {
          ...cartData,
          wishlist: wishlistData.wishlist
        };
        results.push(combinedData);
      }
      
      // Add a small delay to avoid overwhelming the server
      await page.waitForTimeout(1000);
    }
    
    console.log(`Successfully scraped combined data for ${results.length} customers`);
    return results;
  } finally {
    await browser.close();
  }
}