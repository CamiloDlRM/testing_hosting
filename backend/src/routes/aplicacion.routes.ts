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
router.get('/', getMyAplicacion); // GET /aplicaciones - obtener todas las aplicaciones del usuario
router.post('/', criticalOpsLimiter, createValidation, validate, createAplicacion); // POST /aplicaciones - crear nueva aplicación

// Operaciones sobre una aplicación específica (requieren appId)
router.patch('/:appId', updateValidation, validate, updateAplicacion); // PATCH /aplicaciones/:appId
router.delete('/:appId', criticalOpsLimiter, deleteAplicacion); // DELETE /aplicaciones/:appId
router.post('/:appId/deploy', criticalOpsLimiter, deployAplicacion); // POST /aplicaciones/:appId/deploy
router.post('/:appId/stop', criticalOpsLimiter, stopAplicacion); // POST /aplicaciones/:appId/stop
router.post('/:appId/restart', criticalOpsLimiter, restartAplicacion); // POST /aplicaciones/:appId/restart
router.get('/:appId/logs', getAplicacionLogs); // GET /aplicaciones/:appId/logs

export default router;
