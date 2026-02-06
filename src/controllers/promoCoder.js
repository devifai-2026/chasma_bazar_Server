import PromoCode from '../models/PromoCode.js';
import UsedPromoCode from '../models/UsedPromoCode.js';
import Order from '../models/Order.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundError,
  badRequestError,
  paginatedResponse
} from '../utils/response.js';
import { validateObjectId, validatePagination } from '../utils/validation.js';
import { calculateDiscounts } from '../utils/discountCalculator.js';

const promoCodeController = {
  createPromoCode: async (req, res) => {
    try {
      const {
        code,
        description,
        discountType,
        discountValue,
        maxDiscount,
        minOrderValue,
        usageLimit,
        applicableProducts,
        applicableFrames,
        applicableCompanies,
        startDate,
        endDate,
      } = req.body;

      if (!code || !discountValue || !usageLimit || !startDate || !endDate) {
        return badRequestError(res, 'Code, discount value, usage limit, start date, and end date are required');
      }

      if (new Date(startDate) >= new Date(endDate)) {
        return badRequestError(res, 'Start date must be before end date');
      }

      const existingPromo = await PromoCode.findOne({ code: code.toUpperCase() });
      if (existingPromo) {
        return badRequestError(res, 'Promo code already exists');
      }

      const promoCode = new PromoCode({
        code: code.toUpperCase(),
        description,
        discountType: discountType || 'percentage',
        discountValue,
        maxDiscount,
        minOrderValue: minOrderValue || 0,
        usageLimit,
        applicableProducts: applicableProducts || [],
        applicableFrames: applicableFrames || [],
        applicableCompanies: applicableCompanies || [],
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      await promoCode.save();
      return createdResponse(res, 'Promo code created successfully', promoCode);
    } catch (error) {
      return errorResponse(res, 500, 'Error creating promo code', error.message);
    }
  },

  getActivePromoCodes: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const { isValid, error, page: validPage, limit: validLimit } = validatePagination(page, limit);
      if (!isValid) {
        return badRequestError(res, error);
      }

      const now = new Date();
      const skip = (validPage - 1) * validLimit;

      const promoCodes = await PromoCode.find({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      })
        .skip(skip)
        .limit(validLimit)
        .sort({ createdAt: -1 });

      const total = await PromoCode.countDocuments({
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      });

      return paginatedResponse(
        res,
        'Active promo codes retrieved',
        promoCodes,
        validPage,
        Math.ceil(total / validLimit),
        total
      );
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving promo codes', error.message);
    }
  },

  getPromoCode: async (req, res) => {
    try {
      const { id } = req.params;

      const validateId = validateObjectId(id);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      const promoCode = await PromoCode.findById(id)
        .populate('applicableProducts', 'name')
        .populate('applicableFrames', 'name')
        .populate('applicableCompanies', 'name');

      if (!promoCode) {
        return notFoundError(res, 'Promo code not found');
      }

      return successResponse(res, 200, 'Promo code retrieved', promoCode);
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving promo code', error.message);
    }
  },

  applyPromoCode: async (req, res) => {
    try {
      const { code, orderId } = req.body;
      const userId = req.user.userId;

      if (!code || !orderId) {
        return badRequestError(res, 'Code and order ID are required');
      }

      const orderValidation = validateObjectId(orderId);
      if (!orderValidation.isValid) {
        return badRequestError(res, orderValidation.error);
      }

      const order = await Order.findOne({ _id: orderId, userId, isDeleted: false })
        .populate('productId');

      if (!order) {
        return notFoundError(res, 'Order not found');
      }

      if (order.promoCodeId) {
        return badRequestError(res, 'This order already has a promo code applied');
      }

      const discountResult = await calculateDiscounts({
        productId: order.productId._id,
        quantity: order.quantity,
        promoCode: code,
        userId,
      });

      if (!discountResult.success) {
        return badRequestError(res, discountResult.error);
      }

      const { pricing, appliedPromoCode } = discountResult;

      order.pricing.discounts = pricing.discounts;
      order.pricing.totalAmount = pricing.discountedAmount + order.pricing.tax + order.pricing.shippingCharges;
      order.promoCodeId = appliedPromoCode._id;

      await order.save();

      await PromoCode.findByIdAndUpdate(appliedPromoCode._id, {
        $inc: { usageCount: 1 },
      });

      const usedPromo = new UsedPromoCode({
        userId,
        promoCodeId: appliedPromoCode._id,
        orderId: order._id,
        discountApplied: pricing.discounts.promoCodeDiscount,
      });
      await usedPromo.save();

      return successResponse(res, 200, 'Promo code applied successfully', {
        discountAmount: pricing.discounts.promoCodeDiscount,
        totalAmount: order.pricing.totalAmount,
        order,
      });
    } catch (error) {
      return errorResponse(res, 500, 'Error applying promo code', error.message);
    }
  },

  updatePromoCode: async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const validateId = validateObjectId(id);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      if (updates.startDate || updates.endDate) {
        const startDate = new Date(updates.startDate || new Date());
        const endDate = new Date(updates.endDate || new Date());
        if (startDate >= endDate) {
          return badRequestError(res, 'Start date must be before end date');
        }
      }

      const promoCode = await PromoCode.findByIdAndUpdate(
        id,
        { ...updates, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!promoCode) {
        return notFoundError(res, 'Promo code not found');
      }

      return successResponse(res, 200, 'Promo code updated', promoCode);
    } catch (error) {
      return errorResponse(res, 500, 'Error updating promo code', error.message);
    }
  },

  deactivatePromoCode: async (req, res) => {
    try {
      const { id } = req.params;

      const validateId = validateObjectId(id);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      const promoCode = await PromoCode.findByIdAndUpdate(
        id,
        { isActive: false, updatedAt: new Date() },
        { new: true }
      );

      if (!promoCode) {
        return notFoundError(res, 'Promo code not found');
      }

      return successResponse(res, 200, 'Promo code deactivated', promoCode);
    } catch (error) {
      return errorResponse(res, 500, 'Error deactivating promo code', error.message);
    }
  },

  searchPromoByCode: async (req, res) => {
    try {
      const { code } = req.query;

      if (!code) {
        return badRequestError(res, 'Code is required');
      }

      const now = new Date();
      const promoCode = await PromoCode.findOne({
        code: code.toUpperCase(),
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now },
      });

      if (!promoCode) {
        return notFoundError(res, 'Promo code not found or expired');
      }

      return successResponse(res, 200, 'Promo code found', promoCode);
    } catch (error) {
      return errorResponse(res, 500, 'Error searching promo code', error.message);
    }
  },

  validatePromoCode: async (req, res) => {
    try {
      const { code, productId, quantity = 1 } = req.body;
      const userId = req.user.userId;

      if (!code || !productId) {
        return badRequestError(res, 'Code and product ID are required');
      }

      const productValidation = validateObjectId(productId);
      if (!productValidation.isValid) {
        return badRequestError(res, productValidation.error);
      }

      const discountResult = await calculateDiscounts({
        productId,
        quantity: Number(quantity),
        promoCode: code,
        userId,
      });

      if (!discountResult.success) {
        return badRequestError(res, discountResult.error);
      }

      const { pricing, appliedPromoCode } = discountResult;

      return successResponse(res, 200, 'Promo code is valid', {
        promoCode: {
          code: appliedPromoCode.code,
          description: appliedPromoCode.description,
          discountType: appliedPromoCode.discountType,
          discountValue: appliedPromoCode.discountValue,
        },
        pricing: {
          subtotal: pricing.subtotal,
          discounts: pricing.discounts,
          finalAmount: pricing.discountedAmount,
          savings: pricing.discounts.totalDiscount,
        },
      });
    } catch (error) {
      return errorResponse(res, 500, 'Error validating promo code', error.message);
    }
  },
};

export default promoCodeController;
