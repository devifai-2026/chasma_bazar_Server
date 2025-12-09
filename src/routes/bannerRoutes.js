import express from 'express';
import bannerController from '../controllers/bannerController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/active', bannerController.getActiveBanners);
router.get('/by-page', bannerController.getActiveBannersByPage);
router.get('/:id', bannerController.getBannerById);

// Admin only routes
router.post('/', authenticate, authorize('admin'), bannerController.createBanner);
router.get('/', authenticate, authorize('admin'), bannerController.getAllBanners);
router.put('/:id', authenticate, authorize('admin'), bannerController.updateBanner);
router.patch('/:id/toggle-status', authenticate, authorize('admin'), bannerController.toggleBannerStatus);
router.delete('/:id', authenticate, authorize('admin'), bannerController.deleteBanner);
router.delete('/:id/permanent', authenticate, authorize('admin'), bannerController.permanentlyDeleteBanner);

export default router;
