import { Prisma } from '@/lib/generated/prisma';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

export class AppError extends Error {
    statusCode: number;
    isOperational: boolean;

    constructor(message: string, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class PrismaError extends AppError {
    constructor(message: string) {
        super(message || 'Database error occurred', 500);
    }
}

export class JWTError extends AppError {
    constructor(message: string) {
        super(message || 'Authentication error', 401);
    }
}

export class CryptoError extends AppError {
    constructor(message: string) {
        super(message || 'Encryption error', 500);
    }
}

export class SWRError extends AppError {
    constructor(message: string) {
        super(message || 'Data fetching error', 500);
    }
}

function handlePrismaError(error: Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
        return { statusCode: 409, message: 'Duplicate record found.' };
    }
    return { statusCode: 500, message: error.message || 'Database error' };
}

function handleJwtError(error: JsonWebTokenError | TokenExpiredError) {
    if (error instanceof TokenExpiredError) {
        return { statusCode: 401, message: 'Token expired' };
    }
    return { statusCode: 401, message: error.message || 'Invalid token' };
}

function handleCryptoError() {
    return { statusCode: 500, message: 'Encryption/decryption failure' };
}

export function handleError(error: unknown): { statusCode: number; message: string } {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        return handlePrismaError(error);
    }

    if (error instanceof Prisma.PrismaClientValidationError) {
        return { statusCode: 400, message: error.message || 'Validation error' };
    }

    if (error instanceof JsonWebTokenError || error instanceof TokenExpiredError) {
        return handleJwtError(error);
    }

    if (error instanceof Error && error.message.toLowerCase().includes('crypto')) {
        return handleCryptoError();
    }

    if (error instanceof SWRError) {
        return { statusCode: 500, message: error.message || 'Data fetching error' };
    }

    if (error instanceof AppError) {
        return { statusCode: error.statusCode, message: error.message };
    }

    if (error instanceof Error) {
        return { statusCode: 500, message: error.message || 'Internal server error' };
    }

    return { statusCode: 500, message: 'Something went wrong' };
}
