import Product from '../models/Product.js';
import Frame from '../models/Frame.js';
import Company from '../models/Company.js';
import User from '../models/User.js';
import UserDeliveryAddress from '../models/UserDeliveryAddress.js';
import Order from '../models/Order.js';
import Review from '../models/Review.js';
import Rating from '../models/Rating.js';
import Wishlist from '../models/Wishlist.js';

const verifyProductExists = async (productId) => {
  try {
    const product = await Product.findOne({ _id: productId, isDeleted: false });

    if (!product) {
      return {
        exists: false,
        product: null,
        error: 'Product not found or has been deleted',
      };
    }

    return {
      exists: true,
      product,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      product: null,
      error: `Error verifying product: ${error.message}`,
    };
  }
};

const verifyFrameExists = async (frameId) => {
  try {
    const frame = await Frame.findOne({ _id: frameId, isDeleted: false });

    if (!frame) {
      return {
        exists: false,
        frame: null,
        error: 'Frame not found or has been deleted',
      };
    }

    return {
      exists: true,
      frame,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      frame: null,
      error: `Error verifying frame: ${error.message}`,
    };
  }
};

const verifyCompanyExists = async (companyId) => {
  try {
    const company = await Company.findOne({ _id: companyId, isDeleted: false });

    if (!company) {
      return {
        exists: false,
        company: null,
        error: 'Company not found or has been deleted',
      };
    }

    return {
      exists: true,
      company,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      company: null,
      error: `Error verifying company: ${error.message}`,
    };
  }
};

const verifyUserExists = async (userId) => {
  try {
    const user = await User.findOne({ _id: userId, isDeleted: false });

    if (!user) {
      return {
        exists: false,
        user: null,
        error: 'User not found or has been deleted',
      };
    }

    return {
      exists: true,
      user,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      user: null,
      error: `Error verifying user: ${error.message}`,
    };
  }
};

const verifyAddressExists = async (addressId, userId) => {
  try {
    const address = await UserDeliveryAddress.findOne({
      _id: addressId,
      userId,
      isDeleted: false,
    });

    if (!address) {
      return {
        exists: false,
        address: null,
        error: 'Delivery address not found or does not belong to you',
      };
    }

    return {
      exists: true,
      address,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      address: null,
      error: `Error verifying address: ${error.message}`,
    };
  }
};

const verifyOrderExists = async (orderId) => {
  try {
    const order = await Order.findOne({ _id: orderId, isDeleted: false });

    if (!order) {
      return {
        exists: false,
        order: null,
        error: 'Order not found or has been deleted',
      };
    }

    return {
      exists: true,
      order,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      order: null,
      error: `Error verifying order: ${error.message}`,
    };
  }
};

const verifyReviewExists = async (reviewId) => {
  try {
    const review = await Review.findOne({ _id: reviewId, isDeleted: false });

    if (!review) {
      return {
        exists: false,
        review: null,
        error: 'Review not found or has been deleted',
      };
    }

    return {
      exists: true,
      review,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      review: null,
      error: `Error verifying review: ${error.message}`,
    };
  }
};

const verifyRatingExists = async (ratingId) => {
  try {
    const rating = await Rating.findOne({ _id: ratingId, isDeleted: false });

    if (!rating) {
      return {
        exists: false,
        rating: null,
        error: 'Rating not found or has been deleted',
      };
    }

    return {
      exists: true,
      rating,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      rating: null,
      error: `Error verifying rating: ${error.message}`,
    };
  }
};

const verifyWishlistExists = async (wishlistId) => {
  try {
    const wishlist = await Wishlist.findOne({ _id: wishlistId, isDeleted: false });

    if (!wishlist) {
      return {
        exists: false,
        wishlist: null,
        error: 'Wishlist item not found or has been deleted',
      };
    }

    return {
      exists: true,
      wishlist,
      error: null,
    };
  } catch (error) {
    return {
      exists: false,
      wishlist: null,
      error: `Error verifying wishlist: ${error.message}`,
    };
  }
};

const verifyProductCreationData = async (productData) => {
  const errors = [];

  const frameVerification = await verifyFrameExists(productData.frameType);
  if (!frameVerification.exists) {
    errors.push(frameVerification.error);
  }

  const companyVerification = await verifyCompanyExists(productData.company);
  if (!companyVerification.exists) {
    errors.push(companyVerification.error);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

const verifyOrderCreationData = async (productId, addressId, userId) => {
  const errors = [];
  let product = null;
  let address = null;

  const productVerification = await verifyProductExists(productId);
  if (!productVerification.exists) {
    errors.push(productVerification.error);
  } else {
    product = productVerification.product;
  }

  const addressVerification = await verifyAddressExists(addressId, userId);
  if (!addressVerification.exists) {
    errors.push(addressVerification.error);
  } else {
    address = addressVerification.address;
  }

  return {
    valid: errors.length === 0,
    errors,
    product,
    address,
  };
};

const verifyReviewCreationData = async (productId) => {
  const verification = await verifyProductExists(productId);

  return {
    valid: verification.exists,
    error: verification.error,
    product: verification.product,
  };
};

const verifyRatingCreationData = async (productId) => {
  const verification = await verifyProductExists(productId);

  return {
    valid: verification.exists,
    error: verification.error,
    product: verification.product,
  };
};

const verifyWishlistCreationData = async (productId) => {
  const verification = await verifyProductExists(productId);

  return {
    valid: verification.exists,
    error: verification.error,
    product: verification.product,
  };
};

export {
  verifyProductExists,
  verifyFrameExists,
  verifyCompanyExists,
  verifyUserExists,
  verifyAddressExists,
  verifyOrderExists,
  verifyReviewExists,
  verifyRatingExists,
  verifyWishlistExists,
  verifyProductCreationData,
  verifyOrderCreationData,
  verifyReviewCreationData,
  verifyRatingCreationData,
  verifyWishlistCreationData,
};
