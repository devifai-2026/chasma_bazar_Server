import User from '../models/User.js';
import { Types } from 'mongoose';
import {
  successResponse,
  badRequestError,
  notFoundError,
  createdResponse,
  serverError,
} from '../utils/response.js';
import {
  validateUserPagination,
  validateUserData,
} from '../utils/validation.js';
import {
  getUsersStatistics,
  formatUserForResponse,
  formatUserDetailForResponse,
  buildUserFilter,
  buildUserSort,
} from '../utils/userHelpers.js';

const userController = {
  /**
   * @desc    Get all users with pagination, filtering, and search
   * @route   GET /api/users
   * @access  Private/Admin
   */
  getAllUsers: async (req, res) => {
    try {
      // Validate pagination parameters
      const validationResult = validateUserPagination(req.query);
      if (!validationResult.isValid) {
        return badRequestError(res, validationResult.errors.join(', '));
      }

      // Destructure validated values
      const {
        page,
        limit,
        search,
        role,
        status,
        sortField,
        sortDirection
      } = validationResult.value;

      // Build filter and sort objects
      const filter = buildUserFilter({ search, role, status });
      const sort = buildUserSort(sortField, sortDirection);

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Execute query with pagination
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        User.countDocuments(filter),
      ]);

      // Format users for UI response
      const formattedUsers = users.map((user, index) =>
        formatUserForResponse(user, skip, index)
      );

      // Get statistics for the dashboard
      const statistics = await getUsersStatistics();

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Return comprehensive response
      return successResponse(res, 200, 'Users retrieved successfully', {
        users: formattedUsers,
        pagination: {
          currentPage: page,
          pageSize: limit,
          totalItems: total,
          totalPages,
          hasNextPage,
          hasPrevPage,
          showingFrom: skip + 1,
          showingTo: Math.min(skip + limit, total),
        },
        statistics,
      });

    } catch (error) {
      console.error('Error fetching users:', error);
      return serverError(res, 'Server error while fetching users', error.message);
    }
  },

  /**
   * @desc    Get user dashboard statistics
   * @route   GET /api/users/statistics
   * @access  Private/Admin
   */
  getUsersStatistics: async (req, res) => {
    try {
      const statistics = await getUsersStatistics();
      return successResponse(res, 200, 'Statistics retrieved successfully', statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return serverError(res, 'Server error while fetching statistics', error.message);
    }
  },

  /**
   * @desc    Get a single user by ID
   * @route   GET /api/users/:id
   * @access  Private/Admin
   */
  getUserById: async (req, res) => {
    try {
      const { id } = req.params;

      // Validate ObjectId
      if (!Types.ObjectId.isValid(id)) {
        return badRequestError(res, 'Invalid user ID format');
      }

      // Find user (excluding password and deleted users by default)
      const user = await User.findOne({
        _id: id,
        isDeleted: false,
      }).select('-password');

      if (!user) {
        return notFoundError(res, 'User not found');
      }

      // Format user for detailed view
      const formattedUser = formatUserDetailForResponse(user);

      return successResponse(res, 200, 'User retrieved successfully', formattedUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      return serverError(res, 'Server error while fetching user', error.message);
    }
  },

  /**
   * @desc    Create a new user
   * @route   POST /api/users
   * @access  Private/Admin
   */
  createUser: async (req, res) => {
    try {
      const {
        username,
        firstName,
        lastName,
        email,
        phone,
        password,
        role = 'user',
        accountStatus = 'active',
        dateOfBirth,
        gender,
      } = req.body;

      // Validate user data
      const validationErrors = validateUserData(req.body, false);
      if (validationErrors.length > 0) {
        return badRequestError(res, validationErrors.join(', '));
      }

      // Check if user already exists
      const existingUser = await User.findOne({
        $or: [
          { username },
          { email: email.toLowerCase() },
          { phone }
        ]
      });

      if (existingUser) {
        let field = 'username';
        if (existingUser.email === email.toLowerCase()) field = 'email';
        if (existingUser.phone === phone) field = 'phone';

        return badRequestError(res, `User with this ${field} already exists`);
      }

      // Create new user
      const user = await User.create({
        username,
        firstName,
        lastName,
        email: email.toLowerCase(),
        phone,
        password,
        role: role.toLowerCase(),
        accountStatus: accountStatus.toLowerCase(),
        dateOfBirth,
        gender: gender?.toLowerCase(),
      });

      // Return user without password
      const userResponse = await User.findById(user._id).select('-password');

      return createdResponse(res, 'User created successfully', userResponse);
    } catch (error) {
      console.error('Error creating user:', error);
      return serverError(res, 'Server error while creating user', error.message);
    }
  },

  /**
   * @desc    Update user
   * @route   PUT /api/users/:id
   * @access  Private/Admin
   */
  updateUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return badRequestError(res, 'Invalid user ID format');
      }

      // Validate user data for update
      const validationErrors = validateUserData(req.body, true);
      if (validationErrors.length > 0) {
        return badRequestError(res, validationErrors.join(', '));
      }

      // Check if user exists and is not deleted
      const user = await User.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!user) {
        return notFoundError(res, 'User not found');
      }

      // Prevent updating username if it already exists for another user
      if (req.body.username && req.body.username !== user.username) {
        const existingUsername = await User.findOne({
          username: req.body.username,
          _id: { $ne: id }
        });

        if (existingUsername) {
          return badRequestError(res, 'Username already exists');
        }
      }

      // Prevent updating email if it already exists for another user
      if (req.body.email && req.body.email !== user.email) {
        const existingEmail = await User.findOne({
          email: req.body.email.toLowerCase(),
          _id: { $ne: id }
        });

        if (existingEmail) {
          return badRequestError(res, 'Email already exists');
        }
      }

      // Update user fields
      if (req.body.username !== undefined) user.username = req.body.username;
      if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
      if (req.body.email !== undefined) user.email = req.body.email.toLowerCase();
      if (req.body.phone !== undefined) user.phone = req.body.phone;
      if (req.body.role !== undefined) user.role = req.body.role.toLowerCase();
      if (req.body.accountStatus !== undefined) user.accountStatus = req.body.accountStatus.toLowerCase();
      if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;
      if (req.body.gender !== undefined) user.gender = req.body.gender?.toLowerCase();

      // If password is being updated, hash it
      if (req.body.password) {
        user.password = req.body.password;
      }

      await user.save();

      // Return updated user without password
      const updatedUser = await User.findById(id).select('-password');

      return successResponse(res, 200, 'User updated successfully', updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      return serverError(res, 'Server error while updating user', error.message);
    }
  },

  /**
   * @desc    Soft delete user (set isDeleted to true)
   * @route   DELETE /api/users/:id
   * @access  Private/Admin
   */
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return badRequestError(res, 'Invalid user ID format');
      }

      // Find user and soft delete
      const user = await User.findById(id);

      if (!user) {
        return notFoundError(res, 'User not found');
      }

      if (user.isDeleted) {
        return badRequestError(res, 'User is already deleted');
      }

      // Soft delete by setting isDeleted to true
      user.isDeleted = true;
      user.accountStatus = 'inactive';
      await user.save();

      return successResponse(res, 200, 'User deleted successfully', null);
    } catch (error) {
      console.error('Error deleting user:', error);
      return serverError(res, 'Server error while deleting user', error.message);
    }
  },

  /**
   * @desc    Restore soft-deleted user
   * @route   PUT /api/users/:id/restore
   * @access  Private/Admin
   */
  restoreUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return badRequestError(res, 'Invalid user ID format');
      }

      const user = await User.findById(id);

      if (!user) {
        return notFoundError(res, 'User not found');
      }

      if (!user.isDeleted) {
        return badRequestError(res, 'User is not deleted');
      }

      user.isDeleted = false;
      user.accountStatus = 'active';
      await user.save();

      return successResponse(res, 200, 'User restored successfully', null);
    } catch (error) {
      console.error('Error restoring user:', error);
      return serverError(res, 'Server error while restoring user', error.message);
    }
  },
};

export default userController;
