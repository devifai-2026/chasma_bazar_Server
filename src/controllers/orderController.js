import Order from '../models/Order.js';
import Product from '../models/Product.js';
import UserDeliveryAddress from '../models/UserDeliveryAddress.js';
import PromoCode from '../models/PromoCode.js';
import { v4 as uuidv4 } from 'uuid';
import { calculateDiscounts, calculateTax, calculateShipping } from '../utils/discountCalculator.js';

export const createOrder = async (req, res) => {
  try {
    const { productId, addressId, color, quantity, promoCode } = req.body;
    const userId = req.user.userId;

    // Validate required fields
    if (!productId || !addressId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID and address ID are required',
      });
    }

    // Validate quantity
    const orderQuantity = quantity || 1;
    if (orderQuantity < 1 || !Number.isInteger(Number(orderQuantity))) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer',
      });
    }

    // Fetch product
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Check if product is deleted
    if (product.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'This product is no longer available',
      });
    }

    // Check stock availability
    if (product.stock < orderQuantity) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock. Only ${product.stock} items available`,
      });
    }

    // Validate color if product has colors
    if (product.colors && product.colors.length > 0) {
      if (!color) {
        return res.status(400).json({
          success: false,
          message: 'Please select a color for this product',
        });
      }

      const validColor = product.colors.find(c => c.color === color);
      if (!validColor) {
        return res.status(400).json({
          success: false,
          message: 'Selected color is not available for this product',
        });
      }
    }

    // Fetch and validate delivery address
    const deliveryAddress = await UserDeliveryAddress.findById(addressId);
    if (!deliveryAddress) {
      return res.status(404).json({
        success: false,
        message: 'Delivery address not found',
      });
    }

    if (deliveryAddress.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Invalid address',
      });
    }

    const discountResult = await calculateDiscounts({
      productId,
      quantity: orderQuantity,
      promoCode: promoCode || null,
      userId,
    });

    if (!discountResult.success) {
      return res.status(400).json({
        success: false,
        message: discountResult.error,
      });
    }

    const { pricing, appliedDiscountIds, appliedPromoCode } = discountResult;

    const orderTax = calculateTax(pricing.discountedAmount);

    const orderShippingCharges = calculateShipping(pricing.discountedAmount, orderQuantity);

    const totalAmount = pricing.discountedAmount + orderTax + orderShippingCharges;

    const orderId = `ORD-${uuidv4()}`;

    const order = new Order({
      orderId,
      userId,
      productId,
      quantity: orderQuantity,
      addressId,
      address: deliveryAddress.address,
      pricing: {
        productPrice: pricing.subtotal,
        discounts: pricing.discounts,
        tax: orderTax,
        shippingCharges: orderShippingCharges,
        totalAmount,
      },
      appliedDiscountIds: appliedDiscountIds || [],
      promoCodeId: appliedPromoCode ? appliedPromoCode._id : null,

      status: 'pending',
      ...(color && { color }),
    });

    await order.save();

    if (appliedPromoCode) {
      await PromoCode.findByIdAndUpdate(appliedPromoCode._id, {
        $inc: { usageCount: 1 },
      });
    }

    await order.populate('productId', 'name price colors productDiscount');
    await order.populate('promoCodeId', 'code discountType discountValue');

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 10 } = req.query;

    const orders = await Order.find({ userId, isDeleted: false })
      .populate({
        path: 'productId',
        select: 'name price description colors stock material dimensions weight warranty averageRating totalReviews type userCategory specsType model tags isFeatured productDiscount frameType company',
        populate: [
          {
            path: 'frameType',
            select: 'name shape material size width dimensions bridgeSize templeLength weight price frameDiscount',
          },
          {
            path: 'company',
            select: 'name description logo email phone address establishedYear rating totalRatings',
          },
        ],
      })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Order.countDocuments({ userId, isDeleted: false });

    res.status(200).json({
      success: true,
      data: orders,
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

export const getOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await Order.findOne({ _id: id, isDeleted: false })
      .populate({
        path: 'productId',
        select: 'name price description colors stock material dimensions weight warranty averageRating totalReviews type userCategory specsType model tags isFeatured productDiscount frameType company',
        populate: [
          {
            path: 'frameType',
            select: 'name shape material size width dimensions bridgeSize templeLength weight price frameDiscount',
          },
          {
            path: 'company',
            select: 'name description logo email phone address establishedYear rating totalRatings',
          },
        ],
      })
      .populate('userId', 'username email phone');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.userId._id.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only view your own orders',
      });
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required',
      });
    }

    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status',
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      {
        status,
      },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Order status updated successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const filter = { isDeleted: false };
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .populate('userId', 'username email phone')
      .populate('productId', 'name price colors productDiscount')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Order.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: orders,
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

export const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own orders',
      });
    }

    if (['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order in current status',
      });
    }

    order.status = 'cancelled';
    await order.save();

    res.status(200).json({
      success: true,
      message: 'Order cancelled successfully',
      data: order,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
