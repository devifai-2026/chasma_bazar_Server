import Frame from '../models/Frame.js';
import Discount from '../models/Discount.js';

export const createFrame = async (req, res) => {
  try {
    const { name, size, width, dimensions, frameDiscount, appliedDiscounts, ...otherFields } = req.body;

    if (!name || !size || !width || !dimensions) {
      return res.status(400).json({
        success: false,
        message: 'All required fields must be provided (name, size, width, dimensions)',
      });
    }


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

    const frame = new Frame({
      name,
      size,
      width,
      dimensions,
      frameDiscount: frameDiscount || 0,
      appliedDiscounts: appliedDiscounts || [],
      ...otherFields,
    });

    await frame.save();

    if (appliedDiscounts && appliedDiscounts.length > 0) {
      await frame.populate('appliedDiscounts');
    }

    res.status(201).json({
      success: true,
      message: 'Frame created successfully',
      data: frame,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateFrame = async (req, res) => {
  try {
    const { id } = req.params;
    const { appliedDiscounts, ...updates } = req.body;

    const frame = await Frame.findById(id);

    if (!frame) {
      return res.status(404).json({
        success: false,
        message: 'Frame not found',
      });
    }

    // Validate appliedDiscounts if being updated
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

      frame.appliedDiscounts = appliedDiscounts;
    }

    // Update other fields
    Object.keys(updates).forEach((key) => {
      frame[key] = updates[key];
    });

    await frame.save();
    await frame.populate('appliedDiscounts');

    res.status(200).json({
      success: true,
      message: 'Frame updated successfully',
      data: frame,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteFrame = async (req, res) => {
  try {
    const { id } = req.params;

    const frame = await Frame.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true }
    );

    if (!frame) {
      return res.status(404).json({
        success: false,
        message: 'Frame not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Frame deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllFrames = async (req, res) => {
  try {
    const {
      name,
      shape,
      material,
      color,
      size,
      minPrice,
      maxPrice,
      page = 1,
      limit = 20
    } = req.query;

    const filter = { isDeleted: false };
    if (name) {
      filter.name = { $regex: name, $options: 'i' };
    }
    if (shape) {
      filter.shape = shape;
    }
    if (material) {
      filter.material = material;
    }
    if (color) {
      filter.color = { $regex: color, $options: 'i' };
    }
    if (size) {
      filter.size = size;
    }
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) {
        filter.price.$gte = Number(minPrice);
      }
      if (maxPrice) {
        filter.price.$lte = Number(maxPrice);
      }
    }

    const frames = await Frame.find(filter)
      .populate('appliedDiscounts', 'name discountType discountValue')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Frame.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: frames.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      data: frames,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getFrame = async (req, res) => {
  try {
    const { id } = req.params;

    const frame = await Frame.findOne({ _id: id, isDeleted: false })
      .populate('appliedDiscounts');

    if (!frame) {
      return res.status(404).json({
        success: false,
        message: 'Frame not found',
      });
    }

    res.status(200).json({
      success: true,
      data: frame,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
