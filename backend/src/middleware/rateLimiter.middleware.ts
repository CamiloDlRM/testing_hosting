import rateLimit from 'express-rate-limit';

// Rate limiter general para todas las rutas
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: {
    success: false,
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter más estricto para autenticación
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos de login por ventana
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter para operaciones críticas (deploy, delete)
export const criticalOpsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 3, // 3 operaciones por minuto
  message: {
    success: false,
    error: 'Too many operations, please wait before trying again',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
