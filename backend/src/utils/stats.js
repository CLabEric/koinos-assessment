const fs = require('fs').promises;
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../../data/items.json');

// Utility for calculating mean
function mean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Cache for stats
let statsCache = null;
let debounceTimer = null;

/**
 * Calculate stats from items.json file
 * @returns {Promise<Object>} Stats object with total and averagePrice
 */
async function calculateStats() {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf-8');
    const items = JSON.parse(raw);
    
    if (items.length === 0) {
      return { total: 0, averagePrice: 0 };
    }
    
    const prices = items.map(item => item.price);
    
    return {
      total: items.length,
      averagePrice: mean(prices)
    };
  } catch (err) {
    console.error('Error calculating stats:', err);
    throw err;
  }
}

/**
 * Initialize stats cache and set up file watcher
 */
async function initStatsCache() {
  try {
    // Calculate initial stats
    statsCache = await calculateStats();
    console.log('Stats cache initialized:', statsCache);
    
    // Set up file watcher
    const fsWatch = require('fs');
    fsWatch.watch(DATA_PATH, (eventType) => {
      if (eventType === 'change') {
        // Debounce to avoid multiple rapid recalculations
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          try {
            statsCache = await calculateStats();
            console.log('Stats cache updated:', statsCache);
          } catch (err) {
            console.error('Error updating stats cache:', err);
          }
        }, 300); // 300ms debounce
      }
    });
    
    console.log('File watcher initialized for:', DATA_PATH);
  } catch (err) {
    console.error('Error initializing stats cache:', err);
    throw err;
  }
}

/**
 * Get cached stats
 * @returns {Object|null} Cached stats object
 */
function getStats() {
  return statsCache;
}

module.exports = { 
  mean,
  calculateStats,
  initStatsCache,
  getStats
};
