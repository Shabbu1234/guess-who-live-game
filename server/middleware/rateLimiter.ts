import rateLimit from 'express-rate-limit';

// Rate limiter for admin login to prevent brute force
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { error: 'Too many failed login attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for participant join/vote actions (allows venue NAT IPs with 200+ devices)
export const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // 1000 requests per minute per IP (prevents blocking venue Wi-Fi)
  message: { error: 'Rate limit exceeded. Please slow down.' },
});
