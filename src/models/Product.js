import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
    },
    sku: {
      type: String,
      unique: true,
      sparse: true,
    },
    type: {
      type: String,
      required: [true, 'Product type is required'],
    },
    frameType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Frame',
      required: [true, 'Frame type is required'],
    },
    userCategory: {
      type: String,
      enum: ['Men', 'Women', 'Kids'],
      required: [true, 'User category is required'],
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: 0,
    },
    productDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    appliedDiscounts: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discount',
      },
    ],
    colors: [
      {
        color: String,
        hexCode: String,
        images: [
          {
            type: {
              type: String,
              enum: ['normal', '3d'],
              default: 'normal',
            },
            url: String,
            public_id: String,
            alt: String,
          },
        ],
      },
    ],
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    company: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Company',
      required: [true, 'Company is required'],
    },
    specsType: {
      type: String,
      enum: ['eyeglasses', 'sunglasses', 'computer_glasses', 'reading_glasses'],
    },
    model: {
      type: String,
    },
    material: {
      type: String,
    },
    weight: {
      type: Number,
      min: 0,
    },
    dimensions: {
      height: Number,
      width: Number,
      depth: Number,
    },
    warranty: {
      duration: Number,
      durationType: {
        type: String,
        enum: ['days', 'months', 'years'],
      },
      description: String,
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
    totalRatings: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    tags: [
      {
        type: String,
      },
    ],
    ageGroup: {
      type: String,
      enum: ['children', 'teens', 'adults', 'seniors', 'all'],
      default: 'all',
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

export default mongoose.model('Product', productSchema);
