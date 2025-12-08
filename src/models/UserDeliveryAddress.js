import mongoose from 'mongoose';

const userDeliveryAddressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    name: {
      type: String,
      required: [true, 'Recipient name is required'],
      trim: true,
    },
    addressType: {
      type: String,
      enum: ['home', 'work', 'other'],
      default: 'home',
    },
    address: {
      type: String,
      required: [true, 'Address is required'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
    },
    country: {
      type: String,
      default: 'India',
    },
    pincode: {
      type: String,
      required: [true, 'Pincode is required'],
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
    },
    alternatePhone: {
      type: String,
    },
    landmark: {
      type: String,
    },
    isDefault: {
      type: Boolean,
      default: false,
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

export default mongoose.model('UserDeliveryAddress', userDeliveryAddressSchema);
