import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundError,
  badRequestError
} from '../utils/response.js';
import { validateObjectId, validatePagination } from '../utils/validation.js';
import { verifyProductExists, verifyUserExists } from '../utils/dataVerification.js';

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user?.userId || req.userId;

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

    const existingWishlist = await Wishlist.findOne({
      userId,
      productId,
      isDeleted: false
    });

    if (existingWishlist) {
      return badRequestError(res, 'Product already in wishlist');
    }

    const wishlist = new Wishlist({
      userId,
      productId,
    });

    await wishlist.save();
    await wishlist.populate({
      path: 'productId',
      select: 'name price colors description images frameType company productDiscount stock',
      populate: [
        { path: 'frameType', select: 'name' },
        { path: 'company', select: 'name logo' }
      ]
    });

    return createdResponse(res, 'Product added to wishlist', wishlist);
  } catch (error) {
    return errorResponse(res, 500, 'Error adding to wishlist', error.message);
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || req.userId;

    const validateId = validateObjectId(id);
    if (!validateId.isValid) {
      return badRequestError(res, validateId.error);
    }

    const userVerification = await verifyUserExists(userId);
    if (!userVerification.exists) {
      return notFoundError(res, userVerification.error);
    }

    const wishlist = await Wishlist.findOne({
      _id: id,
      isDeleted: false
    });

    if (!wishlist) {
      return notFoundError(res, 'Wishlist item not found');
    }

    if (wishlist.userId.toString() !== userId) {
      return errorResponse(res, 403, 'You can only remove your own wishlist items');
    }

    wishlist.isDeleted = true;
    await wishlist.save();

    return successResponse(res, 200, 'Product removed from wishlist');
  } catch (error) {
    return errorResponse(res, 500, 'Error removing from wishlist', error.message);
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user?.userId || req.userId;
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

    const wishlist = await Wishlist.find({ userId, isDeleted: false })
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

    const total = await Wishlist.countDocuments({ userId, isDeleted: false });

    return successResponse(res, 200, 'Wishlist retrieved', wishlist, {
      currentPage: validPage,
      totalPages: Math.ceil(total / validLimit),
      total,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Error retrieving wishlist', error.message);
  }
};

export const isInWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user?.userId || req.userId;

    const validateId = validateObjectId(productId);
    if (!validateId.isValid) {
      return badRequestError(res, validateId.error);
    }

    const userVerification = await verifyUserExists(userId);
    if (!userVerification.exists) {
      return notFoundError(res, userVerification.error);
    }

    const wishlist = await Wishlist.findOne({ userId, productId, isDeleted: false });

    return successResponse(res, 200, 'Wishlist check completed', {
      isInWishlist: !!wishlist,
      wishlistId: wishlist?._id || null,
    });
  } catch (error) {
    return errorResponse(res, 500, 'Error checking wishlist', error.message);
  }
};
