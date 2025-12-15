const express = require('express');
const { getStats } = require('../utils/stats');
const router = express.Router();

// GET /api/stats
// Returns cached stats (recalculated automatically when items.json changes)
router.get('/', (req, res, next) => {
  try {
    const stats = getStats();
    
    if (!stats) {
      const err = new Error('Stats not initialized');
      err.status = 503; // Service Unavailable
      throw err;
    }
    
    res.json(stats);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
