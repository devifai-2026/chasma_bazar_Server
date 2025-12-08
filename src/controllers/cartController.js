import Cart from '../models/Cart.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundError,
  badRequestError
} from '../utils/response.js';
import { validateObjectId, validatePagination } from '../utils/validation.js';
import { verifyProductExists, verifyUserExists } from '../utils/dataVerification.js';

const cartController = {
  addToCart: async (req, res) => {
    try {
      const { productId, quantity = 1 } = req.body;
      const userId = req.user?.id || req.userId;

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

      const existingItem = await Cart.findOne({
        userId,
        productId,
        isDeleted: false,
      });

      if (existingItem) {
        existingItem.quantity += quantity;
        await existingItem.save();
        return successResponse(res, 200, 'Item quantity updated', existingItem);
      }

      const cartItem = new Cart({
        userId,
        productId,
        quantity,
      });

      await cartItem.save();
      await cartItem.populate('productId', 'name price');

      return createdResponse(res, 'Item added to cart', cartItem);
    } catch (error) {
      return errorResponse(res, 500, 'Error adding to cart', error.message);
    }
  },

  getCart: async (req, res) => {
    try {
      const userId = req.user?.id || req.userId;
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
        .populate('productId', 'name price colors description')
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
      const { quantity } = req.body;
      const userId = req.user?.id || req.userId;

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
      await cartItem.save();
      await cartItem.populate('productId', 'name price');

      return successResponse(res, 200, 'Cart item updated', cartItem);
    } catch (error) {
      return errorResponse(res, 500, 'Error updating cart item', error.message);
    }
  },

  removeFromCart: async (req, res) => {
    try {
      const { itemId } = req.params;
      const userId = req.user?.id || req.userId;

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
      const userId = req.user?.id || req.userId;

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
      const userId = req.user?.id || req.userId;

      const userVerification = await verifyUserExists(userId);
      if (!userVerification.exists) {
        return notFoundError(res, userVerification.error);
      }

      const cartItems = await Cart.find({ userId, isDeleted: false })
        .populate('productId', 'name price productDiscount');

      const summary = {
        itemCount: cartItems.length,
        subtotal: 0,
        totalDiscount: 0,
        total: 0,
        items: [],
      };

      for (const item of cartItems) {
        const price = item.productId.price || 0;
        const discount = parseFloat(item.productId.productDiscount || 0);
        const itemSubtotal = price * item.quantity;
        const itemDiscount = (itemSubtotal * discount) / 100;
        const itemTotal = itemSubtotal - itemDiscount;

        summary.subtotal += itemSubtotal;
        summary.totalDiscount += itemDiscount;
        summary.total += itemTotal;

        summary.items.push({
          _id: item._id,
          product: item.productId,
          quantity: item.quantity,
          subtotal: itemSubtotal,
          discount: itemDiscount,
          total: itemTotal,
        });
      }

      return successResponse(res, 200, 'Cart summary retrieved', summary);
    } catch (error) {
      return errorResponse(res, 500, 'Error getting cart summary', error.message);
    }
  },
};

export default cartController;
