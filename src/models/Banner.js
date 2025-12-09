import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Banner title is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      required: [true, 'Banner image URL is required'],
      trim: true,
    },
    buttonText: {
      type: String,
      trim: true,
      default: 'Shop Now',
    },
    buttonLink: {
      type: String,
      trim: true,
    },
    pages: {
      type: [String],
      default: ['all'],
      enum: {
        values: ['all', 'home', 'products', 'product-detail', 'cart', 'wishlist', 'checkout', 'orders', 'profile'],
        message: '{VALUE} is not a valid page'
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    priority: {
      type: Number,
      default: 0,
      comment: 'Higher number = higher priority in display order',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
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

// Index for efficient querying
bannerSchema.index({ isActive: 1, isDeleted: 1, priority: -1 });

// Method to check if banner is currently active based on date range
bannerSchema.methods.isCurrentlyActive = function () {
  const now = new Date();
  const isDateValid =
    (!this.startDate || this.startDate <= now) &&
    (!this.endDate || this.endDate >= now);
  return this.isActive && !this.isDeleted && isDateValid;
};

// Static method to get active banners by page
bannerSchema.statics.getActiveBannersByPage = function (page = 'all') {
  const now = new Date();
  return this.find({
    isActive: true,
    isDeleted: false,
    pages: { $in: ['all', page] },
    $and: [
      {
        $or: [
          { startDate: { $exists: false } },
          { startDate: null },
          { startDate: { $lte: now } },
        ],
      },
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      },
    ],
  }).sort({ priority: -1, createdAt: -1 });
};

// Static method to get all active banners
bannerSchema.statics.getActiveBanners = function () {
  const now = new Date();
  return this.find({
    isActive: true,
    isDeleted: false,
    $and: [
      {
        $or: [
          { startDate: { $exists: false } },
          { startDate: null },
          { startDate: { $lte: now } },
        ],
      },
      {
        $or: [
          { endDate: { $exists: false } },
          { endDate: null },
          { endDate: { $gte: now } },
        ],
      },
    ],
  }).sort({ priority: -1, createdAt: -1 });
};

export default mongoose.model('Banner', bannerSchema);
