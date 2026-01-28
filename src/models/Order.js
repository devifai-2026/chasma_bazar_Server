import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
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
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: 1,
      default: 1,
    },
    color: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      required: [true, 'Delivery address is required'],
    },
    addressId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserDeliveryAddress',
    },
    pricing: {
      productPrice: {
        type: Number,
        required: true,
      },
      discounts: {
        productDiscount: {
          type: Number,
          default: 0,
        },
        ruleBasedDiscount: {
          type: Number,
          default: 0,
        },
        promoCodeDiscount: {
          type: Number,
          default: 0,
        },
        totalDiscount: {
          type: Number,
          default: 0,
        },
      },
      tax: {
        type: Number,
        default: 0,
      },
      shippingCharges: {
        type: Number,
        default: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
      },
    },
    appliedDiscountIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Discount',
      },
    ],
    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },
    promoCodeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'PromoCode',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    trackingNumber: {
      type: String,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    actualDeliveryDate: {
      type: Date,
    },

    cancellationReason: {
      type: String,
    },
    cancelledAt: {
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

export default mongoose.model('Order', orderSchema);
