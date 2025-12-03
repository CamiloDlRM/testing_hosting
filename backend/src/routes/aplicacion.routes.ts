import { Router } from 'express';
import { body } from 'express-validator';
import {
  createAplicacion,
  getMyAplicacion,
  updateAplicacion,
  deployAplicacion,
  stopAplicacion,
  restartAplicacion,
  deleteAplicacion,
  getAplicacionLogs,
} from '../controllers/aplicacion.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { criticalOpsLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Validaciones
const createValidation = [
  body('nombre')
    .notEmpty()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  body('repositorioGit')
    .notEmpty()
    .trim()
    .matches(/^https?:\/\/.+/)
    .withMessage('Invalid Git repository URL'),
  body('variablesEntorno').optional().isObject().withMessage('Environment variables must be an object'),
  body('tipoAplicacion').optional().isString().withMessage('Application type must be a string'),
];

const updateValidation = [
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  body('variablesEntorno').optional().isObject().withMessage('Environment variables must be an object'),
];

// Rutas
router.get('/', getMyAplicacion);
router.post('/', criticalOpsLimiter, createValidation, validate, createAplicacion);
router.patch('/', updateValidation, validate, updateAplicacion);
router.delete('/', criticalOpsLimiter, deleteAplicacion);

// Operaciones de la aplicación
router.post('/deploy', criticalOpsLimiter, deployAplicacion);
router.post('/stop', criticalOpsLimiter, stopAplicacion);
router.post('/restart', criticalOpsLimiter, restartAplicacion);
router.get('/logs', getAplicacionLogs);

export default router;
