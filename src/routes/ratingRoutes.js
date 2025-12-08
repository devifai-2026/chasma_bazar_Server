import express from 'express';
const router = express.Router();
import * as ratingController from '../controllers/ratingController.js';
import { authenticate } from '../middleware/auth.js';

router.post('/', authenticate, ratingController.addRating);
router.put('/:id', authenticate, ratingController.updateRating);
router.delete('/:id', authenticate, ratingController.deleteRating);
router.get('/product/:productId', ratingController.getProductRatings);
router.get('/user/all', authenticate, ratingController.getUserRatings);

export default router;
