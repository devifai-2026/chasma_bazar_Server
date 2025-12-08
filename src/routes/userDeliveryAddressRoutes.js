import express from 'express';
const router = express.Router();
import * as userDeliveryAddressController from '../controllers/userDeliveryAddressController.js';
import { authenticate } from '../middleware/auth.js';

router.post('/', authenticate, userDeliveryAddressController.addAddress);
router.get('/', authenticate, userDeliveryAddressController.getAddresses);
router.get('/:id', authenticate, userDeliveryAddressController.getAddress);
router.put('/:id', authenticate, userDeliveryAddressController.updateAddress);
router.delete('/:id', authenticate, userDeliveryAddressController.deleteAddress);

export default router;
