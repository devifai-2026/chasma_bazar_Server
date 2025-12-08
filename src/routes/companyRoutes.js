import express from 'express';
const router = express.Router();
import * as companyController from '../controllers/companyController.js';
import { authenticate, authorize } from '../middleware/auth.js';

router.post('/', authenticate, authorize('admin'), companyController.createCompany);
router.put('/:id', authenticate, authorize('admin'), companyController.updateCompany);
router.delete('/:id', authenticate, authorize('admin'), companyController.deleteCompany);
router.get('/', companyController.getAllCompanies);
router.get('/:id', companyController.getCompany);

export default router;
