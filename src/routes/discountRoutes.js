import express from 'express';
const router = express.Router();
import * as discountController from '../controllers/discountController.js';
import { authenticate, authorize } from '../middleware/auth.js';

// Admin only routes
router.post('/', authenticate, authorize('admin'), discountController.createDiscount);
router.put('/:id', authenticate, authorize('admin'), discountController.updateDiscount);
router.delete('/:id', authenticate, authorize('admin'), discountController.deleteDiscount);
router.patch('/:id/toggle-status', authenticate, authorize('admin'), discountController.toggleDiscountStatus);
router.get('/active', authenticate, authorize('admin'), discountController.getActiveDiscounts);
router.get('/', authenticate, authorize('admin'), discountController.getAllDiscounts);
router.get('/:id', authenticate, authorize('admin'), discountController.getDiscount);

export default router;
