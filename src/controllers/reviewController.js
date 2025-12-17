import Review from '../models/Review.js';
import Product from '../models/Product.js';
import Rating from '../models/Rating.js';

export const createReview = async (req, res) => {
  try {
    const { productId, review } = req.body;
    const userId = req.user.userId;

    if (!productId || !review) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and review text are required',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const newReview = new Review({
      userId,
      productId,
      review,
      images: req.body.images || [],
    });

    await newReview.save();

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: newReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { review, images } = req.body;

    const existingReview = await Review.findById(id);

    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (existingReview.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews',
      });
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { review, images },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: updatedReview,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;

    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found',
      });
    }

    if (userRole !== 'admin' && review.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews',
      });
    }

    await Review.findByIdAndUpdate(id, { isDeleted: true });

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const reviews = await Review.find({ productId, isDeleted: false })
      .populate('userId', 'username email')
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Review.countDocuments({ productId, isDeleted: false });

    res.status(200).json({
      success: true,
      data: reviews,
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

export const getUserReviews = async (req, res) => {
  try {
    const userId = req.user.userId;

    const reviews = await Review.find({ userId, isDeleted: false })
      .populate('productId', 'name price')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getRandomGoodReviews = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const minRating = parseFloat(req.query.minRating) || 4;

    const goodReviews = await Review.aggregate([
      {
        $match: {
          isDeleted: false,
        },
      },
      {
        $lookup: {
          from: 'ratings',
          let: { userId: '$userId', productId: '$productId' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$userId', '$$userId'] },
                    { $eq: ['$productId', '$$productId'] },
                    { $eq: ['$isDeleted', false] },
                    { $gte: ['$rating', minRating] },
                  ],
                },
              },
            },
          ],
          as: 'userRating',
        },
      },
      {
        $match: {
          userRating: { $ne: [] },
        },
      },
      {
        $unwind: '$userRating',
      },
      {
        $sample: { size: limit },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $unwind: '$user',
      },
      {
        $lookup: {
          from: 'products',
          localField: 'productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      {
        $unwind: '$product',
      },
      {
        $project: {
          _id: 1,
          review: 1,
          images: 1,
          helpfulCount: 1,
          isVerifiedPurchase: 1,
          createdAt: 1,
          updatedAt: 1,
          user: {
            _id: '$user._id',
            username: '$user.username',
            email: '$user.email',
          },
          product: {
            _id: '$product._id',
            name: '$product.name',
            price: '$product.price',
          },
          rating: '$userRating.rating',
        },
      },
      {
        $sort: { createdAt: -1 },
      },
    ]);

    res.status(200).json({
      success: true,
      count: goodReviews.length,
      data: goodReviews,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
