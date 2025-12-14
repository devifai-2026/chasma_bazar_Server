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
    const {
      category,
      company,
      frameType,
      frameShape,
      frameSize,
      minPrice,
      maxPrice,
      gender,
      material,
      search,
      page = 1,
      limit = 10,
    } = req.query;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be a positive integer',
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 300) {
      return res.status(400).json({
        success: false,
        message: 'Limit must be a positive integer between 1 and 300',
      });
    }

    // Validate price range
    if (minPrice && isNaN(Number(minPrice))) {
      return res.status(400).json({
        success: false,
        message: 'minPrice must be a valid number',
      });
    }

    if (maxPrice && isNaN(Number(maxPrice))) {
      return res.status(400).json({
        success: false,
        message: 'maxPrice must be a valid number',
      });
    }

    if (minPrice && maxPrice && Number(minPrice) > Number(maxPrice)) {
      return res.status(400).json({
        success: false,
        message: 'minPrice cannot be greater than maxPrice',
      });
    }

    // Validate gender/category
    const validCategories = ['Men', 'Women', 'Kids'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `category must be one of: ${validCategories.join(', ')}`,
      });
    }

    if (gender && !validCategories.includes(gender)) {
      return res.status(400).json({
        success: false,
        message: `gender must be one of: ${validCategories.join(', ')}`,
      });
    }

    // Validate material
    const validMaterials = [
      'Metal',
      'Plastic',
      'Acetate',
      'Titanium',
      'Stainless Steel',
      'Aluminum',
      'TR90',
      'Carbon Fiber',
      'Wood',
      'Nylon',
      'Polycarbonate',
      'Mixed Materials',
    ];

    if (material) {
      const materials = material.includes(',')
        ? material.split(',').map((m) => m.trim())
        : [material.trim()];

      const invalidMaterials = materials.filter((m) => !validMaterials.includes(m));

      if (invalidMaterials.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid material(s): ${invalidMaterials.join(', ')}. Valid materials are: ${validMaterials.join(', ')}`,
        });
      }
    }

    // Validate frameSize
    const validFrameSizes = ['small', 'medium', 'large', 'xlarge'];
    if (frameSize && !validFrameSizes.includes(frameSize)) {
      return res.status(400).json({
        success: false,
        message: `frameSize must be one of: ${validFrameSizes.join(', ')}`,
      });
    }

    // ========== Build Filter Query ==========

    const filter = { isDeleted: false };

    const categoryValue = category || gender;
    if (categoryValue) {
      filter.userCategory = categoryValue;
    }
    if (company) {
      filter.company = company.includes(',')
        ? { $in: company.split(',').map((id) => id.trim()) }
        : company.trim();
    }

    if (frameType) {
      filter.frameType = frameType.includes(',')
        ? { $in: frameType.split(',').map((id) => id.trim()) }
        : frameType.trim();
    }
    if (frameShape) {
      const Frame = mongoose.model('Frame');
      const frameShapes = frameShape.includes(',')
        ? frameShape.split(',').map((s) => s.trim())
        : [frameShape.trim()];

      const matchingFrames = await Frame.find({
        shape: { $in: frameShapes },
        isDeleted: false,
      }).select('_id');

      const frameIds = matchingFrames.map((frame) => frame._id);
      if (frameIds.length > 0) {
        if (filter.frameType) {
          const existingIds = Array.isArray(filter.frameType.$in)
            ? filter.frameType.$in
            : [filter.frameType];
          filter.frameType = {
            $in: frameIds.filter((id) =>
              existingIds.some((existingId) => existingId.toString() === id.toString())
            ),
          };
        } else {
          filter.frameType = { $in: frameIds };
        }
      } else {
        return res.status(200).json({
          success: true,
          data: [],
          totalPages: 0,
          currentPage: pageNum,
          total: 0,
          filters: {
            category: categoryValue,
            company,
            frameType,
            frameShape,
            frameSize,
            priceRange: { min: minPrice, max: maxPrice },
            gender,
            material,
            search,
          },
        });
      }
    }

    // Frame size filter - based on dimensions.width
    if (frameSize) {
      const sizeRanges = {
        small: { min: 130, max: 135 },
        medium: { min: 135, max: 140 },
        large: { min: 140, max: 145 },
        xlarge: { min: 145, max: Infinity },
      };

      const range = sizeRanges[frameSize];
      filter['dimensions.width'] = {
        $gte: range.min,
        $lte: range.max === Infinity ? 999999 : range.max,
      };
    }

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }

    if (material) {
      const materials = material.includes(',')
        ? material.split(',').map((m) => m.trim())
        : [material.trim()];

      filter.material =
        materials.length > 1 ? { $in: materials } : materials[0];
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex },
        { tags: { $in: [searchRegex] } },
      ];
    }

    const products = await Product.find(filter)
      .select('name price description colors stock material dimensions weight warranty averageRating totalReviews totalRatings type userCategory specsType model tags isFeatured productDiscount frameType company sku')
      .populate('frameType', 'name size width dimensions shape material')
      .populate('company', 'name description logo')
      .sort({ createdAt: -1 })
      .limit(limitNum)
      .skip((pageNum - 1) * limitNum)
      .exec();

    const totalCount = await Product.countDocuments(filter);


    res.status(200).json({
      success: true,
      data: products,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      total: totalCount,
      filters: {
        category: categoryValue,
        company,
        frameType,
        frameShape,
        frameSize,
        priceRange: { min: minPrice, max: maxPrice },
        gender,
        material,
        search,
      },
    });
  } catch (error) {
    console.error('Error in getAllProducts:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while fetching products',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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

