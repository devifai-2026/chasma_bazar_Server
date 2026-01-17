import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import connectDB from './config/database.js';
import Session from './models/Session.js';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import frameRoutes from './routes/frameRoutes.js';
import companyRoutes from './routes/companyRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import ratingRoutes from './routes/ratingRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import userDeliveryAddressRoutes from './routes/userDeliveryAddressRoutes.js';
import cartRoutes from './routes/cartRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import promoRoutes from './routes/promoRoutes.js';
import discountRoutes from './routes/discountRoutes.js';
import refundRoutes from './routes/refundRoutes.js';
import lastSeenProductRoutes from './routes/lastSeenProductRoutes.js';
import usedPromoCodeRoutes from './routes/usedPromoCodeRoutes.js';
import sessionManagementRoutes from './routes/sessionManagementRoutes.js';
import bannerRoutes from './routes/bannerRoutes.js';
import userRoutes from './routes/userRoute.js';

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'success',
    statusCode: 200,
    message: 'Server is running',
    data: {
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    timestamp: new Date().toISOString(),
  });
});

// Session cleanup job - runs every hour
setInterval(async () => {
  try {
    // Cleanup expired sessions
    const expiredResult = await Session.cleanupExpiredSessions();
    if (expiredResult.deletedCount > 0) {
      console.log(`[Cleanup Job] Removed ${expiredResult.deletedCount} expired sessions`);
    }

    // Cleanup revoked sessions older than 7 days
    const revokedResult = await Session.cleanupRevokedSessions(7);
    if (revokedResult.deletedCount > 0) {
      console.log(`[Cleanup Job] Removed ${revokedResult.deletedCount} old revoked sessions`);
    }

    // Cleanup inactive sessions older than 30 days
    const inactiveResult = await Session.cleanupInactiveSessions(30);
    if (inactiveResult.deletedCount > 0) {
      console.log(`[Cleanup Job] Removed ${inactiveResult.deletedCount} old inactive sessions`);
    }
  } catch (error) {
    console.error('[Cleanup Job Error]', error.message);
  }
}, 60 * 60 * 1000); // Every hour

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/frames', frameRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', userDeliveryAddressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/promos', promoRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/refunds', refundRoutes);
app.use('/api/browsing-history', lastSeenProductRoutes);
app.use('/api/used-promos', usedPromoCodeRoutes);
app.use('/api/sessions', sessionManagementRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/users', userRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    status: 'error',
    statusCode,
    message: err.message || 'Internal Server Error',
    data: null,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});