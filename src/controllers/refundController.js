import RefundRequest from '../models/RefundRequest.js';
import { validateObjectId, validatePagination } from '../utils/validation.js';
import { successResponse, errorResponse, notFoundError, badRequestError, createdResponse, paginatedResponse } from '../utils/response.js';
import { verifyOrderExists } from '../utils/dataVerification.js';

const refundController = {
  createRefund: async (req, res) => {
    try {
      const { orderId, reason, description, images } = req.body;
      const userId = req.user.userId;

      if (!orderId || !reason) {
        return badRequestError(res, 'Order ID and reason are required');
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

      const validReasons = [
        'defective_product',
        'wrong_item_received',
        'product_not_as_described',
        'changed_mind',
        'damaged_in_shipping',
        'other',
      ];

      if (!validReasons.includes(reason)) {
        return badRequestError(res, `Reason must be one of: ${validReasons.join(', ')}`);
      }

      const existingRequest = await RefundRequest.findOne({
        orderId,
        status: { $ne: 'rejected' },
      });

      if (existingRequest) {
        return badRequestError(res, 'Refund request already exists for this order');
      }

      const refundRequest = new RefundRequest({
        orderId,
        userId,
        reason,
        description,
        images: images ? images.map(url => ({ url, uploadedAt: new Date() })) : [],
      });

      await refundRequest.save();
      return createdResponse(res, 'Refund request created', refundRequest);
    } catch (error) {
      return errorResponse(res, 500, 'Error creating refund request', error.message);
    }
  },

  getUserRefunds: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { page = 1, limit = 10, status } = req.query;

      const { isValid, error, page: validPage, limit: validLimit } = validatePagination(page, limit);
      if (!isValid) {
        return badRequestError(res, error);
      }

      const skip = (validPage - 1) * validLimit;
      const filter = { userId };

      if (status) {
        filter.status = status;
      }

      const refunds = await RefundRequest.find(filter)
        .skip(skip)
        .limit(validLimit)
        .sort({ createdAt: -1 });

      const total = await RefundRequest.countDocuments(filter);

      return paginatedResponse(
        res,
        'Refund requests retrieved',
        refunds,
        validPage,
        Math.ceil(total / validLimit),
        total
      );
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving refund requests', error.message);
    }
  },

  getRefundById: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const idValidation = validateObjectId(id);
      if (!idValidation.isValid) {
        return badRequestError(res, idValidation.error);
      }

      const refundRequest = await RefundRequest.findById(id);

      if (!refundRequest) {
        return notFoundError(res, 'Refund request not found');
      }

      if (refundRequest.userId.toString() !== userId.toString()) {
        return errorResponse(res, 403, 'Unauthorized - Refund request does not belong to user');
      }

      return successResponse(res, 200, 'Refund request retrieved', refundRequest);
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving refund request', error.message);
    }
  },

  getPendingRefunds: async (req, res) => {
    try {
      const { page = 1, limit = 10 } = req.query;

      const { isValid, error, page: validPage, limit: validLimit } = validatePagination(page, limit);
      if (!isValid) {
        return badRequestError(res, error);
      }

      const skip = (validPage - 1) * validLimit;

      const refunds = await RefundRequest.find({ status: 'pending' })
        .populate('userId', 'username email')
        .populate('orderId', '_id')
        .skip(skip)
        .limit(validLimit)
        .sort({ createdAt: -1 });

      const total = await RefundRequest.countDocuments({ status: 'pending' });

      return paginatedResponse(
        res,
        'Pending refund requests retrieved',
        refunds,
        validPage,
        Math.ceil(total / validLimit),
        total
      );
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving pending refunds', error.message);
    }
  },

  approveRefund: async (req, res) => {
    try {
      const { id } = req.params;
      const { refundAmount, approvalNotes } = req.body;
      const adminId = req.user.userId;

      const idValidation = validateObjectId(id);
      if (!idValidation.isValid) {
        return badRequestError(res, idValidation.error);
      }

      if (!refundAmount) {
        return badRequestError(res, 'Refund amount is required');
      }

      const refundRequest = await RefundRequest.findByIdAndUpdate(
        id,
        {
          status: 'approved',
          refundAmount,
          approvalNotes,
          approvedBy: adminId,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!refundRequest) {
        return notFoundError(res, 'Refund request not found');
      }

      return successResponse(res, 200, 'Refund request approved', refundRequest);
    } catch (error) {
      return errorResponse(res, 500, 'Error approving refund request', error.message);
    }
  },

  rejectRefund: async (req, res) => {
    try {
      const { id } = req.params;
      const { approvalNotes } = req.body;
      const adminId = req.user.userId;

      const idValidation = validateObjectId(id);
      if (!idValidation.isValid) {
        return badRequestError(res, idValidation.error);
      }

      const refundRequest = await RefundRequest.findByIdAndUpdate(
        id,
        {
          status: 'rejected',
          approvalNotes,
          approvedBy: adminId,
          updatedAt: new Date(),
        },
        { new: true }
      );

      if (!refundRequest) {
        return notFoundError(res, 'Refund request not found');
      }

      return successResponse(res, 200, 'Refund request rejected', refundRequest);
    } catch (error) {
      return errorResponse(res, 500, 'Error rejecting refund request', error.message);
    }
  },
};

export default refundController;
