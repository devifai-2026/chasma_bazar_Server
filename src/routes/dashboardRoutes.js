import express from 'express';
import {
    getOverviewStats,
    getRevenueChart,
    getRecentUsers,
    getPerformanceMetrics,
    getRecentOrders
} from '../controllers/dashboardController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/stats', getOverviewStats);
router.get('/revenue', getRevenueChart);
router.get('/users', getRecentUsers);
router.get('/performance', getPerformanceMetrics);
router.get('/orders/recent', getRecentOrders);

export default router;
