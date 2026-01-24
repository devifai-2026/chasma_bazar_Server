import express from 'express';
import promoCodeController from '../controllers/promoCoder.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, authorize('admin'), promoCodeController.createPromoCode);
router.get('/', promoCodeController.getActivePromoCodes);
router.get('/search', promoCodeController.searchPromoByCode);
router.get('/:id', promoCodeController.getPromoCode);
router.post('/validate', authenticate, promoCodeController.validatePromoCode);
router.post('/apply', authenticate, promoCodeController.applyPromoCode);
router.put('/:id', authenticate, authorize('admin'), promoCodeController.updatePromoCode);
router.delete('/:id', authenticate, authorize('admin'), promoCodeController.deactivatePromoCode);

export default router;
