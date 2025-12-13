import Banner from '../models/Banner.js';
import {
  successResponse,
  createdResponse,
  errorResponse,
  notFoundError,
  badRequestError,
  paginatedResponse,
} from '../utils/response.js';
import { validateObjectId, validatePagination } from '../utils/validation.js';

const bannerController = {
  // Create new banner (Admin only)
  createBanner: async (req, res) => {
    try {
      const {
        title,
        description,
        image,
        buttonText,
        buttonLink,
        pages,
        position,
        isActive,
        priority,
        startDate,
        endDate,
      } = req.body;

      if (!title) {
        return badRequestError(res, 'Banner title is required');
      }

      if (!image) {
        return badRequestError(res, 'Banner image URL is required');
      }

      // Validate date range if provided
      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        return badRequestError(res, 'Start date cannot be after end date');
      }

      const banner = new Banner({
        title,
        description,
        image,
        buttonText,
        buttonLink,
        pages: pages && pages.length > 0 ? pages : ['all'],
        position: position || 'top',
        isActive,
        priority: priority || 0,
        startDate,
        endDate,
      });

      await banner.save();

      return createdResponse(res, 'Banner created successfully', banner);
    } catch (error) {
      return errorResponse(res, 500, 'Error creating banner', error.message);
    }
  },

  // Get all banners (with pagination and filters)
  getAllBanners: async (req, res) => {
    try {
      const { page = 1, limit = 10, isActive, includeDeleted } = req.query;

      const { isValid, error, page: validPage, limit: validLimit } = validatePagination(page, limit);
      if (!isValid) {
        return badRequestError(res, error);
      }

      const skip = (validPage - 1) * validLimit;

      // Build filter
      const filter = {};
      if (isActive !== undefined) {
        filter.isActive = isActive === 'true';
      }
      if (includeDeleted !== 'true') {
        filter.isDeleted = false;
      }

      const banners = await Banner.find(filter)
        .skip(skip)
        .limit(validLimit)
        .sort({ priority: -1, createdAt: -1 });

      const total = await Banner.countDocuments(filter);

      return paginatedResponse(
        res,
        'Banners retrieved successfully',
        banners,
        validPage,
        Math.ceil(total / validLimit),
        total
      );
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving banners', error.message);
    }
  },

  // Get active banners only (Public endpoint)
  getActiveBanners: async (req, res) => {
    try {
      const banners = await Banner.getActiveBanners();
      return successResponse(res, 200, 'Active banners retrieved', banners);
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving active banners', error.message);
    }
  },

  // Get active banners by page (Public endpoint)
  getActiveBannersByPage: async (req, res) => {
    try {
      const { page, position } = req.query;

      if (!page) {
        return badRequestError(res, 'Page parameter is required');
      }

      const validPages = ['all', 'home', 'products', 'product-detail', 'cart', 'wishlist', 'checkout', 'orders', 'profile'];
      if (!validPages.includes(page)) {
        return badRequestError(res, `Page must be one of: ${validPages.join(', ')}`);
      }

      const validPositions = ['top', 'middle', 'bottom', 'sidebar', 'popup'];
      if (position && !validPositions.includes(position)) {
        return badRequestError(res, `Position must be one of: ${validPositions.join(', ')}`);
      }

      const banners = await Banner.getActiveBannersByPageAndPosition(page, position);
      const message = position
        ? `Active banners for ${page} page at ${position} position retrieved`
        : `Active banners for ${page} page retrieved`;
      return successResponse(res, 200, message, banners);
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving banners by page', error.message);
    }
  },

  // Get single banner by ID
  getBannerById: async (req, res) => {
    try {
      const { id } = req.params;

      const validateId = validateObjectId(id);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      const banner = await Banner.findById(id);

      if (!banner || banner.isDeleted) {
        return notFoundError(res, 'Banner not found');
      }

      return successResponse(res, 200, 'Banner retrieved', banner);
    } catch (error) {
      return errorResponse(res, 500, 'Error retrieving banner', error.message);
    }
  },

  // Update banner (Admin only)
  updateBanner: async (req, res) => {
    try {
      const { id } = req.params;
      const {
        title,
        description,
        image,
        buttonText,
        buttonLink,
        pages,
        position,
        isActive,
        priority,
        startDate,
        endDate,
      } = req.body;

      const validateId = validateObjectId(id);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      // Validate date range if provided
      if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
        return badRequestError(res, 'Start date cannot be after end date');
      }

      const banner = await Banner.findById(id);

      if (!banner || banner.isDeleted) {
        return notFoundError(res, 'Banner not found');
      }

      // Update fields
      if (title !== undefined) banner.title = title;
      if (description !== undefined) banner.description = description;
      if (image !== undefined) banner.image = image;
      if (buttonText !== undefined) banner.buttonText = buttonText;
      if (buttonLink !== undefined) banner.buttonLink = buttonLink;
      if (pages !== undefined) banner.pages = pages;
      if (position !== undefined) banner.position = position;
      if (isActive !== undefined) banner.isActive = isActive;
      if (priority !== undefined) banner.priority = priority;
      if (startDate !== undefined) banner.startDate = startDate;
      if (endDate !== undefined) banner.endDate = endDate;

      banner.updatedAt = new Date();
      await banner.save();

      return successResponse(res, 200, 'Banner updated successfully', banner);
    } catch (error) {
      return errorResponse(res, 500, 'Error updating banner', error.message);
    }
  },

  // Toggle banner active status (Admin only)
  toggleBannerStatus: async (req, res) => {
    try {
      const { id } = req.params;

      const validateId = validateObjectId(id);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      const banner = await Banner.findById(id);

      if (!banner || banner.isDeleted) {
        return notFoundError(res, 'Banner not found');
      }

      banner.isActive = !banner.isActive;
      banner.updatedAt = new Date();
      await banner.save();

      return successResponse(
        res,
        200,
        `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully`,
        banner
      );
    } catch (error) {
      return errorResponse(res, 500, 'Error toggling banner status', error.message);
    }
  },

  // Delete banner (Soft delete - Admin only)
  deleteBanner: async (req, res) => {
    try {
      const { id } = req.params;

      const validateId = validateObjectId(id);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      const banner = await Banner.findById(id);

      if (!banner || banner.isDeleted) {
        return notFoundError(res, 'Banner not found');
      }

      banner.isDeleted = true;
      banner.updatedAt = new Date();
      await banner.save();

      return successResponse(res, 200, 'Banner deleted successfully');
    } catch (error) {
      return errorResponse(res, 500, 'Error deleting banner', error.message);
    }
  },

  // Permanently delete banner (Admin only)
  permanentlyDeleteBanner: async (req, res) => {
    try {
      const { id } = req.params;

      const validateId = validateObjectId(id);
      if (!validateId.isValid) {
        return badRequestError(res, validateId.error);
      }

      const banner = await Banner.findByIdAndDelete(id);

      if (!banner) {
        return notFoundError(res, 'Banner not found');
      }

      return successResponse(res, 200, 'Banner permanently deleted');
    } catch (error) {
      return errorResponse(res, 500, 'Error permanently deleting banner', error.message);
    }
  },
};

export default bannerController;
