import User from '../models/User.js';
import { Types } from 'mongoose';

// Helper function to get user statistics
const getUsersStatistics = async () => {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const statistics = await Promise.all([
    // Total users (non-deleted)
    User.countDocuments({ isDeleted: false }),
    
    // Active users
    User.countDocuments({ 
      isDeleted: false, 
      accountStatus: 'active' 
    }),
    
    // Admin users
    User.countDocuments({ 
      isDeleted: false, 
      role: 'admin' 
    }),
    
    // New users this month
    User.countDocuments({ 
      isDeleted: false,
      createdAt: { $gte: startOfMonth }
    }),
  ]);

  return {
    totalUsers: statistics[0],
    activeUsers: statistics[1],
    adminUsers: statistics[2],
    newThisMonth: statistics[3],
  };
};

// Validation functions
const validatePagination = (query) => {
  const { 
    page = 1, 
    limit = 10, 
    search = '', 
    role = '', 
    status = '',
    sortField = 'createdAt',
    sortDirection = 'desc'
  } = query;

  const errors = [];
  
  // Validate page
  const pageNum = parseInt(page);
  if (isNaN(pageNum) || pageNum < 1) {
    errors.push('Page must be a positive number');
  }

  // Validate limit
  const limitNum = parseInt(limit);
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    errors.push('Limit must be between 1 and 100');
  }

  // Validate sort direction
  if (!['asc', 'desc'].includes(sortDirection.toLowerCase())) {
    errors.push('Sort direction must be "asc" or "desc"');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    value: {
      page: pageNum,
      limit: limitNum,
      search: search.trim(),
      role: role.trim(),
      status: status.trim(),
      sortField: sortField.trim(),
      sortDirection: sortDirection.toLowerCase(),
    }
  };
};

const validateUserData = (data, isUpdate = false) => {
  const errors = [];

  // Username validation
  if (!isUpdate || data.username !== undefined) {
    const username = isUpdate ? data.username || '' : data.username;
    if (!username && !isUpdate) {
      errors.push('Username is required');
    } else if (username && (username.length < 3 || username.length > 30)) {
      errors.push('Username must be between 3 and 30 characters');
    }
  }

  // Email validation
  if (!isUpdate || data.email !== undefined) {
    const email = isUpdate ? data.email || '' : data.email;
    if (!email && !isUpdate) {
      errors.push('Email is required');
    } else if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push('Invalid email format');
    }
  }

  // Password validation (only for create)
  if (!isUpdate && (!data.password || data.password.length < 6)) {
    errors.push('Password must be at least 6 characters');
  }

  // Phone validation (optional)
  if (data.phone && !/^[0-9]{10,15}$/.test(data.phone)) {
    errors.push('Phone number must be 10-15 digits');
  }

  // Role validation
  const validRoles = ['admin', 'user', 'moderator'];
  if (data.role && !validRoles.includes(data.role.toLowerCase())) {
    errors.push(`Role must be one of: ${validRoles.join(', ')}`);
  }

  // Status validation
  const validStatuses = ['active', 'inactive', 'suspended'];
  if (data.accountStatus && !validStatuses.includes(data.accountStatus.toLowerCase())) {
    errors.push(`Status must be one of: ${validStatuses.join(', ')}`);
  }

  // Gender validation (optional)
  const validGenders = ['male', 'female', 'other'];
  if (data.gender && !validGenders.includes(data.gender.toLowerCase())) {
    errors.push(`Gender must be one of: ${validGenders.join(', ')}`);
  }

  return errors;
};

// Response helper functions
const successResponse = (res, data, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
  });
};

const errorResponse = (res, message, error = null, statusCode = 500) => {
  const response = {
    success: false,
    message,
  };
  
  if (error && process.env.NODE_ENV === 'development') {
    response.error = error;
  }
  
  return res.status(statusCode).json(response);
};

const badRequestError = (res, message) => {
  return errorResponse(res, message, null, 400);
};

const notFoundError = (res, message) => {
  return errorResponse(res, message, null, 404);
};

const createdResponse = (res, data, message = 'Created successfully') => {
  return successResponse(res, data, message, 201);
};

const userController = {
  /**
   * @desc    Get all users with pagination, filtering, and search
   * @route   GET /api/users
   * @access  Private/Admin
   */
  getAllUsers: async (req, res) => {
    try {
      // Validate pagination parameters
      const validationResult = validatePagination(req.query);
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
      
      // Build filter object - exclude deleted users by default
      const filter = { isDeleted: false };

      // Role filter
      if (role && role !== 'all' && role !== '') {
        filter.role = role.toLowerCase();
      }

      // Status filter
      if (status && status !== 'all' && status !== '') {
        filter.accountStatus = status.toLowerCase();
      }

      // Search filter
      if (search && search.trim() !== '') {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { username: searchRegex },
          { email: searchRegex },
          { firstName: searchRegex },
          { lastName: searchRegex },
          { phone: { $regex: search.trim(), $options: 'i' } },
        ];
      }

      // Calculate pagination
      const skip = (page - 1) * limit;

      // Build sort object - map UI field names to database field names
      const sort = {};
      const fieldMap = {
        'id': '_id',
        'name': 'username',
        'role': 'role',
        'status': 'accountStatus',
        'joinDate': 'createdAt',
        'USER': 'username',
        'ROLE': 'role',
        'STATUS': 'accountStatus',
        'JOIN_DATE': 'createdAt',
        'CONTACT': 'email',
      };
      
      const dbField = fieldMap[sortField] || sortField || 'createdAt';
      sort[dbField] = sortDirection.toLowerCase() === 'asc' ? 1 : -1;

      // Execute query with pagination
      const [users, total] = await Promise.all([
        User.find(filter)
          .select('-password') // Exclude password field
          .sort(sort)
          .skip(skip)
          .limit(parseInt(limit)),
        User.countDocuments(filter),
      ]);

      // Format users for UI response
      const formattedUsers = users.map((user, index) => {
        // Generate display ID like #001, #002, etc.
        const displayId = `#${String(skip + index + 1).padStart(3, '0')}`;
        
        // Create full name
        let fullName = user.username;
        if (user.firstName || user.lastName) {
          fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
        }
        
        return {
          id: user._id,
          displayId: displayId,
          user: {
            name: fullName,
            username: user.username,
            avatar: user.avatar?.url || null,
          },
          contact: {
            email: user.email,
            phone: user.phone || "N/A",
            isEmailVerified: user.isEmailVerified,
            isPhoneVerified: user.isPhoneVerified,
          },
          role: user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase(),
          status: user.accountStatus.charAt(0).toUpperCase() + user.accountStatus.slice(1),
          joinDate: user.createdAt,
          lastLogin: user.lastLogin,
          dateOfBirth: user.dateOfBirth,
          gender: user.gender,
          isDeleted: user.isDeleted,
        };
      });

      // Get statistics for the dashboard
      const statistics = await getUsersStatistics();

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;

      // Return comprehensive response
      return successResponse(res, {
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
      }, 'Users retrieved successfully');

    } catch (error) {
      console.error('Error fetching users:', error);
      return errorResponse(res, 'Server error while fetching users', error.message, 500);
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
      return successResponse(res, statistics, 'Statistics retrieved successfully');
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return errorResponse(res, 'Server error while fetching statistics', error.message, 500);
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
      const formattedUser = {
        id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        isEmailVerified: user.isEmailVerified,
        phone: user.phone,
        isPhoneVerified: user.isPhoneVerified,
        avatar: user.avatar,
        dateOfBirth: user.dateOfBirth,
        gender: user.gender,
        role: user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase(),
        accountStatus: user.accountStatus.charAt(0).toUpperCase() + user.accountStatus.slice(1),
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return successResponse(res, formattedUser, 'User retrieved successfully');
    } catch (error) {
      console.error('Error fetching user:', error);
      return errorResponse(res, 'Server error while fetching user', error.message, 500);
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

      return createdResponse(res, userResponse, 'User created successfully');
    } catch (error) {
      console.error('Error creating user:', error);
      return errorResponse(res, 'Server error while creating user', error.message, 500);
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

      return successResponse(res, updatedUser, 'User updated successfully');
    } catch (error) {
      console.error('Error updating user:', error);
      return errorResponse(res, 'Server error while updating user', error.message, 500);
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

      return successResponse(res, null, 'User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      return errorResponse(res, 'Server error while deleting user', error.message, 500);
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

      return successResponse(res, null, 'User restored successfully');
    } catch (error) {
      console.error('Error restoring user:', error);
      return errorResponse(res, 'Server error while restoring user', error.message, 500);
    }
  },
};

export default userController;