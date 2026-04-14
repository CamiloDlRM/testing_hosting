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
import { streamRuntimeLogs, streamBuildLogs, getComposeServices } from '../controllers/logs.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { sseAuthMiddleware } from '../middleware/sseAuth.middleware';
import { validate } from '../middleware/validation.middleware';
import { criticalOpsLimiter } from '../middleware/rateLimiter.middleware';

const router = Router();

// SSE: se registran ANTES del authMiddleware global porque EventSource no puede
// enviar el header Authorization. Usan sseAuthMiddleware que acepta ?token=
router.get('/:appId/logs/runtime/stream', sseAuthMiddleware, streamRuntimeLogs);
router.get('/:appId/logs/build/stream', sseAuthMiddleware, streamBuildLogs);

// Todas las demás rutas requieren autenticación via header
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
  body('variablesEntorno')
    .optional()
    .isObject()
    .withMessage('Environment variables must be an object'),
  body('tipoAplicacion')
    .optional()
    .isIn(['NIXPACKS', 'STATIC', 'DOCKERFILE', 'DOCKER_COMPOSE'])
    .withMessage('tipoAplicacion must be one of: NIXPACKS, STATIC, DOCKERFILE, DOCKER_COMPOSE'),
  body('limiteMemoria')
    .optional()
    .matches(/^\d+(m|g|k)$/)
    .withMessage('limiteMemoria must be a valid Docker memory string, e.g. "256m", "512m", "1g"'),
  body('limiteCpu')
    .optional()
    .matches(/^\d+(\.\d+)?$/)
    .custom((value) => {
      const num = parseFloat(value);
      if (num <= 0 || num > 8) throw new Error('limiteCpu must be between 0.1 and 8');
      return true;
    })
    .withMessage('limiteCpu must be a decimal number between 0.1 and 8, e.g. "0.5", "1", "2"'),
  body('volumes')
    .optional()
    .isArray()
    .withMessage('volumes must be an array'),
  body('volumes.*.source')
    .notEmpty()
    .withMessage('Each volume must have a non-empty source'),
  body('volumes.*.target')
    .notEmpty()
    .matches(/^\//)
    .withMessage('Each volume target must be an absolute path (starting with /)'),
];

const updateValidation = [
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  body('variablesEntorno')
    .optional()
    .isObject()
    .withMessage('Environment variables must be an object'),
  body('tipoAplicacion')
    .optional()
    .isIn(['NIXPACKS', 'STATIC', 'DOCKERFILE', 'DOCKER_COMPOSE'])
    .withMessage('tipoAplicacion must be one of: NIXPACKS, STATIC, DOCKERFILE, DOCKER_COMPOSE'),
  body('limiteMemoria')
    .optional()
    .matches(/^\d+(m|g|k)$/)
    .withMessage('limiteMemoria must be a valid Docker memory string, e.g. "256m", "512m", "1g"'),
  body('limiteCpu')
    .optional()
    .matches(/^\d+(\.\d+)?$/)
    .custom((value) => {
      const num = parseFloat(value);
      if (num <= 0 || num > 8) throw new Error('limiteCpu must be between 0.1 and 8');
      return true;
    })
    .withMessage('limiteCpu must be a decimal number between 0.1 and 8, e.g. "0.5", "1", "2"'),
  body('volumes')
    .optional()
    .isArray()
    .withMessage('volumes must be an array'),
  body('volumes.*.source')
    .notEmpty()
    .withMessage('Each volume must have a non-empty source'),
  body('volumes.*.target')
    .notEmpty()
    .matches(/^\//)
    .withMessage('Each volume target must be an absolute path (starting with /)'),
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
router.get('/:appId/logs', getAplicacionLogs);
router.get('/:appId/logs/services', getComposeServices);


export default router;
