import Discount from '../models/Discount.js';

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
      createdBy: req.user ? req.user.id : undefined,
    });

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
