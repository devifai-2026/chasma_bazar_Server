import { Types } from 'mongoose';

const validateRequiredFields = (data, requiredFields) => {
  const missingFields = requiredFields.filter(field => !data[field]);

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`,
    };
  }

  return { isValid: true, error: null };
};

const validateObjectId = (id) => {
  if (!Types.ObjectId.isValid(id)) {
    return {
      isValid: false,
      error: 'Invalid ID format',
    };
  }

  return { isValid: true, error: null };
};

const validateEnum = (value, allowedValues, fieldName) => {
  if (!allowedValues.includes(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be one of: ${allowedValues.join(', ')}`,
    };
  }

  return { isValid: true, error: null };
};

const validateNumberRange = (value, min, max, fieldName) => {
  if (typeof value !== 'number' || value < min || value > max) {
    return {
      isValid: false,
      error: `${fieldName} must be a number between ${min} and ${max}`,
    };
  }

  return { isValid: true, error: null };
};

const validateStringLength = (value, minLength, maxLength, fieldName) => {
  if (typeof value !== 'string' || value.length < minLength || value.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be between ${minLength} and ${maxLength} characters`,
    };
  }

  return { isValid: true, error: null };
};

const validateEmail = (email) => {
  const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

  if (!emailRegex.test(email)) {
    return {
      isValid: false,
      error: 'Invalid email format',
    };
  }

  return { isValid: true, error: null };
};

const validateProductData = (data) => {
  const requiredFields = ['name', 'type', 'frameType', 'userCategory', 'description', 'price', 'company'];
  const requiredValidation = validateRequiredFields(data, requiredFields);

  if (!requiredValidation.isValid) {
    return requiredValidation;
  }

  const frameTypeValidation = validateObjectId(data.frameType);
  if (!frameTypeValidation.isValid) {
    return { isValid: false, error: `Invalid frameType ID format` };
  }

  const companyValidation = validateObjectId(data.company);
  if (!companyValidation.isValid) {
    return { isValid: false, error: `Invalid company ID format` };
  }

  const categoryValidation = validateEnum(data.userCategory, ['Men', 'Women', 'Kids'], 'userCategory');
  if (!categoryValidation.isValid) {
    return categoryValidation;
  }

  if (typeof data.price !== 'number' || data.price < 0) {
    return {
      isValid: false,
      error: 'Price must be a positive number',
    };
  }

  return { isValid: true, error: null };
};

const validateFrameData = (data) => {
  const requiredFields = ['name', 'size', 'width', 'dimensions'];
  return validateRequiredFields(data, requiredFields);
};

const validateCompanyData = (data) => {
  const requiredFields = ['description', 'pinCode'];
  return validateRequiredFields(data, requiredFields);
};

const validateOrderData = (data) => {
  if (!data.productId || !data.addressId) {
    return {
      isValid: false,
      error: 'Product ID and address ID are required',
    };
  }

  const productIdValidation = validateObjectId(data.productId);
  if (!productIdValidation.isValid) {
    return { isValid: false, error: 'Invalid product ID format' };
  }

  const addressIdValidation = validateObjectId(data.addressId);
  if (!addressIdValidation.isValid) {
    return { isValid: false, error: 'Invalid address ID format' };
  }

  return { isValid: true, error: null };
};

const validateReviewData = (data) => {
  if (!data.productId || !data.review) {
    return {
      isValid: false,
      error: 'Product ID and review text are required',
    };
  }

  const productIdValidation = validateObjectId(data.productId);
  if (!productIdValidation.isValid) {
    return { isValid: false, error: 'Invalid product ID format' };
  }

  if (typeof data.review !== 'string' || data.review.trim().length === 0) {
    return {
      isValid: false,
      error: 'Review must be a non-empty string',
    };
  }

  return { isValid: true, error: null };
};

const validateRatingData = (data) => {
  if (!data.productId || !data.rating) {
    return {
      isValid: false,
      error: 'Product ID and rating are required',
    };
  }

  const productIdValidation = validateObjectId(data.productId);
  if (!productIdValidation.isValid) {
    return { isValid: false, error: 'Invalid product ID format' };
  }

  const ratingValidation = validateEnum(data.rating.toString(), ['1', '2', '3', '4', '5'], 'rating');
  if (!ratingValidation.isValid) {
    return ratingValidation;
  }

  return { isValid: true, error: null };
};

const validateAddressData = (data) => {
  const requiredFields = ['address', 'pincode', 'phone'];
  return validateRequiredFields(data, requiredFields);
};

const validateUserSignup = (data) => {
  const requiredFields = ['username', 'email', 'password', 'phone'];
  const requiredValidation = validateRequiredFields(data, requiredFields);

  if (!requiredValidation.isValid) {
    return requiredValidation;
  }

  const emailValidation = validateEmail(data.email);
  if (!emailValidation.isValid) {
    return emailValidation;
  }

  if (data.username.length < 3) {
    return {
      isValid: false,
      error: 'Username must be at least 3 characters',
    };
  }

  if (data.password.length < 6) {
    return {
      isValid: false,
      error: 'Password must be at least 6 characters',
    };
  }

  return { isValid: true, error: null };
};

const validatePagination = (page = 1, limit = 10) => {
  const parsedPage = parseInt(page, 10) || 1;
  const parsedLimit = parseInt(limit, 10) || 10;

  if (parsedPage < 1) {
    return {
      isValid: false,
      error: 'Page must be greater than 0',
    };
  }

  if (parsedLimit < 1 || parsedLimit > 100) {
    return {
      isValid: false,
      error: 'Limit must be between 1 and 100',
    };
  }

  return {
    isValid: true,
    error: null,
    page: parsedPage,
    limit: parsedLimit,
  };
};

const validateUserPagination = (query) => {
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

export {
  validateRequiredFields,
  validateObjectId,
  validateEnum,
  validateNumberRange,
  validateStringLength,
  validateEmail,
  validateProductData,
  validateFrameData,
  validateCompanyData,
  validateOrderData,
  validateReviewData,
  validateRatingData,
  validateAddressData,
  validateUserSignup,
  validatePagination,
  validateUserPagination,
  validateUserData,
};
