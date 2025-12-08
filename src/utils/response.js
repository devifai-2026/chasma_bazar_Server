const successResponse = (res, statusCode = 200, message = 'Success', data = null, pagination = null) => {
  const response = {
    success: true,
    status: 'success',
    statusCode,
    message,
    data: data !== null ? data : null,
    timestamp: new Date().toISOString(),
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode = 500, message = 'Internal Server Error', details = null) => {
  const response = {
    success: false,
    status: 'error',
    statusCode,
    message,
    data: null,
    timestamp: new Date().toISOString(),
  };

  if (details) {
    response.error = details;
  }

  return res.status(statusCode).json(response);
};

const validationErrorResponse = (res, message = 'Validation Error', errors = []) => {
  return res.status(400).json({
    success: false,
    status: 'error',
    statusCode: 400,
    message,
    data: null,
    errors,
    timestamp: new Date().toISOString(),
  });
};

const createdResponse = (res, message = 'Created successfully', data) => {
  return successResponse(res, 201, message, data);
};

const badRequestError = (res, message = 'Bad Request') => {
  return errorResponse(res, 400, message);
};

const unauthorizedError = (res, message = 'Unauthorized - Authentication required') => {
  return errorResponse(res, 401, message);
};

const forbiddenError = (res, message = 'Forbidden - Insufficient permissions') => {
  return errorResponse(res, 403, message);
};

const notFoundError = (res, message = 'Not Found') => {
  return errorResponse(res, 404, message);
};

const serverError = (res, message = 'Internal Server Error', errorDetails = null) => {
  if (errorDetails) {
    console.error('[SERVER ERROR]', errorDetails);
  }
  return errorResponse(res, 500, message);
};

const paginatedResponse = (res, message = 'Success', data, currentPage, totalPages, total) => {
  return successResponse(res, 200, message, data, {
    currentPage: parseInt(currentPage, 10),
    totalPages,
    total,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
  });
};

const dataNotFoundResponse = (res, resourceName = 'Resource') => {
  return notFoundError(res, `${resourceName} not found`);
};

const ownershipError = (res, resourceName = 'Resource') => {
  return forbiddenError(res, `You can only access your own ${resourceName}`);
};

const statusTransitionError = (res, currentStatus, attemptedStatus) => {
  return badRequestError(res, `Cannot transition from '${currentStatus}' to '${attemptedStatus}'`);
};

const duplicateEntryError = (res, fieldName) => {
  return badRequestError(res, `${fieldName} already exists`);
};

const missingFieldsError = (res, fields = []) => {
  return validationErrorResponse(res, 'Missing required fields', fields);
};

export {
  successResponse,
  errorResponse,
  validationErrorResponse,
  createdResponse,
  badRequestError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  serverError,
  paginatedResponse,
  dataNotFoundResponse,
  ownershipError,
  statusTransitionError,
  duplicateEntryError,
  missingFieldsError,
};
