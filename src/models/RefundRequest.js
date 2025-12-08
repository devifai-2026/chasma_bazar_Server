import mongoose from 'mongoose';

const refundRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: [true, 'Order ID is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    reason: {
      type: String,
      required: [true, 'Refund reason is required'],
      enum: [
        'defective_product',
        'wrong_item_received',
        'product_not_as_described',
        'changed_mind',
        'damaged_in_shipping',
        'other',
      ],
    },
    description: {
      type: String,
    },
    images: [
      {
        url: String,
        uploadedAt: Date,
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'refunded'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    refundAmount: {
      type: Number,
      min: 0,
    },
    approvalNotes: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model('RefundRequest', refundRequestSchema);
