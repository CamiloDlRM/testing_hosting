import { Router } from 'express';
import { body } from 'express-validator';
import { register, login, getMe } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Validaciones
const registerValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('nombre').notEmpty().trim().withMessage('Name is required'),
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('password').notEmpty().withMessage('Password is required'),
];

// Rutas públicas
router.post('/register', authLimiter, registerValidation, validate, register);
router.post('/login', authLimiter, loginValidation, validate, login);

// Rutas protegidas
router.get('/me', authMiddleware, getMe);

export default router;
