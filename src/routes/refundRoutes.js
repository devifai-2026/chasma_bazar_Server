import express from 'express';
import refundController from '../controllers/refundController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, refundController.createRefund);
router.get('/', authenticate, refundController.getUserRefunds);
router.get('/:id', authenticate, refundController.getRefundById);
router.get('/all/pending', authenticate, authorize('admin'), refundController.getPendingRefunds);
router.put('/:id/approve', authenticate, authorize('admin'), refundController.approveRefund);
router.put('/:id/reject', authenticate, authorize('admin'), refundController.rejectRefund);

export default router;
