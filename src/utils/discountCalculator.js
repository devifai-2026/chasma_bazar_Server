import Discount from '../models/Discount.js';
import PromoCode from '../models/PromoCode.js';
import Product from '../models/Product.js';

export const calculateDiscounts = async ({ productId, quantity = 1, promoCode = null, userId = null }) => {
  try {
    const product = await Product.findById(productId)
      .populate('frameType', '_id name')
      .populate('company', '_id name');

    if (!product || product.isDeleted) {
      throw new Error('Product not found or deleted');
    }

    const productPrice = product.price * quantity;
    let discountBreakdown = {
      productDiscount: 0,
      ruleBasedDiscount: 0,
      promoCodeDiscount: 0,
      totalDiscount: 0,
    };

    let appliedDiscountIds = [];
    let appliedPromoCode = null;

    if (product.productDiscount && product.productDiscount > 0) {
      discountBreakdown.productDiscount = (productPrice * product.productDiscount) / 100;
    }

    const now = new Date();
    const applicableDiscounts = await Discount.find({
      isActive: true,
      isDeleted: false,
      startDate: { $lte: now },
      endDate: { $gte: now },
      $or: [
        { usageLimit: { $exists: false } },
        { $expr: { $lt: ['$usageCount', '$usageLimit'] } },
      ],
    }).sort({ priority: -1, discountValue: -1 });

    let bestRuleBasedDiscount = 0;
    let bestDiscountDoc = null;

    for (const discount of applicableDiscounts) {
      const applies = checkDiscountApplies(discount, product, quantity, productPrice);

      if (applies) {
        const discountAmount = discount.calculateDiscount(product.price, quantity);

        if (discountAmount > bestRuleBasedDiscount) {
          bestRuleBasedDiscount = discountAmount;
          bestDiscountDoc = discount;
        }

        if (!discount.canStackWithOther) {
          break;
        }
      }
    }

    if (bestRuleBasedDiscount > 0 && bestDiscountDoc) {
      discountBreakdown.ruleBasedDiscount = bestRuleBasedDiscount * quantity;
      appliedDiscountIds.push(bestDiscountDoc._id);
    }

    if (promoCode && promoCode.trim() !== '') {
      const promoResult = await calculatePromoCodeDiscount({
        promoCode: promoCode.trim(),
        product,
        quantity,
        productPrice,
        currentDiscounts: discountBreakdown,
      });

      if (promoResult.isValid) {
        discountBreakdown.promoCodeDiscount = promoResult.discountAmount;
        appliedPromoCode = promoResult.promoCodeDoc;
      } else {
        return {
          success: false,
          error: promoResult.error,
        };
      }
    }

    discountBreakdown.totalDiscount =
      discountBreakdown.productDiscount +
      discountBreakdown.ruleBasedDiscount +
      discountBreakdown.promoCodeDiscount;

    const subtotal = productPrice;
    const discountedAmount = subtotal - discountBreakdown.totalDiscount;

    return {
      success: true,
      product,
      pricing: {
        subtotal,
        discounts: discountBreakdown,
        discountedAmount,
      },
      appliedDiscountIds,
      appliedPromoCode,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
};

const checkDiscountApplies = (discount, product, quantity, orderValue) => {
  if (orderValue < discount.minOrderValue) return false;
  if (quantity < discount.minQuantity) return false;

  switch (discount.applicableOn) {
    case 'global':
      return true;

    case 'product':
      return discount.applicableProducts.some(
        (id) => id.toString() === product._id.toString()
      );

    case 'frame':
      if (!product.frameType) return false;
      return discount.applicableFrames.some(
        (id) => id.toString() === product.frameType._id.toString()
      );

    case 'company':
      if (!product.company) return false;
      return discount.applicableCompanies.some(
        (id) => id.toString() === product.company._id.toString()
      );

    case 'category':
      return discount.applicableCategories.includes(product.userCategory);

    default:
      return false;
  }
};

const calculatePromoCodeDiscount = async ({ promoCode, product, quantity, productPrice, currentDiscounts }) => {
  try {
    const now = new Date();
    const promoCodeDoc = await PromoCode.findOne({
      code: promoCode.toUpperCase(),
      isActive: true,
      startDate: { $lte: now },
      endDate: { $gte: now },
    });

    if (!promoCodeDoc) {
      return {
        isValid: false,
        error: 'Promo code not found or expired',
      };
    }

    if (promoCodeDoc.usageCount >= promoCodeDoc.usageLimit) {
      return {
        isValid: false,
        error: 'Promo code usage limit exceeded',
      };
    }

    if (productPrice < promoCodeDoc.minOrderValue) {
      return {
        isValid: false,
        error: `Minimum order value of ${promoCodeDoc.minOrderValue} required for this promo code`,
      };
    }

    const promoApplies = checkPromoCodeApplies(promoCodeDoc, product);
    if (!promoApplies) {
      return {
        isValid: false,
        error: 'Promo code is not applicable to this product',
      };
    }

    const priceAfterOtherDiscounts = productPrice - currentDiscounts.productDiscount - currentDiscounts.ruleBasedDiscount;

    let discountAmount = 0;
    if (promoCodeDoc.discountType === 'percentage') {
      discountAmount = (priceAfterOtherDiscounts * promoCodeDoc.discountValue) / 100;

      if (promoCodeDoc.maxDiscount && discountAmount > promoCodeDoc.maxDiscount) {
        discountAmount = promoCodeDoc.maxDiscount;
      }
    } else {
      discountAmount = promoCodeDoc.discountValue;
    }

    discountAmount = Math.min(discountAmount, priceAfterOtherDiscounts);

    return {
      isValid: true,
      discountAmount: Math.max(0, discountAmount),
      promoCodeDoc,
    };
  } catch (error) {
    return {
      isValid: false,
      error: error.message,
    };
  }
};

const checkPromoCodeApplies = (promoCode, product) => {
  const hasApplicabilityRules =
    (promoCode.applicableProducts && promoCode.applicableProducts.length > 0) ||
    (promoCode.applicableFrames && promoCode.applicableFrames.length > 0) ||
    (promoCode.applicableCompanies && promoCode.applicableCompanies.length > 0);

  if (!hasApplicabilityRules) {
    return true;
  }

  if (promoCode.applicableProducts && promoCode.applicableProducts.length > 0) {
    const applies = promoCode.applicableProducts.some(
      (id) => id.toString() === product._id.toString()
    );
    if (applies) return true;
  }

  if (promoCode.applicableFrames && promoCode.applicableFrames.length > 0 && product.frameType) {
    const applies = promoCode.applicableFrames.some(
      (id) => id.toString() === product.frameType._id.toString()
    );
    if (applies) return true;
  }

  if (promoCode.applicableCompanies && promoCode.applicableCompanies.length > 0 && product.company) {
    const applies = promoCode.applicableCompanies.some(
      (id) => id.toString() === product.company._id.toString()
    );
    if (applies) return true;
  }

  return false;
};

export const calculateTax = (amount) => {
  return 0;
};

export const calculateShipping = (amount, quantity) => {
  return 0;
};
