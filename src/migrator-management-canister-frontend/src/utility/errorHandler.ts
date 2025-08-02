// Error handling utility for backend responses
export interface BackendError {
    [key: string]: any;
}

export interface ErrorResponse {
    err: BackendError | string;
}

export interface SuccessResponse<T> {
    ok: T;
}

export type BackendResponse<T> = SuccessResponse<T> | ErrorResponse;

// Error types that can be returned from the backend
export enum ErrorType {
    INSUFFICIENT_FUNDS = 'InsufficientFunds',
    UNAUTHORIZED = 'Unauthorized',
    TREASURY_NOT_SET = 'TreasuryNotSet',
    TRANSFER_FAILED = 'TransferFailed',
    INVALID_PRINCIPAL = 'InvalidPrincipal',
    ALREADY_EXISTS = 'AlreadyExists',
    NOT_FOUND = 'NotFound',
    INVALID_ARGUMENT = 'InvalidArgument',
    INTERNAL_ERROR = 'InternalError',
    UNKNOWN_ERROR = 'UnknownError'
}

// Error messages mapping
const ERROR_MESSAGES: Record<ErrorType, string> = {
    [ErrorType.INSUFFICIENT_FUNDS]: 'Insufficient funds in treasury to complete the operation',
    [ErrorType.UNAUTHORIZED]: 'You are not authorized to perform this action',
    [ErrorType.TREASURY_NOT_SET]: 'Treasury account has not been configured',
    [ErrorType.TRANSFER_FAILED]: 'Transfer operation failed. Please try again',
    [ErrorType.INVALID_PRINCIPAL]: 'Invalid principal provided',
    [ErrorType.ALREADY_EXISTS]: 'Item already exists',
    [ErrorType.NOT_FOUND]: 'Requested item not found',
    [ErrorType.INVALID_ARGUMENT]: 'Invalid argument provided',
    [ErrorType.INTERNAL_ERROR]: 'Internal server error occurred',
    [ErrorType.UNKNOWN_ERROR]: 'An unknown error occurred'
};

/**
 * Extracts error type from backend error response
 */
export function extractErrorType(error: any): ErrorType {
    if (!error || typeof error !== 'object') {
        return ErrorType.UNKNOWN_ERROR;
    }

    // Check if it's a direct error object with error type
    if (error.InsufficientFunds) return ErrorType.INSUFFICIENT_FUNDS;
    if (error.Unauthorized) return ErrorType.UNAUTHORIZED;
    if (error.TreasuryNotSet) return ErrorType.TREASURY_NOT_SET;
    if (error.TransferFailed) return ErrorType.TRANSFER_FAILED;
    if (error.InvalidPrincipal) return ErrorType.INVALID_PRINCIPAL;
    if (error.AlreadyExists) return ErrorType.ALREADY_EXISTS;
    if (error.NotFound) return ErrorType.NOT_FOUND;
    if (error.InvalidArgument) return ErrorType.INVALID_ARGUMENT;
    if (error.InternalError) return ErrorType.INTERNAL_ERROR;

    // Check if it's an error response with err property
    if (error.err) {
        const errObj = error.err;
        if (errObj.InsufficientFunds) return ErrorType.INSUFFICIENT_FUNDS;
        if (errObj.Unauthorized) return ErrorType.UNAUTHORIZED;
        if (errObj.TreasuryNotSet) return ErrorType.TREASURY_NOT_SET;
        if (errObj.TransferFailed) return ErrorType.TRANSFER_FAILED;
        if (errObj.InvalidPrincipal) return ErrorType.INVALID_PRINCIPAL;
        if (errObj.AlreadyExists) return ErrorType.ALREADY_EXISTS;
        if (errObj.NotFound) return ErrorType.NOT_FOUND;
        if (errObj.InvalidArgument) return ErrorType.INVALID_ARGUMENT;
        if (errObj.InternalError) return ErrorType.INTERNAL_ERROR;
    }

    return ErrorType.UNKNOWN_ERROR;
}

/**
 * Gets user-friendly error message from error type
 */
export function getErrorMessage(errorType: ErrorType, details?: any): string {
    let message = ERROR_MESSAGES[errorType];

    // Add specific details for certain error types
    if (errorType === ErrorType.INSUFFICIENT_FUNDS && details?.balance) {
        const balanceInIcp = Number(details.balance.e8s) / 100000000; // Convert e8s to ICP
        message += `. Current balance: ${balanceInIcp.toFixed(4)} ICP`;
    }

    return message;
}

/**
 * Handles backend response and throws appropriate error
 */
export function handleBackendResponse<T>(response: BackendResponse<T>): T {
    if ('ok' in response) {
        return response.ok;
    }

    if ('err' in response) {
        // Handle case where err is a string
        if (typeof response.err === 'string') {
            throw new Error(response.err);
        }

        const errorType = extractErrorType(response.err);
        const message = getErrorMessage(errorType, response.err);
        throw new Error(message);
    }

    throw new Error('Invalid response format');
}

/**
 * Handles any error and returns a user-friendly message
 */
export function handleError(error: any): string {
    // If it's already a string, return it
    if (typeof error === 'string') {
        return error;
    }

    // If it's an Error object, extract the message
    if (error instanceof Error) {
        return error.message;
    }

    // If it's a backend error object
    if (error && typeof error === 'object') {
        const errorType = extractErrorType(error);
        return getErrorMessage(errorType, error);
    }

    // Fallback
    return 'An unexpected error occurred';
}

/**
 * Checks if the error is a specific type
 */
export function isErrorType(error: any, errorType: ErrorType): boolean {
    return extractErrorType(error) === errorType;
}

/**
 * Gets additional error details for specific error types
 */
export function getErrorDetails(error: any): any {
    if (!error || typeof error !== 'object') {
        return null;
    }

    const errorType = extractErrorType(error);

    switch (errorType) {
        case ErrorType.INSUFFICIENT_FUNDS:
            return {
                balance: error.InsufficientFunds?.balance || error.err?.InsufficientFunds?.balance,
                required: error.InsufficientFunds?.required || error.err?.InsufficientFunds?.required
            };
        case ErrorType.UNAUTHORIZED:
            return {
                caller: error.Unauthorized?.caller || error.err?.Unauthorized?.caller
            };
        default:
            return null;
    }
} 