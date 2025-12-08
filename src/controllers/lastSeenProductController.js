import LastSeenProduct from '../models/LastSeenProduct.js';
import mongoose from 'mongoose';
import {
  successResponse,
  paginatedResponse,
  notFoundError,
  badRequestError,
  unauthorizedError,
  serverError,
} from '../utils/response.js';
import { validateObjectId, validatePagination } from '../utils/validation.js';
import { verifyProductExists, verifyUserExists } from '../utils/dataVerification.js';

const lastSeenProductController = {
  // Track product view - called when user views a product
  trackProductView: async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user._id;

      // Validate ObjectId
      if (!validateObjectId(productId)) {
        return badRequestError(res, 'Invalid product ID format');
      }

      // Verify product exists
      const productExists = await verifyProductExists(productId);
      if (!productExists.exists) {
        return notFoundError(res, productExists.error);
      }

      // Try to find existing record
      let lastSeenProduct = await LastSeenProduct.findOne({
        userId,
        productId,
      });

      if (lastSeenProduct) {
        // Update existing record
        lastSeenProduct.viewCount = (lastSeenProduct.viewCount || 1) + 1;
        lastSeenProduct.lastViewedAt = new Date();
        await lastSeenProduct.save();
      } else {
        // Create new record
        lastSeenProduct = new LastSeenProduct({
          userId,
          productId,
          viewCount: 1,
          lastViewedAt: new Date(),
        });
        await lastSeenProduct.save();
      }

      return successResponse(res, 'Product view tracked', lastSeenProduct);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get user's browsing history
  getUserBrowsingHistory: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10, sortBy = 'lastViewedAt' } = req.query;

      // Validate pagination
      const paginationValidation = validatePagination(page, limit);
      if (!paginationValidation.valid) {
        return badRequestError(res, paginationValidation.error);
      }

      const skip = (page - 1) * limit;

      // Get browsing history with product details
      const sortObj = {};
      if (sortBy === 'lastViewedAt') {
        sortObj.lastViewedAt = -1;
      } else if (sortBy === 'viewCount') {
        sortObj.viewCount = -1;
      } else {
        sortObj.lastViewedAt = -1;
      }

      const history = await LastSeenProduct.find({ userId })
        .populate('productId', 'name price description colors company')
        .sort(sortObj)
        .limit(limit)
        .skip(skip)
        .exec();

      const total = await LastSeenProduct.countDocuments({ userId });

      return paginatedResponse(res, history, total, page, limit, 'User browsing history retrieved');
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get most viewed products by user
  getMostViewedProducts: async (req, res) => {
    try {
      const userId = req.user._id;
      const { limit = 5 } = req.query;

      const parsedLimit = Math.min(parseInt(limit) || 5, 50);

      const mostViewed = await LastSeenProduct.find({ userId })
        .populate('productId', 'name price description colors company')
        .sort({ viewCount: -1 })
        .limit(parsedLimit)
        .exec();

      return successResponse(res, 'Most viewed products retrieved', mostViewed);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get recently viewed products
  getRecentlyViewedProducts: async (req, res) => {
    try {
      const userId = req.user._id;
      const { limit = 10 } = req.query;

      const parsedLimit = Math.min(parseInt(limit) || 10, 100);

      const recentlyViewed = await LastSeenProduct.find({ userId })
        .populate('productId', 'name price description colors company')
        .sort({ lastViewedAt: -1 })
        .limit(parsedLimit)
        .exec();

      return successResponse(res, 'Recently viewed products retrieved', recentlyViewed);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Clear browsing history
  clearBrowsingHistory: async (req, res) => {
    try {
      const userId = req.user._id;

      const result = await LastSeenProduct.deleteMany({ userId });

      return successResponse(res, 'Browsing history cleared', {
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Clear specific product from history
  clearProductFromHistory: async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = req.user._id;

      // Validate ObjectId
      if (!validateObjectId(productId)) {
        return badRequestError(res, 'Invalid product ID format');
      }

      const result = await LastSeenProduct.deleteOne({
        userId,
        productId,
      });

      if (result.deletedCount === 0) {
        return notFoundError(res, 'Product not found in browsing history');
      }

      return successResponse(res, 'Product removed from browsing history');
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get browsing history statistics
  getBrowsingStatistics: async (req, res) => {
    try {
      const userId = req.user._id;

      const totalProducts = await LastSeenProduct.countDocuments({ userId });
      const totalViews = await LastSeenProduct.aggregate([
        { $match: { userId: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, totalViews: { $sum: '$viewCount' } } },
      ]);

      const mostViewed = await LastSeenProduct.findOne({ userId })
        .sort({ viewCount: -1 })
        .populate('productId', 'name');

      const stats = {
        totalUniqueProducts: totalProducts,
        totalViews: totalViews[0]?.totalViews || 0,
        averageViewsPerProduct:
          totalProducts > 0 ? (totalViews[0]?.totalViews || 0) / totalProducts : 0,
        mostViewedProduct: mostViewed,
      };

      return successResponse(res, 'Browsing statistics retrieved', stats);
    } catch (error) {
      return serverError(res, error.message);
    }
  },
};

export default lastSeenProductController;
