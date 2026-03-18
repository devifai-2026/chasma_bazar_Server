import mongoose from 'mongoose';

const frameSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Frame name is required'],
    },
    rimType: {
      type: String,
      enum: ['full', 'half', 'rimless'],
    },
    shape: {
      type: String,
      enum: ['round', 'square', 'rectangle', 'oval', 'cat-eye', 'aviator', 'wayfarer', 'clubmaster', 'geometric', 'other'],
    },
    material: {
      type: String,
      enum: ['plastic', 'metal', 'acetate', 'titanium', 'wood', 'carbon_fiber', 'mixed', 'other'],
    },
    color: {
      type: String,
    },
    size: {
      type: String,
      required: [true, 'Frame size is required'],
    },
    width: {
      type: String,
      required: [true, 'Frame width is required'],
    },
    dimensions: {
      type: String,
      required: [true, 'Frame dimensions are required'],
    },
    bridgeSize: {
      type: String,
    },
    templeLength: {
      type: String,
    },
    weight: {
      type: Number,
      min: 0,
    },
    price: {
      type: Number,
      min: 0,
    },
    frameDiscount: {
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
    images: [
      {
        url: String,
        public_id: String,
        alt: String,
      },
    ],
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

export default mongoose.model('Frame', frameSchema);
