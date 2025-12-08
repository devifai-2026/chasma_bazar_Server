import express from 'express';
import cartController from '../controllers/cartController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, cartController.addToCart);
router.get('/', authenticate, cartController.getCart);
router.get('/summary', authenticate, cartController.getCartSummary);
router.put('/:itemId', authenticate, cartController.updateCartItem);
router.delete('/:itemId', authenticate, cartController.removeFromCart);
router.delete('/', authenticate, cartController.clearCart);

export default router;
