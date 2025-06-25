/**
 * @file Authentication service with user login, registration, JWT verification, and CSRF protection.
 * @module auth
 */

import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '@/lib/db';
import type { JwtPayload } from 'jsonwebtoken';
import { verify, sign } from 'jsonwebtoken';
import { handleError } from '@/lib/utils/errors';
import type { Role } from '@/lib/generated/prisma';
import { randomBytes, timingSafeEqual } from 'node:crypto';

const SALT_ROUNDS = 12;

const JWT_SECRET = z.string().min(1).parse(process.env.JWT_SECRET);

const emailSchema = z.string().email();
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');

/**
 * @typedef {object} AuthSuccess
 * @property {true} success Indicates a successful authentication
 * @property {string} token JWT token string
 */
export type AuthSuccess = {
    success: true;
    token: string;
};

/**
 * @typedef {object} AuthError
 * @property {string} error Error message describing failure
 */
export type AuthError = {
    error: string;
};

/**
 * @description Login user by email and password.
 * Validates input, verifies user existence and password, then returns a JWT token.
 * @param {string} email User's email address
 * @param {string} password User's plaintext password
 * @returns {Promise<AuthSuccess | AuthError>} Auth success with JWT token or error
 */
export const loginUser = async (
    email: string,
    password: string
): Promise<AuthSuccess | AuthError> => {
    try {
        emailSchema.parse(email);
        passwordSchema.parse(password);

        const userData = await prisma.user.findUnique({ where: { email } });
        if (!userData) {
            return { error: 'User not found' };
        }

        const isPasswordValid = await bcrypt.compare(password, userData.password);
        if (!isPasswordValid) {
            return { error: 'Invalid password' };
        }

        const payload = {
            id: userData.id,
            email: userData.email,
            role: userData.role,
            name: userData.name,
        };

        const jwtToken = sign(payload, JWT_SECRET, {
            expiresIn: '1h',
            algorithm: 'HS256',
        });

        return { success: true, token: jwtToken };
    } catch (error) {
        const { message } = handleError(error);
        return { error: message };
    }
};

/**
 * @description Verify JWT token and return decoded payload.
 * Explicitly restricts to HS256 algorithm.
 * @param {string} token JWT token string
 * @returns {JwtPayload | AuthError} Decoded payload or error
 */
export const verifyUser = (
    token: string
): JwtPayload | AuthError => {
    try {
        const decoded = verify(token, JWT_SECRET, { algorithms: ['HS256'] }) as JwtPayload;
        return decoded;
    } catch (error) {
        const { message } = handleError(error);
        return { error: message };
    }
};

/**
 * @description Register a new user.
 * Checks for duplicate email before hashing password and saving.
 * Returns JWT token on success.
 * @param {string} email User's email address
 * @param {string} password User's plaintext password
 * @param {string} [name] Optional user's name
 * @param {Role} [role] Optional user's role, defaults to VISITOR
 * @returns {Promise<AuthSuccess | AuthError>} Auth success with JWT token or error
 */
export const registerUser = async (
    email: string,
    password: string,
    name?: string,
    role?: Role
): Promise<AuthSuccess | AuthError> => {
    try {
        emailSchema.parse(email);
        passwordSchema.parse(password);

        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return { error: 'Email already registered' };
        }

        const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

        const userData = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                role: role ?? 'VISITOR',
            },
        });

        const payload = {
            id: userData.id,
            email: userData.email,
            role: userData.role,
            name: userData.name,
        };

        const jwtToken = sign(payload, JWT_SECRET, {
            expiresIn: '1h',
            algorithm: 'HS256',
        });

        return { success: true, token: jwtToken };
    } catch (error) {
        const { message } = handleError(error);
        return { error: message };
    }
};

/**
 * @description Generate a cryptographically strong CSRF token.
 * @returns {string} Hexadecimal CSRF token string
 */
export const generateCSRFToken = (): string => {
    return randomBytes(32).toString('hex');
};

/**
 * @description Validate a CSRF token by securely comparing stored and provided tokens.
 * Uses timing-safe comparison to prevent timing attacks.
 * @param {string | undefined} storedToken Token stored in session or cookie
 * @param {string | undefined} providedToken Token sent by client in request
 * @returns {boolean} True if tokens match, false otherwise
 */
export const validateCSRFToken = (
    storedToken: string | undefined,
    providedToken: string | undefined
): boolean => {
    if (!storedToken || !providedToken) { return false; }
    return cryptoTimingSafeEqual(storedToken, providedToken);
};

/**
 * @description Timing-safe string comparison.
 * Converts strings to buffers and compares with node:crypto timingSafeEqual.
 * @param {string} a First string
 * @param {string} b Second string
 * @returns {boolean} True if strings are identical, false otherwise
 */
const cryptoTimingSafeEqual = (a: string, b: string): boolean => {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) { return false; }
    return timingSafeEqual(bufA, bufB);
};
