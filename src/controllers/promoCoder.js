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
        .populate('applicableCompanies', 'description');

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

      const order = await Order.findOne({ _id: orderId, userId, isDeleted: false });
      if (!order) {
        return notFoundError(res, 'Order not found');
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

      if (promoCode.usageCount >= promoCode.usageLimit) {
        return badRequestError(res, 'Promo code usage limit exceeded');
      }

      const alreadyUsed = await UsedPromoCode.findOne({
        userId,
        promoCodeId: promoCode._id,
        orderId,
      });

      if (alreadyUsed) {
        return badRequestError(res, 'Promo code already applied to this order');
      }

      let discount = 0;
      if (promoCode.discountType === 'percentage') {
        discount = (order.totalAmount * promoCode.discountValue) / 100;
        if (promoCode.maxDiscount) {
          discount = Math.min(discount, promoCode.maxDiscount);
        }
      } else {
        discount = promoCode.discountValue;
      }

      const usedPromo = new UsedPromoCode({
        userId,
        promoCodeId: promoCode._id,
        orderId,
        discountApplied: discount,
      });

      await usedPromo.save();
      promoCode.usageCount += 1;
      await promoCode.save();

      return successResponse(res, 200, 'Promo code applied', {
        discountAmount: discount,
        totalAmount: order.totalAmount - discount,
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
};

export default promoCodeController;
