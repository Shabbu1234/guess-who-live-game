import { Request, Response, NextFunction } from 'express';
import { verifySessionToken } from '../services/authService.js';

export interface AdminRequest extends Request {
  isAdmin?: boolean;
}

export function requireAdmin(req: AdminRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.admin_token;

  if (!verifySessionToken(token)) {
    res.status(401).json({ error: 'Unauthorized. Admin session invalid or expired.' });
    return;
  }

  req.isAdmin = true;
  next();
}
