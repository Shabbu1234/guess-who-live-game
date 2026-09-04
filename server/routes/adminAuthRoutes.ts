import { Router, Request, Response } from 'express';
import { verifyAdminPassword, generateSessionToken, invalidateSessionToken, verifySessionToken } from '../services/authService.js';
import { loginRateLimiter } from '../middleware/rateLimiter.js';
import { requireAdmin } from '../middleware/auth.js';

const router = Router();

// Admin Login
router.post('/login', loginRateLimiter, (req: Request, res: Response) => {
  const { password } = req.body;

  if (!password) {
    res.status(400).json({ error: 'Password is required' });
    return;
  }

  const isValid = verifyAdminPassword(password);
  if (!isValid) {
    res.status(401).json({ error: 'Invalid admin password' });
    return;
  }

  const token = generateSessionToken('admin');

  // Set HTTP-only secure cookie
  res.cookie('admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  });

  res.json({ success: true, message: 'Admin authenticated successfully' });
});

// Admin Logout
router.post('/logout', (req: Request, res: Response) => {
  const token = req.cookies?.admin_token;
  invalidateSessionToken(token);
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Check Session Status
router.get('/me', (req: Request, res: Response) => {
  const token = req.cookies?.admin_token;
  const isAuthenticated = verifySessionToken(token);
  res.json({ authenticated: isAuthenticated });
});

export default router;
