import express from 'express';
const router = express.Router();
import lastSeenProductController from '../controllers/lastSeenProductController.js';
import { authenticate } from '../middleware/auth.js';

// Track product view
router.post('/:productId', authenticate, lastSeenProductController.trackProductView);

// Get user's browsing history
router.get('/', authenticate, lastSeenProductController.getUserBrowsingHistory);

// Get most viewed products
router.get('/stats/most-viewed', authenticate, lastSeenProductController.getMostViewedProducts);

// Get recently viewed products
router.get('/stats/recently-viewed', authenticate, lastSeenProductController.getRecentlyViewedProducts);

// Get browsing statistics
router.get('/stats/statistics', authenticate, lastSeenProductController.getBrowsingStatistics);

// Clear specific product from history
router.delete('/:productId', authenticate, lastSeenProductController.clearProductFromHistory);

// Clear all browsing history
router.delete('/', authenticate, lastSeenProductController.clearBrowsingHistory);

export default router;
