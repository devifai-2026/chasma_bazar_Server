import express from 'express';
const router = express.Router();
import * as reviewController from '../controllers/reviewController.js';
import { authenticate } from '../middleware/auth.js';

router.post('/', authenticate, reviewController.createReview);
router.put('/:id', authenticate, reviewController.updateReview);
router.delete('/:id', authenticate, reviewController.deleteReview);
router.get('/product/:productId', reviewController.getProductReviews);
router.get('/user/all', authenticate, reviewController.getUserReviews);
router.get('/random/good', reviewController.getRandomGoodReviews);

export default router;
