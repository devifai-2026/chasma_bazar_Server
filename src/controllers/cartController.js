import Cart from '../models/Cart.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundError,
  badRequestError
} from '../utils/response.js';
import { validateObjectId, validatePagination } from '../utils/validation.js';
import { verifyProductExists, verifyUserExists } from '../utils/dataVerification.js';
import { calculateDiscounts, calculateTax, calculateShipping } from '../utils/discountCalculator.js';

const cartController = {
  addToCart: async (req, res) => {
    try {
      const { productId, quantity = 1, color } = req.body;
      const userId = req.user.userId;

      if (!productId) {
        return badRequestError(res, 'Product ID is required');
      }

      const validateId = validateObjectId(productId);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      const userVerification = await verifyUserExists(userId);
      if (!userVerification.exists) {
        return notFoundError(res, userVerification.error);
      }

      const productVerification = await verifyProductExists(productId);
      if (!productVerification.exists) {
        return notFoundError(res, productVerification.error);
      }

      if (quantity < 1) {
        return badRequestError(res, 'Quantity must be at least 1');
      }

      // Check for existing item with same product and color
      const existingItemQuery = {
        userId,
        productId,
        isDeleted: false,
      };

      // If color is provided, check for matching color, otherwise match items without color
      if (color) {
        existingItemQuery.color = color;
      } else {
        existingItemQuery.$or = [{ color: { $exists: false } }, { color: null }, { color: '' }];
      }

      const existingItem = await Cart.findOne(existingItemQuery);

      if (existingItem) {
        existingItem.quantity += quantity;
        if (color) {
          existingItem.color = color;
        }
        await existingItem.save();
        await existingItem.populate({
          path: 'productId',
          select: 'name price colors description images frameType company productDiscount stock',
          populate: [
            { path: 'frameType', select: 'name' },
            { path: 'company', select: 'name logo' }
          ]
        });
        return successResponse(res, 200, 'Item quantity updated', existingItem);
      }

      const cartItem = new Cart({
        userId,
        productId,
        quantity,
        ...(color && { color }),
      });

      await cartItem.save();
      await cartItem.populate({
        path: 'productId',
        select: 'name price colors description images frameType company productDiscount stock',
        populate: [
          { path: 'frameType', select: 'name' },
          { path: 'company', select: 'name logo' }
        ]
      });

      return createdResponse(res, 'Item added to cart', cartItem);
    } catch (error) {
      return errorResponse(res, 500, 'Error adding to cart', error.message);
    }
  },

  getCart: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 10 } = req.query;

      const userVerification = await verifyUserExists(userId);
      if (!userVerification.exists) {
        return notFoundError(res, userVerification.error);
      }

      const { isValid, error, page: validPage, limit: validLimit } = validatePagination(page, limit);
      if (!isValid) {
        return badRequestError(res, error);
      }

      const skip = (validPage - 1) * validLimit;

      const cartItems = await Cart.find({ userId, isDeleted: false })
        .populate({
          path: 'productId',
          select: 'name price colors description images frameType company productDiscount stock isDeleted',
          populate: [
            { path: 'frameType', select: 'name' },
            { path: 'company', select: 'name logo' }
          ]
        })
        .skip(skip)
        .limit(validLimit)
        .sort({ createdAt: -1 });

      const total = await Cart.countDocuments({ userId, isDeleted: false });

      return successResponse(res, 200, 'Cart retrieved', cartItems, {
        currentPage: validPage,
        totalPages: Math.ceil(total / validLimit),
        total,
      });
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving cart', error.message);
    }
  },

  updateCartItem: async (req, res) => {
    try {
      const { itemId } = req.params;
      const { quantity, color } = req.body;
      const userId = req.user.userId;

      const validateId = validateObjectId(itemId);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      if (!quantity || quantity < 1) {
        return badRequestError(res, 'Quantity must be at least 1');
      }

      const userVerification = await verifyUserExists(userId);
      if (!userVerification.exists) {
        return notFoundError(res, userVerification.error);
      }

      const cartItem = await Cart.findOne({
        _id: itemId,
        userId,
        isDeleted: false,
      });

      if (!cartItem) {
        return notFoundError(res, 'Cart item not found');
      }

      cartItem.quantity = quantity;
      if (color !== undefined) {
        cartItem.color = color;
      }
      await cartItem.save();
      await cartItem.populate({
        path: 'productId',
        select: 'name price colors description images frameType company productDiscount stock',
        populate: [
          { path: 'frameType', select: 'name' },
          { path: 'company', select: 'name logo' }
        ]
      });

      return successResponse(res, 200, 'Cart item updated', cartItem);
    } catch (error) {
      return errorResponse(res, 500, 'Error updating cart item', error.message);
    }
  },

  removeFromCart: async (req, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user.userId;

      const validateId = validateObjectId(itemId);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      const userVerification = await verifyUserExists(userId);
      if (!userVerification.exists) {
        return notFoundError(res, userVerification.error);
      }

      const cartItem = await Cart.findOne({
        _id: itemId,
        userId,
        isDeleted: false,
      });

      if (!cartItem) {
        return notFoundError(res, 'Cart item not found');
      }

      cartItem.isDeleted = true;
      await cartItem.save();

      return successResponse(res, 200, 'Item removed from cart');
    } catch (error) {
      return errorResponse(res, 500, 'Error removing from cart', error.message);
    }
  },

  clearCart: async (req, res) => {
    try {
      const userId = req.user.userId;

      const userVerification = await verifyUserExists(userId);
      if (!userVerification.exists) {
        return notFoundError(res, userVerification.error);
      }

      await Cart.updateMany(
        { userId, isDeleted: false },
        { isDeleted: true }
      );

      return successResponse(res, 200, 'Cart cleared successfully');
    } catch (error) {
      return errorResponse(res, 500, 'Error clearing cart', error.message);
    }
  },

  getCartSummary: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { promoCode } = req.query;

      const userVerification = await verifyUserExists(userId);
      if (!userVerification.exists) {
        return notFoundError(res, userVerification.error);
      }

      const cartItems = await Cart.find({ userId, isDeleted: false })
        .populate({
          path: 'productId',
          select: 'name price colors description images frameType company productDiscount stock isDeleted',
          populate: [
            { path: 'frameType', select: 'name' },
            { path: 'company', select: 'name logo' }
          ]
        });

      const summary = {
        itemCount: cartItems.length,
        subtotal: 0,
        totalProductDiscount: 0,
        totalRuleBasedDiscount: 0,
        totalPromoCodeDiscount: 0,
        totalDiscount: 0,
        tax: 0,
        shippingCharges: 0,
        total: 0,
        items: [],
      };

      for (const item of cartItems) {
        if (!item.productId || item.productId.isDeleted) {
          continue;
        }

        const discountResult = await calculateDiscounts({
          productId: item.productId._id,
          quantity: item.quantity,
          promoCode: promoCode || null,
          userId,
        });

        if (!discountResult.success) {
          if (promoCode) {
            return errorResponse(res, 400, discountResult.error);
          }
          continue;
        }

        const { pricing } = discountResult;

        summary.subtotal += pricing.subtotal;
        summary.totalProductDiscount += pricing.discounts.productDiscount;
        summary.totalRuleBasedDiscount += pricing.discounts.ruleBasedDiscount;
        summary.totalPromoCodeDiscount += pricing.discounts.promoCodeDiscount;
        summary.totalDiscount += pricing.discounts.totalDiscount;

        summary.items.push({
          _id: item._id,
          product: item.productId,
          quantity: item.quantity,
          color: item.color,
          pricing: {
            subtotal: pricing.subtotal,
            discounts: pricing.discounts,
            discountedAmount: pricing.discountedAmount,
          },
        });
      }

      const totalDiscountedAmount = summary.subtotal - summary.totalDiscount;
      summary.tax = calculateTax(totalDiscountedAmount);
      summary.shippingCharges = calculateShipping(totalDiscountedAmount, summary.itemCount);
      summary.total = totalDiscountedAmount + summary.tax + summary.shippingCharges;

      return successResponse(res, 200, 'Cart summary retrieved', summary);
    } catch (error) {
      return errorResponse(res, 500, 'Error getting cart summary', error.message);
    }
  },
};

export default cartController;
