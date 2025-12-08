import Product from '../models/Product.js';
import Discount from '../models/Discount.js';

export const createProduct = async (req, res) => {
  try {
    const { name, type, frameType, userCategory, description, price, productDiscount, colors, company, specsType, model, appliedDiscounts, ...otherFields } = req.body;

    if (!name || !type || !frameType || !userCategory || !description || !price || !company) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided',
      });
    }

    // Validate discounts if provided
    if (appliedDiscounts && appliedDiscounts.length > 0) {
      const discounts = await Discount.find({
        _id: { $in: appliedDiscounts },
        isActive: true,
        isDeleted: false,
      });

      if (discounts.length !== appliedDiscounts.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more discounts are invalid or inactive',
        });
      }
    }

    const product = new Product({
      name,
      type,
      frameType,
      userCategory,
      description,
      price,
      productDiscount: productDiscount || 0,
      colors: colors || [],
      company,
      specsType,
      model,
      appliedDiscounts: appliedDiscounts || [],
      ...otherFields,
    });

    await product.save();

    // Populate discounts
    await product.populate('appliedDiscounts');

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { appliedDiscounts, ...otherUpdates } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Validate discounts if being updated
    if (appliedDiscounts !== undefined) {
      if (appliedDiscounts.length > 0) {
        const discounts = await Discount.find({
          _id: { $in: appliedDiscounts },
          isActive: true,
          isDeleted: false,
        });

        if (discounts.length !== appliedDiscounts.length) {
          return res.status(400).json({
            success: false,
            message: 'One or more discounts are invalid or inactive',
          });
        }
      }

      product.appliedDiscounts = appliedDiscounts;
    }

    // Update other fields
    Object.keys(otherUpdates).forEach((key) => {
      product[key] = otherUpdates[key];
    });

    await product.save();
    await product.populate('appliedDiscounts');
    await product.populate('frameType');
    await product.populate('company');

    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: product,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    const { category, company, frameType, page = 1, limit = 10 } = req.query;

    const filter = { isDeleted: false };

    if (category) filter.userCategory = category;
    if (company) filter.company = company;
    if (frameType) filter.frameType = frameType;

    const products = await Product.find(filter)
      .populate('frameType', 'name size width dimensions')
      .populate('company', 'description pinCode')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Product.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: products,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      total: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findOne({ _id: id, isDeleted: false })
      .populate('frameType')
      .populate('company')
      .populate('appliedDiscounts');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    // Calculate pricing based on assigned discounts
    const pricing = calculateProductPricing(product, 1);

    res.status(200).json({
      success: true,
      data: product,
      pricing,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Helper function to calculate pricing
export function calculateProductPricing(product, quantity = 1) {
  let totalDiscount = 0;
  let appliedDiscountDetails = [];

  // Check if product has assigned discounts
  if (product.appliedDiscounts && product.appliedDiscounts.length > 0) {
    const now = new Date();

    for (const discount of product.appliedDiscounts) {
      // Check if discount is valid (active and within date range)
      if (
        !discount.isActive ||
        discount.isDeleted ||
        discount.startDate > now ||
        discount.endDate < now
      ) {
        continue; // Skip invalid discounts
      }

      let discountAmount = 0;

      if (discount.discountType === 'percentage') {
        discountAmount = (product.price * discount.discountValue) / 100;

        // Apply max discount cap if specified
        if (discount.maxDiscount && discountAmount > discount.maxDiscount) {
          discountAmount = discount.maxDiscount;
        }
      } else if (discount.discountType === 'fixed') {
        discountAmount = Math.min(discount.discountValue, product.price);
      }

      if (discountAmount > 0) {
        totalDiscount += discountAmount;
        appliedDiscountDetails.push({
          discountId: discount._id,
          name: discount.name,
          type: discount.discountType,
          value: discount.discountValue,
          amount: discountAmount,
        });
      }
    }
  }

  const finalPrice = Math.max(product.price - totalDiscount, 0);

  return {
    originalPrice: product.price,
    discounts: appliedDiscountDetails,
    totalDiscount: totalDiscount,
    finalPrice: finalPrice,
    quantity: quantity,
    subtotal: finalPrice * quantity,
  };
}

