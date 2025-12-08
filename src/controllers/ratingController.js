import Rating from '../models/Rating.js';
import Product from '../models/Product.js';

export const addRating = async (req, res) => {
  try {
    const { productId, rating } = req.body;
    const userId = req.user.userId;

    if (!productId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and rating are required',
      });
    }

    if (!['1', '2', '3', '4', '5'].includes(rating.toString())) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const existingRating = await Rating.findOne({ userId, productId });

    if (existingRating) {
      existingRating.rating = rating;
      await existingRating.save();

      return res.status(200).json({
        success: true,
        message: 'Rating updated successfully',
        data: existingRating,
      });
    }

    const newRating = new Rating({
      userId,
      productId,
      rating,
    });

    await newRating.save();

    res.status(201).json({
      success: true,
      message: 'Rating added successfully',
      data: newRating,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteRating = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const rating = await Rating.findById(id);

    if (!rating) {
      return res.status(404).json({
        success: false,
        message: 'Rating not found',
      });
    }

    if (rating.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own ratings',
      });
    }

    await Rating.findByIdAndUpdate(id, { isDeleted: true });

    res.status(200).json({
      success: true,
      message: 'Rating deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProductRatings = async (req, res) => {
  try {
    const { productId } = req.params;

    const ratings = await Rating.find({ productId, isDeleted: false })
      .populate('userId', 'username');

    const averageRating = ratings.length > 0
      ? (ratings.reduce((sum, r) => sum + parseInt(r.rating), 0) / ratings.length).toFixed(2)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        averageRating,
        totalRatings: ratings.length,
        ratings,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserRatings = async (req, res) => {
  try {
    const userId = req.user.userId;

    const ratings = await Rating.find({ userId, isDeleted: false })
      .populate('productId', 'name price');

    res.status(200).json({
      success: true,
      data: ratings,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
