import UsedPromoCode from '../models/UsedPromoCode.js';
import PromoCode from '../models/PromoCode.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';
import {
  successResponse,
  paginatedResponse,
  notFoundError,
  badRequestError,
  serverError,
} from '../utils/response.js';
import { validateObjectId, validatePagination } from '../utils/validation.js';

const usedPromoCodeController = {
  // Record promo code usage
  recordPromoCodeUsage: async (req, res) => {
    try {
      const { promoCodeId, orderId, discountApplied } = req.body;
      const userId = req.user._id;

      // Validate required fields
      if (!promoCodeId || !orderId || discountApplied === undefined) {
        return badRequestError(res, 'PromoCode ID, Order ID, and discount amount are required');
      }

      // Validate ObjectIds
      if (!validateObjectId(promoCodeId) || !validateObjectId(orderId)) {
        return badRequestError(res, 'Invalid PromoCode ID or Order ID format');
      }

      // Verify promoCode exists
      const promoCode = await PromoCode.findById(promoCodeId);
      if (!promoCode || promoCode.isDeleted) {
        return notFoundError(res, 'PromoCode not found');
      }

      // Verify order exists and belongs to user
      const order = await Order.findById(orderId);
      if (!order || order.isDeleted) {
        return notFoundError(res, 'Order not found');
      }

      if (order.userId.toString() !== userId.toString()) {
        return badRequestError(res, 'Order does not belong to this user');
      }

      // Create usage record
      const usedPromoCode = new UsedPromoCode({
        userId,
        promoCodeId,
        orderId,
        discountApplied,
      });

      await usedPromoCode.save();

      // Increment usage count on promo code
      promoCode.usageCount = (promoCode.usageCount || 0) + 1;
      await promoCode.save();

      return successResponse(res, 'Promo code usage recorded', usedPromoCode, 201);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get user's promo code usage history
  getUserPromoCodeHistory: async (req, res) => {
    try {
      const userId = req.user._id;
      const { page = 1, limit = 10 } = req.query;

      // Validate pagination
      const paginationValidation = validatePagination(page, limit);
      if (!paginationValidation.valid) {
        return badRequestError(res, paginationValidation.error);
      }

      const skip = (page - 1) * limit;

      const usedCodes = await UsedPromoCode.find({ userId })
        .populate('promoCodeId', 'code discountType discountValue')
        .populate('orderId', '_id status createdAt')
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip)
        .exec();

      const total = await UsedPromoCode.countDocuments({ userId });

      return paginatedResponse(res, usedCodes, total, page, limit, 'User promo code history retrieved');
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get promo code usage statistics
  getPromoCodeUsageStats: async (req, res) => {
    try {
      const userId = req.user._id;

      const stats = {
        totalPromoCodesUsed: 0,
        totalDiscountReceived: 0,
        averageDiscountPerCode: 0,
        recentCodesUsed: [],
      };

      // Get total promo codes used
      const codeUsages = await UsedPromoCode.find({ userId })
        .populate('promoCodeId', 'code discountType discountValue');

      stats.totalPromoCodesUsed = codeUsages.length;
      stats.totalDiscountReceived = codeUsages.reduce((sum, u) => sum + (u.discountApplied || 0), 0);
      stats.averageDiscountPerCode =
        codeUsages.length > 0 ? stats.totalDiscountReceived / codeUsages.length : 0;

      // Get 5 most recent codes used
      stats.recentCodesUsed = await UsedPromoCode.find({ userId })
        .populate('promoCodeId', 'code')
        .sort({ createdAt: -1 })
        .limit(5)
        .exec();

      return successResponse(res, 'Promo code usage statistics retrieved', stats);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get most popular promo codes (for admin)
  getMostPopularPromoCodes: async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const parsedLimit = Math.min(parseInt(limit) || 10, 50);

      // Group by promoCode and count usage
      const popularCodes = await UsedPromoCode.aggregate([
        {
          $group: {
            _id: '$promoCodeId',
            usageCount: { $sum: 1 },
            totalDiscountGiven: { $sum: '$discountApplied' },
          },
        },
        { $sort: { usageCount: -1 } },
        { $limit: parsedLimit },
        {
          $lookup: {
            from: 'promocodes',
            localField: '_id',
            foreignField: '_id',
            as: 'promoCode',
          },
        },
        { $unwind: '$promoCode' },
      ]);

      return successResponse(res, 'Most popular promo codes retrieved', popularCodes);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Check if user has used a specific promo code
  hasUserUsedCode: async (req, res) => {
    try {
      const { promoCodeId } = req.params;
      const userId = req.user._id;

      // Validate ObjectId
      if (!validateObjectId(promoCodeId)) {
        return badRequestError(res, 'Invalid PromoCode ID format');
      }

      const usage = await UsedPromoCode.findOne({
        userId,
        promoCodeId,
      });

      return successResponse(res, 'Code usage check complete', {
        hasBeenUsed: !!usage,
        usageDetails: usage,
      });
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get promo code usage by order
  getPromoCodesByOrder: async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user._id;

      // Validate ObjectId
      if (!validateObjectId(orderId)) {
        return badRequestError(res, 'Invalid Order ID format');
      }

      // Verify order belongs to user
      const order = await Order.findById(orderId);
      if (!order || order.isDeleted) {
        return notFoundError(res, 'Order not found');
      }

      if (order.userId.toString() !== userId.toString()) {
        return badRequestError(res, 'Order does not belong to this user');
      }

      const usedCodes = await UsedPromoCode.find({ orderId })
        .populate('promoCodeId', 'code discountType discountValue')
        .exec();

      return successResponse(res, 'Promo codes for order retrieved', usedCodes);
    } catch (error) {
      return serverError(res, error.message);
    }
  },

  // Get promo code usage report (for admin)
  getPromoCodeUsageReport: async (req, res) => {
    try {
      const { startDate, endDate, promoCodeId } = req.query;

      const filter = {};

      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      if (promoCodeId) {
        if (!validateObjectId(promoCodeId)) {
          return badRequestError(res, 'Invalid PromoCode ID format');
        }
        filter.promoCodeId = mongoose.Types.ObjectId(promoCodeId);
      }

      const usageData = await UsedPromoCode.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$promoCodeId',
            usageCount: { $sum: 1 },
            totalDiscountGiven: { $sum: '$discountApplied' },
            averageDiscount: { $avg: '$discountApplied' },
          },
        },
        {
          $lookup: {
            from: 'promocodes',
            localField: '_id',
            foreignField: '_id',
            as: 'promoCode',
          },
        },
        { $unwind: '$promoCode' },
        { $sort: { usageCount: -1 } },
      ]);

      const summary = {
        totalRecords: usageData.length,
        totalDiscountDistributed: usageData.reduce((sum, item) => sum + item.totalDiscountGiven, 0),
        details: usageData,
      };

      return successResponse(res, 'Promo code usage report retrieved', summary);
    } catch (error) {
      return serverError(res, error.message);
    }
  },
};

export default usedPromoCodeController;
