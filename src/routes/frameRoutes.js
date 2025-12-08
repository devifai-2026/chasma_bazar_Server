import express from 'express';
const router = express.Router();
import * as frameController from '../controllers/frameController.js';
import { authenticate, authorize } from '../middleware/auth.js';

router.post('/', authenticate, authorize('admin'), frameController.createFrame);
router.put('/:id', authenticate, authorize('admin'), frameController.updateFrame);
router.delete('/:id', authenticate, authorize('admin'), frameController.deleteFrame);
router.get('/', frameController.getAllFrames);
router.get('/:id', frameController.getFrame);

export default router;
