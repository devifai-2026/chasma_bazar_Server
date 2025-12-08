import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';

export const addToWishlist = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.userId;

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const existingWishlist = await Wishlist.findOne({ userId, productId });
    if (existingWishlist) {
      return res.status(400).json({
        success: false,
        message: 'Product already in wishlist',
      });
    }

    const wishlist = new Wishlist({
      userId,
      productId,
    });

    await wishlist.save();

    res.status(201).json({
      success: true,
      message: 'Product added to wishlist',
      data: wishlist,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const removeFromWishlist = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const wishlist = await Wishlist.findById(id);

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found',
      });
    }

    if (wishlist.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only remove your own wishlist items',
      });
    }

    await Wishlist.findByIdAndUpdate(id, { isDeleted: true });

    res.status(200).json({
      success: true,
      message: 'Product removed from wishlist',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getWishlist = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const wishlist = await Wishlist.find({ userId, isDeleted: false })
      .populate({
        path: 'productId',
        select: 'name price description productDiscount company',
        populate: { path: 'company', select: 'description' },
      })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Wishlist.countDocuments({ userId, isDeleted: false });

    res.status(200).json({
      success: true,
      data: wishlist,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const isInWishlist = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;

    const wishlist = await Wishlist.findOne({ userId, productId, isDeleted: false });

    res.status(200).json({
      success: true,
      isInWishlist: !!wishlist,
      wishlistId: wishlist?._id || null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
