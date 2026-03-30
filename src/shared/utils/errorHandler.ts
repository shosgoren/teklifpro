import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/shared/lib/logger';

/**
 * API Response wrapper type
 * Standardizes all API responses across the application
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

/**
 * Custom API Error class
 * Extends Error with additional properties for better error handling
 */
export class ApiError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    Object.setPrototypeOf(this, ApiError.prototype);
    this.name = 'ApiError';
  }
}

/**
 * Validation Error class
 * Used for request validation failures
 */
export class ValidationError extends ApiError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', 400, message, details);
    Object.setPrototypeOf(this, ValidationError.prototype);
    this.name = 'ValidationError';
  }
}

/**
 * Authentication Error class
 * Used for missing or invalid authentication
 */
export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required', details?: Record<string, unknown>) {
    super('AUTHENTICATION_ERROR', 401, message, details);
    Object.setPrototypeOf(this, AuthenticationError.prototype);
    this.name = 'AuthenticationError';
  }
}

/**
 * Authorization Error class
 * Used for permission/access denied errors
 */
export class AuthorizationError extends ApiError {
  constructor(message: string = 'Access forbidden', details?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', 403, message, details);
    Object.setPrototypeOf(this, AuthorizationError.prototype);
    this.name = 'AuthorizationError';
  }
}

/**
 * Not Found Error class
 * Used when resource is not found
 */
export class NotFoundError extends ApiError {
  constructor(resource: string = 'Resource', details?: Record<string, unknown>) {
    super('NOT_FOUND', 404, `${resource} not found`, details);
    Object.setPrototypeOf(this, NotFoundError.prototype);
    this.name = 'NotFoundError';
  }
}

/**
 * Conflict Error class
 * Used for conflict/duplicate errors
 */
export class ConflictError extends ApiError {
  constructor(message: string = 'Resource conflict', details?: Record<string, unknown>) {
    super('CONFLICT', 409, message, details);
    Object.setPrototypeOf(this, ConflictError.prototype);
    this.name = 'ConflictError';
  }
}

/**
 * Rate Limit Error class
 * Used when rate limit is exceeded
 */
export class RateLimitError extends ApiError {
  constructor(message: string = 'Rate limit exceeded', details?: Record<string, unknown>) {
    super('RATE_LIMIT_EXCEEDED', 429, message, details);
    Object.setPrototypeOf(this, RateLimitError.prototype);
    this.name = 'RateLimitError';
  }
}

/**
 * Database Error class
 * Used for database operation failures
 */
export class DatabaseError extends ApiError {
  constructor(message: string = 'Database error', details?: Record<string, unknown>) {
    super('DATABASE_ERROR', 500, message, details);
    Object.setPrototypeOf(this, DatabaseError.prototype);
    this.name = 'DatabaseError';
  }
}

/**
 * Internal Server Error class
 * Used for unexpected server errors
 */
export class InternalServerError extends ApiError {
  constructor(message: string = 'Internal server error', details?: Record<string, unknown>) {
    super('INTERNAL_SERVER_ERROR', 500, message, details);
    Object.setPrototypeOf(this, InternalServerError.prototype);
    this.name = 'InternalServerError';
  }
}

// Error factory functions for common scenarios

/**
 * Factory: Create a not found error
 */
export function notFound(resource: string = 'Resource'): NotFoundError {
  return new NotFoundError(resource);
}

/**
 * Factory: Create an unauthorized error
 */
export function unauthorized(message?: string): AuthenticationError {
  return new AuthenticationError(message);
}

/**
 * Factory: Create a forbidden/access denied error
 */
export function forbidden(message?: string): AuthorizationError {
  return new AuthorizationError(message);
}

/**
 * Factory: Create a bad request error
 */
export function badRequest(message: string, details?: Record<string, unknown>): ValidationError {
  return new ValidationError(message, details);
}

/**
 * Factory: Create a conflict error
 */
export function conflict(message: string, details?: Record<string, unknown>): ConflictError {
  return new ConflictError(message, details);
}

/**
 * Factory: Create a rate limit error
 */
export function rateLimited(message?: string): RateLimitError {
  return new RateLimitError(message);
}

/**
 * Factory: Create an internal server error
 */
export function internalError(
  message: string = 'Internal server error',
  details?: Record<string, unknown>
): InternalServerError {
  return new InternalServerError(message, details);
}

/**
 * Check if an error is operational (expected) vs programming (unexpected)
 * Helps determine whether to crash the process (programming errors)
 * or handle gracefully (operational errors)
 */
export function isOperationalError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return true;
  }

  if (error instanceof SyntaxError) {
    return false; // Programming error
  }

  if (error instanceof TypeError) {
    return false; // Programming error
  }

  if (error instanceof ReferenceError) {
    return false; // Programming error
  }

  // Handle Prisma errors
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    if (err.name === 'PrismaClientKnownRequestError') {
      return true; // Operational
    }
    if (err.name === 'PrismaClientValidationError') {
      return true; // Operational
    }
    if (err.name === 'PrismaClientInitializationError') {
      return true; // Operational
    }
  }

  return false;
}

/**
 * Log error with context
 * Integrates with application logger
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  let errorInfo: {
    message: string;
    code?: string;
    statusCode?: number;
    details?: Record<string, unknown>;
  } = {
    message: 'Unknown error',
  };

  if (error instanceof ApiError) {
    errorInfo = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
    };
  } else if (error instanceof Error) {
    errorInfo = {
      message: error.message,
    };
  } else if (typeof error === 'string') {
    errorInfo = {
      message: error,
    };
  }

  const isOperational = isOperationalError(error);
  const logLevel = isOperational ? 'warn' : 'error';

  const logMessage = isOperational ? 'Operational error occurred' : 'Programming error occurred';
  const logData = {
    error: errorInfo,
    context,
    stack: error instanceof Error ? error.stack : undefined,
    operational: isOperational,
  };

  if (logLevel === 'warn') {
    logger.warn(logMessage, logData);
  } else {
    logger.error(logMessage, logData);
  }
}

/**
 * Convert any error to standardized NextResponse
 * This is the main entry point for API error handling
 */
export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  let apiError: ApiError;

  if (error instanceof ApiError) {
    apiError = error;
  } else if (error instanceof SyntaxError) {
    apiError = new ValidationError('Invalid request format');
  } else if (error instanceof TypeError) {
    apiError = new InternalServerError('Invalid data type');
  } else if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;

    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
      const code = err.code as string;
      const meta = err.meta as Record<string, unknown> | undefined;
      if (code === 'P2002') {
        apiError = new ConflictError('Unique constraint violation', {
          field: meta?.['target'],
        });
      } else if (code === 'P2025') {
        apiError = new NotFoundError('Record not found');
      } else if (code === 'P2003') {
        apiError = new ValidationError('Foreign key constraint violation', {
          field: meta?.['field_name'],
        });
      } else {
        apiError = new DatabaseError('Database operation failed');
      }
    } else if (err.name === 'PrismaClientValidationError') {
      apiError = new ValidationError('Invalid data provided');
    } else if (err.name === 'PrismaClientInitializationError') {
      apiError = new InternalServerError('Database connection failed');
    } else if (err.message) {
      apiError = new InternalServerError(err.message as string);
    } else {
      apiError = new InternalServerError();
    }
  } else if (typeof error === 'string') {
    apiError = new InternalServerError(error);
  } else {
    apiError = new InternalServerError();
  }

  logError(apiError);

  const response: ApiResponse = {
    success: false,
    error: {
      code: apiError.code,
      message: apiError.message,
      ...(apiError.details && { details: apiError.details }),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: apiError.statusCode });
}

/**
 * Higher-order function to wrap API route handlers with error handling
 * Usage: export const GET = withErrorHandling(myHandlerFunction);
 */
export function withErrorHandling(
  handler: (req: NextRequest, params?: unknown) => Promise<Response>
) {
  return async (req: NextRequest, params?: unknown) => {
    try {
      return await handler(req, params);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

/**
 * Create a success API response
 */
export function successResponse<T>(
  data: T,
  statusCode: number = 200
): NextResponse<ApiResponse<T>> {
  const response: ApiResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Assert authentication - throw error if user is not authenticated
 */
export function assertAuthenticated(userId?: string | null): void {
  if (!userId) {
    throw new AuthenticationError();
  }
}

/**
 * Assert authorization - throw error if user doesn't have required role
 */
export function assertAuthorized(
  userRole?: string | null,
  requiredRoles: string[] = ['OWNER', 'ADMIN']
): void {
  if (!userRole || !requiredRoles.includes(userRole)) {
    throw new AuthorizationError();
  }
}

/**
 * Parse and validate request body
 */
export async function parseBody<T>(
  req: Request,
  schema?: (data: unknown) => T
): Promise<T> {
  try {
    const body = await req.json();

    if (schema) {
      return schema(body);
    }

    return body as T;
  } catch (error) {
    throw new ValidationError('Invalid JSON in request body');
  }
}
