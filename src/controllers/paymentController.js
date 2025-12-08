import Payment from '../models/Payment.js';
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
import { verifyOrderExists } from '../utils/dataVerification.js';

const paymentController = {
  recordPayment: async (req, res) => {
    try {
      const {
        orderId,
        paymentMethod,
        amount,
        transactionId,
        paymentId: customPaymentId,
      } = req.body;
      const userId = req.user.userId;

      if (!orderId || !paymentMethod || !amount) {
        return badRequestError(res, 'Order ID, payment method, and amount are required');
      }

      const orderValidation = validateObjectId(orderId);
      if (!orderValidation.isValid) {
        return badRequestError(res, orderValidation.error);
      }

      const orderVerification = await verifyOrderExists(orderId);
      if (!orderVerification.exists) {
        return notFoundError(res, orderVerification.error);
      }

      const order = orderVerification.order;
      if (order.userId.toString() !== userId.toString()) {
        return errorResponse(res, 403, 'Unauthorized - Order does not belong to user');
      }

      const existingPayment = await Payment.findOne({ orderId, status: 'success' });
      if (existingPayment) {
        return badRequestError(res, 'Payment already processed for this order');
      }

      const payment = new Payment({
        orderId,
        userId,
        paymentId: customPaymentId || `PAY-${Date.now()}`,
        paymentMethod,
        amount,
        currency: 'INR',
        status: 'success',
        transactionId: transactionId || '',
      });

      await payment.save();

      order.status = 'processing';
      await order.save();

      return createdResponse(res, 'Payment recorded successfully', payment);
    } catch (error) {
      return errorResponse(res, 500, 'Error recording payment', error.message);
    }
  },

  getOrderPayment: async (req, res) => {
    try {
      const { orderId } = req.params;
      const userId = req.user.userId;

      const orderValidation = validateObjectId(orderId);
      if (!orderValidation.isValid) {
        return badRequestError(res, orderValidation.error);
      }

      const orderVerification = await verifyOrderExists(orderId);
      if (!orderVerification.exists) {
        return notFoundError(res, orderVerification.error);
      }

      const order = orderVerification.order;
      if (order.userId.toString() !== userId.toString()) {
        return errorResponse(res, 403, 'Unauthorized - Order does not belong to user');
      }

      const payment = await Payment.findOne({ orderId, isDeleted: false });

      if (!payment) {
        return notFoundError(res, 'Payment not found for this order');
      }

      return successResponse(res, 200, 'Payment details retrieved', payment);
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving payment', error.message);
    }
  },

  getUserPayments: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 10 } = req.query;

      const { isValid, error, page: validPage, limit: validLimit } = validatePagination(page, limit);
      if (!isValid) {
        return badRequestError(res, error);
      }

      const skip = (validPage - 1) * validLimit;

      const payments = await Payment.find({ userId })
        .skip(skip)
        .limit(validLimit)
        .sort({ createdAt: -1 });

      const total = await Payment.countDocuments({ userId });

      return paginatedResponse(
        res,
        'User payments retrieved',
        payments,
        validPage,
        Math.ceil(total / validLimit),
        total
      );
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving payments', error.message);
    }
  },

  updatePaymentStatus: async (req, res) => {
    try {
      const { paymentId } = req.params;
      const { status, failureReason } = req.body;

      if (!status) {
        return badRequestError(res, 'Status is required');
      }

      const validStatuses = ['pending', 'success', 'failed', 'refunded'];
      if (!validStatuses.includes(status)) {
        return badRequestError(res, `Status must be one of: ${validStatuses.join(', ')}`);
      }

      const payment = await Payment.findByIdAndUpdate(
        paymentId,
        {
          status,
          failureReason: status === 'failed' ? failureReason : null,
          updatedAt: new Date(),
        },
        { new: true, runValidators: true }
      );

      if (!payment) {
        return notFoundError(res, 'Payment not found');
      }

      return successResponse(res, 200, 'Payment status updated', payment);
    } catch (error) {
      return errorResponse(res, 500, 'Error updating payment status', error.message);
    }
  },

  getPaymentStats: async (req, res) => {
    try {
      const stats = await Payment.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
          },
        },
      ]);

      const result = {
        success: 0,
        failed: 0,
        pending: 0,
        refunded: 0,
        totalSuccessAmount: 0,
        totalFailedAmount: 0,
        totalPendingAmount: 0,
        totalRefundedAmount: 0,
      };

      for (const stat of stats) {
        if (stat._id === 'success') {
          result.success = stat.count;
          result.totalSuccessAmount = stat.totalAmount;
        } else if (stat._id === 'failed') {
          result.failed = stat.count;
          result.totalFailedAmount = stat.totalAmount;
        } else if (stat._id === 'pending') {
          result.pending = stat.count;
          result.totalPendingAmount = stat.totalAmount;
        } else if (stat._id === 'refunded') {
          result.refunded = stat.count;
          result.totalRefundedAmount = stat.totalAmount;
        }
      }

      return successResponse(res, 200, 'Payment statistics retrieved', result);
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving payment stats', error.message);
    }
  },
};

export default paymentController;
