import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { verifyToken } from '../utils/jwt';

/**
 * Auth middleware para endpoints SSE.
 * EventSource del browser no soporta headers custom, por lo que el JWT
 * se pasa como query param: ?token=<jwt>
 */
export const sseAuthMiddleware = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Intentar header primero, luego query param
    const authHeader = req.headers.authorization;
    const queryToken = req.query.token as string | undefined;

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : queryToken;

    if (!token) {
      return res.status(401).json({ success: false, error: 'No token provided' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, error: 'Authentication failed' });
  }
};
