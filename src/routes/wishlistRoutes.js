import express from 'express';
const router = express.Router();
import * as wishlistController from '../controllers/wishlistController.js';
import { authenticate } from '../middleware/auth.js';

router.post('/', authenticate, wishlistController.addToWishlist);
router.delete('/:id', authenticate, wishlistController.removeFromWishlist);
router.get('/', authenticate, wishlistController.getWishlist);
router.get('/check/:productId', authenticate, wishlistController.isInWishlist);

export default router;
