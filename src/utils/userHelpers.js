import User from '../models/User.js';

/**
 * Get user statistics for dashboard
 * @returns {Object} Statistics object with user counts
 */
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

/**
 * Format user object for API response
 * @param {Object} user - User document
 * @param {Number} skip - Number of records skipped (for display ID)
 * @param {Number} index - Index in current page
 * @returns {Object} Formatted user object
 */
const formatUserForResponse = (user, skip, index) => {
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
};

/**
 * Format user object for detailed view
 * @param {Object} user - User document
 * @returns {Object} Formatted user object
 */
const formatUserDetailForResponse = (user) => {
  return {
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
};

/**
 * Build user query filter from request parameters
 * @param {Object} params - Filter parameters
 * @returns {Object} MongoDB filter object
 */
const buildUserFilter = (params) => {
  const { search, role, status } = params;
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

  return filter;
};

/**
 * Build sort object for user queries
 * @param {String} sortField - Field to sort by
 * @param {String} sortDirection - Sort direction (asc/desc)
 * @returns {Object} MongoDB sort object
 */
const buildUserSort = (sortField, sortDirection) => {
  const sort = {};

  // Map UI field names to database field names
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

  return sort;
};

export {
  getUsersStatistics,
  formatUserForResponse,
  formatUserDetailForResponse,
  buildUserFilter,
  buildUserSort,
};
