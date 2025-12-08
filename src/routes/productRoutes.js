import express from 'express';
const router = express.Router();
import * as productController from '../controllers/productController.js';
import { authenticate, authorize } from '../middleware/auth.js';

router.post('/', authenticate, authorize('admin'), productController.createProduct);
router.put('/:id', authenticate, authorize('admin'), productController.updateProduct);
router.delete('/:id', authenticate, authorize('admin'), productController.deleteProduct);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProduct);

export default router;
