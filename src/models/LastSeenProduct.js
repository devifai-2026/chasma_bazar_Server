import mongoose from 'mongoose';

const lastSeenProductSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
    },
    lastViewedAt: {
      type: Date,
      default: Date.now,
    },
    viewCount: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique user-product combination
lastSeenProductSchema.index({ userId: 1, productId: 1 }, { unique: true });

export default mongoose.model('LastSeenProduct', lastSeenProductSchema);
