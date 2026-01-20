import Discount from '../models/Discount.js';
import Product from '../models/Product.js';
import Frame from '../models/Frame.js';
import Company from '../models/Company.js';

// Create discount (Admin only)
export const createDiscount = async (req, res) => {
  try {
    const {
      name,
      description,
      discountType,
      discountValue,
      maxDiscount,
      applicableOn,
      applicableProducts,
      applicableFrames,
      applicableCompanies,
      applicableCategories,
      priority,
      canStackWithOther,
      canStackWithPromo,
      startDate,
      endDate,
      usageLimit,
      minOrderValue,
      minQuantity,
      isActive,
      isAutoApplied,
    } = req.body;

    // Validate required fields
    if (!name || !discountType || !discountValue || !applicableOn || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided (name, discountType, discountValue, applicableOn, startDate, endDate)',
      });
    }

    // Validate discount value
    if (discountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount value must be greater than 0',
      });
    }

    // Validate percentage discount
    if (discountType === 'percentage' && discountValue > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot exceed 100%',
      });
    }

    // Validate date range
    if (new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date',
      });
    }

    if (applicableOn === 'product') {
      if (!applicableProducts || applicableProducts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'applicableProducts is required when applicableOn is "product"',
        });
      }

      const products = await Product.find({ _id: { $in: applicableProducts }, isDeleted: false });
      if (products.length !== applicableProducts.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more products do not exist or have been deleted',
        });
      }
    }

    if (applicableOn === 'frame') {
      if (!applicableFrames || applicableFrames.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'applicableFrames is required when applicableOn is "frame"',
        });
      }

      const frames = await Frame.find({ _id: { $in: applicableFrames }, isDeleted: false });
      if (frames.length !== applicableFrames.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more frames do not exist or have been deleted',
        });
      }
    }

    if (applicableOn === 'company') {
      if (!applicableCompanies || applicableCompanies.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'applicableCompanies is required when applicableOn is "company"',
        });
      }
      // Validate companies exist
      const companies = await Company.find({ _id: { $in: applicableCompanies }, isDeleted: false });
      if (companies.length !== applicableCompanies.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more companies do not exist or have been deleted',
        });
      }
    }

    if (applicableOn === 'category') {
      if (!applicableCategories || applicableCategories.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'applicableCategories is required when applicableOn is "category"',
        });
      }
      const validCategories = ['Men', 'Women', 'Kids'];
      const invalidCategories = applicableCategories.filter(cat => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid categories: ${invalidCategories.join(', ')}. Valid categories are: ${validCategories.join(', ')}`,
        });
      }
    }

    // Create discount
    const discount = await Discount.create({
      name,
      description,
      discountType,
      discountValue,
      maxDiscount,
      applicableOn,
      applicableProducts: applicableProducts || [],
      applicableFrames: applicableFrames || [],
      applicableCompanies: applicableCompanies || [],
      applicableCategories: applicableCategories || [],
      priority: priority || 0,
      canStackWithOther: canStackWithOther || false,
      canStackWithPromo: canStackWithPromo !== undefined ? canStackWithPromo : true,
      startDate,
      endDate,
      usageLimit,
      minOrderValue: minOrderValue || 0,
      minQuantity: minQuantity || 1,
      isActive: isActive !== undefined ? isActive : true,
      isAutoApplied: isAutoApplied || false,
      createdBy: req.user ? req.user.userId : undefined,
    });

    // Populate references
    await discount.populate('applicableProducts', 'name');
    await discount.populate('applicableFrames', 'name');
    await discount.populate('applicableCompanies', 'name');

    res.status(201).json({
      success: true,
      message: 'Discount created successfully',
      discount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "something went wrong",
    });
  }
};

// Get all discounts (Admin)
export const getAllDiscounts = async (req, res) => {
  try {
    const { isActive, applicableOn, page = 1, limit = 20 } = req.query;

    const filter = { isDeleted: false };

    // Filter by active status
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    // Filter by applicableOn
    if (applicableOn) {
      filter.applicableOn = applicableOn;
    }

    const discounts = await Discount.find(filter)
      .populate('applicableProducts', 'name')
      .populate('applicableFrames', 'name')
      .populate('applicableCompanies', 'name')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Discount.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: discounts.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      discounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get active discounts for selection (Admin)
export const getActiveDiscounts = async (req, res) => {
  try {
    const now = new Date();

    const discounts = await Discount.find({
      isActive: true,
      isDeleted: false,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .select('name description discountType discountValue maxDiscount applicableOn priority')
      .sort({ priority: -1, name: 1 });

    res.status(200).json({
      success: true,
      count: discounts.length,
      discounts,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get single discount
export const getDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findOne({ _id: id, isDeleted: false })
      .populate('applicableProducts', 'name price')
      .populate('applicableFrames', 'name price')
      .populate('applicableCompanies', 'name')
      .populate('createdBy', 'name email');

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found',
      });
    }

    res.status(200).json({
      success: true,
      discount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update discount (Admin only)
export const updateDiscount = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Validate discount value if provided
    if (updates.discountValue !== undefined && updates.discountValue <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Discount value must be greater than 0',
      });
    }

    // Validate percentage discount
    if (updates.discountType === 'percentage' && updates.discountValue > 100) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot exceed 100%',
      });
    }

    // Validate date range if both provided
    if (updates.startDate && updates.endDate) {
      if (new Date(updates.startDate) >= new Date(updates.endDate)) {
        return res.status(400).json({
          success: false,
          message: 'End date must be after start date',
        });
      }
    }

    if (updates.applicableOn === 'product' && updates.applicableProducts) {
      if (updates.applicableProducts.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'applicableProducts cannot be empty when applicableOn is "product"',
        });
      }
      const products = await Product.find({ _id: { $in: updates.applicableProducts }, isDeleted: false });
      if (products.length !== updates.applicableProducts.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more products do not exist or have been deleted',
        });
      }
    }

    if (updates.applicableOn === 'frame' && updates.applicableFrames) {
      if (updates.applicableFrames.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'applicableFrames cannot be empty when applicableOn is "frame"',
        });
      }
      const frames = await Frame.find({ _id: { $in: updates.applicableFrames }, isDeleted: false });
      if (frames.length !== updates.applicableFrames.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more frames do not exist or have been deleted',
        });
      }
    }

    if (updates.applicableOn === 'company' && updates.applicableCompanies) {
      if (updates.applicableCompanies.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'applicableCompanies cannot be empty when applicableOn is "company"',
        });
      }
      const companies = await Company.find({ _id: { $in: updates.applicableCompanies }, isDeleted: false });
      if (companies.length !== updates.applicableCompanies.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more companies do not exist or have been deleted',
        });
      }
    }

    if (updates.applicableOn === 'category' && updates.applicableCategories) {
      if (updates.applicableCategories.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'applicableCategories cannot be empty when applicableOn is "category"',
        });
      }
      const validCategories = ['Men', 'Women', 'Kids'];
      const invalidCategories = updates.applicableCategories.filter(cat => !validCategories.includes(cat));
      if (invalidCategories.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid categories: ${invalidCategories.join(', ')}. Valid categories are: ${validCategories.join(', ')}`,
        });
      }
    }

    const discount = await Discount.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true,
    })
      .populate('applicableProducts', 'name')
      .populate('applicableFrames', 'name')
      .populate('applicableCompanies', 'name');

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Discount updated successfully',
      discount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Delete (soft delete) discount (Admin only)
export const deleteDiscount = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findByIdAndUpdate(
      id,
      { isDeleted: true, isActive: false },
      { new: true }
    );

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Discount deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Toggle discount active status (Admin only)
export const toggleDiscountStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const discount = await Discount.findById(id);

    if (!discount) {
      return res.status(404).json({
        success: false,
        message: 'Discount not found',
      });
    }

    discount.isActive = !discount.isActive;
    await discount.save();

    res.status(200).json({
      success: true,
      message: `Discount ${discount.isActive ? 'activated' : 'deactivated'} successfully`,
      discount,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
