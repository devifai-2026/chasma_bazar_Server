import express from 'express';
const router = express.Router();
import usedPromoCodeController from '../controllers/usedPromoCodeController.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Record promo code usage
router.post('/', authenticate, usedPromoCodeController.recordPromoCodeUsage);

// Get user's promo code usage history
router.get('/history', authenticate, usedPromoCodeController.getUserPromoCodeHistory);

// Get user's promo code usage statistics
router.get('/stats', authenticate, usedPromoCodeController.getPromoCodeUsageStats);

// Check if user has used a specific promo code
router.get('/check/:promoCodeId', authenticate, usedPromoCodeController.hasUserUsedCode);

// Get promo codes used for a specific order
router.get('/order/:orderId', authenticate, usedPromoCodeController.getPromoCodesByOrder);

// Get most popular promo codes (admin only)
router.get('/admin/popular', authenticate, authorize('admin'), usedPromoCodeController.getMostPopularPromoCodes);

// Get promo code usage report (admin only)
router.get('/admin/report', authenticate, authorize('admin'), usedPromoCodeController.getPromoCodeUsageReport);

export default router;
