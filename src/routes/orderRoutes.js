import express from 'express';
const router = express.Router();
import * as orderController from '../controllers/orderController.js';
import { authenticate, authorize } from '../middleware/auth.js';

router.post('/', authenticate, orderController.createOrder);
router.get('/', authenticate, orderController.getUserOrders);
router.get('/:id', authenticate, orderController.getOrder);
router.put('/:id/cancel', authenticate, orderController.cancelOrder);
router.put('/:id/status', authenticate, authorize('admin'), orderController.updateOrderStatus);
router.get('/admin/all', authenticate, authorize('admin'), orderController.getAllOrders);

export default router;
