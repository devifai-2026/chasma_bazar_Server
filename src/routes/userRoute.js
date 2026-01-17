import express from 'express';
import userController from '../controllers/userController.js';
import { authenticate, authorize } from '../middleware/auth.js';


const router = express.Router();

router.get('/', authenticate, authorize('admin'), userController.getAllUsers);
router.get('/statistics', authenticate, authorize('admin'), userController.getUsersStatistics);
router.get('/:id', authenticate, authorize('admin'), userController.getUserById);
router.post('/', authenticate, authorize('admin'), userController.createUser);
router.put('/:id', authenticate, authorize('admin'), userController.updateUser);
router.delete('/:id', authenticate, authorize('admin'), userController.deleteUser);
router.put('/:id/restore', authenticate, authorize('admin'), userController.restoreUser);



export default router;