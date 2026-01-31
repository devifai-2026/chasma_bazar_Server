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
  getAllUsers: async (req, res) => {
    try {
      const validationResult = validateUserPagination(req.query);
      if (!validationResult.isValid) {
        return badRequestError(res, validationResult.errors.join(', '));
      }

      const {
        page,
        limit,
        search,
        role,
        status,
        sortField,
        sortDirection
      } = validationResult.value;

      const filter = buildUserFilter({ search, role, status });
      const sort = buildUserSort(sortField, sortDirection);
      const skip = (page - 1) * limit;

      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password')
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        User.countDocuments(filter),
      ]);

      const formattedUsers = users.map((user, index) =>
        formatUserForResponse(user, skip, index)
      );

      const statistics = await getUsersStatistics();

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

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

  getUsersStatistics: async (req, res) => {
    try {
      const statistics = await getUsersStatistics();
      return successResponse(res, 200, 'Statistics retrieved successfully', statistics);
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return serverError(res, 'Server error while fetching statistics', error.message);
    }
  },

  getUserById: async (req, res) => {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return badRequestError(res, 'Invalid user ID format');
      }

      const user = await User.findOne({
        _id: id,
        isDeleted: false,
      }).select('-password');

      if (!user) {
        return notFoundError(res, 'User not found');
      }

      const formattedUser = formatUserDetailForResponse(user);

      return successResponse(res, 200, 'User retrieved successfully', formattedUser);
    } catch (error) {
      console.error('Error fetching user:', error);
      return serverError(res, 'Server error while fetching user', error.message);
    }
  },

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

      const validationErrors = validateUserData(req.body, false);
      if (validationErrors.length > 0) {
        return badRequestError(res, validationErrors.join(', '));
      }

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

      const userResponse = await User.findById(user._id).select('-password');

      return createdResponse(res, 'User created successfully', userResponse);
    } catch (error) {
      console.error('Error creating user:', error);
      return serverError(res, 'Server error while creating user', error.message);
    }
  },

  updateUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return badRequestError(res, 'Invalid user ID format');
      }

      const validationErrors = validateUserData(req.body, true);
      if (validationErrors.length > 0) {
        return badRequestError(res, validationErrors.join(', '));
      }

      const user = await User.findOne({
        _id: id,
        isDeleted: false,
      });

      if (!user) {
        return notFoundError(res, 'User not found');
      }

      if (req.body.username && req.body.username !== user.username) {
        const existingUsername = await User.findOne({
          username: req.body.username,
          _id: { $ne: id }
        });

        if (existingUsername) {
          return badRequestError(res, 'Username already exists');
        }
      }

      if (req.body.email && req.body.email !== user.email) {
        const existingEmail = await User.findOne({
          email: req.body.email.toLowerCase(),
          _id: { $ne: id }
        });

        if (existingEmail) {
          return badRequestError(res, 'Email already exists');
        }
      }

      if (req.body.phone && req.body.phone !== user.phone) {
        const existingPhone = await User.findOne({
          phone: req.body.phone,
          _id: { $ne: id }
        });

        if (existingPhone) {
          return badRequestError(res, 'Phone number already exists');
        }
      }

      if (req.body.username !== undefined) user.username = req.body.username;
      if (req.body.firstName !== undefined) user.firstName = req.body.firstName;
      if (req.body.lastName !== undefined) user.lastName = req.body.lastName;
      if (req.body.email !== undefined) user.email = req.body.email.toLowerCase();
      if (req.body.phone !== undefined) user.phone = req.body.phone;
      if (req.body.role !== undefined) user.role = req.body.role.toLowerCase();
      if (req.body.accountStatus !== undefined) user.accountStatus = req.body.accountStatus.toLowerCase();
      if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;
      if (req.body.gender !== undefined) user.gender = req.body.gender?.toLowerCase();

      if (req.body.password) {
        user.password = req.body.password;
      }

      await user.save();

      const updatedUser = await User.findById(id).select('-password');

      return successResponse(res, 200, 'User updated successfully', updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      return serverError(res, 'Server error while updating user', error.message);
    }
  },

  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      if (!Types.ObjectId.isValid(id)) {
        return badRequestError(res, 'Invalid user ID format');
      }

      const user = await User.findById(id);

      if (!user) {
        return notFoundError(res, 'User not found');
      }

      if (user.isDeleted) {
        return badRequestError(res, 'User is already deleted');
      }

      user.isDeleted = true;
      user.accountStatus = 'inactive';
      await user.save();

      return successResponse(res, 200, 'User deleted successfully', null);
    } catch (error) {
      console.error('Error deleting user:', error);
      return serverError(res, 'Server error while deleting user', error.message);
    }
  },

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
