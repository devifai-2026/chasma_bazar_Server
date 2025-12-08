import mongoose from 'mongoose';

const discountSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Discount name is required'],
      trim: true,
    },
    description: {
      type: String,
    },
    discountType: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: [true, 'Discount type is required'],
      default: 'percentage',
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    applicableOn: {
      type: String,
      enum: ['product', 'frame', 'company', 'category', 'global'],
      required: [true, 'Applicable on is required'],
    },
    // For product-specific discounts
    applicableProducts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
    // For frame-specific discounts
    applicableFrames: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Frame',
      },
    ],
    // For company-wide discounts
    applicableCompanies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Company',
      },
    ],
    // For category-based discounts (Men, Women, Kids)
    applicableCategories: [
      {
        type: String,
        enum: ['Men', 'Women', 'Kids'],
      },
    ],
    // Discount priority (higher number = higher priority)
    priority: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Stacking rules
    canStackWithOther: {
      type: Boolean,
      default: false,
    },
    canStackWithPromo: {
      type: Boolean,
      default: true,
    },
    // Date range for discount validity
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    // Usage limits
    usageLimit: {
      type: Number,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Minimum order requirements
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    minQuantity: {
      type: Number,
      default: 1,
      min: 1,
    },
    // Status and visibility
    isActive: {
      type: Boolean,
      default: true,
    },
    isAutoApplied: {
      type: Boolean,
      default: false,
    },
    // Admin tracking
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
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
discountSchema.index({ applicableOn: 1, isActive: 1, startDate: 1, endDate: 1 });
discountSchema.index({ applicableProducts: 1 });
discountSchema.index({ applicableFrames: 1 });
discountSchema.index({ applicableCompanies: 1 });

// Method to check if discount is currently valid
discountSchema.methods.isValid = function () {
  const now = new Date();
  return (
    this.isActive &&
    !this.isDeleted &&
    this.startDate <= now &&
    this.endDate >= now &&
    (this.usageLimit === undefined || this.usageCount < this.usageLimit)
  );
};

// Method to check if discount applies to a product
discountSchema.methods.appliesTo = function (productId, frameId, companyId, category) {
  if (!this.isValid()) return false;

  switch (this.applicableOn) {
    case 'global':
      return true;

    case 'product':
      return this.applicableProducts.some((id) => id.toString() === productId.toString());

    case 'frame':
      return this.applicableFrames.some((id) => id.toString() === frameId.toString());

    case 'company':
      return this.applicableCompanies.some((id) => id.toString() === companyId.toString());

    case 'category':
      return this.applicableCategories.includes(category);

    default:
      return false;
  }
};

// Method to calculate discount amount
discountSchema.methods.calculateDiscount = function (productPrice, quantity = 1) {
  if (!this.isValid()) return 0;

  const orderValue = productPrice * quantity;

  // Check minimum requirements
  if (orderValue < this.minOrderValue) return 0;
  if (quantity < this.minQuantity) return 0;

  let discountAmount = 0;

  if (this.discountType === 'percentage') {
    discountAmount = (productPrice * this.discountValue) / 100;

    // Apply max discount cap if specified
    if (this.maxDiscount && discountAmount > this.maxDiscount) {
      discountAmount = this.maxDiscount;
    }
  } else {
    // Fixed discount
    discountAmount = this.discountValue;
  }

  return Math.min(discountAmount, productPrice); // Discount can't exceed product price
};

export default mongoose.model('Discount', discountSchema);
