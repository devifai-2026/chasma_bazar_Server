import express from 'express';
import paymentController from '../controllers/paymentController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, paymentController.recordPayment);
router.get('/user/history', authenticate, paymentController.getUserPayments);
router.get('/:orderId', authenticate, paymentController.getOrderPayment);
router.put('/:paymentId', authenticate, authorize('admin'), paymentController.updatePaymentStatus);
router.get('/stats', authenticate, authorize('admin'), paymentController.getPaymentStats);

export default router;
