// src/admin/middleware/auth.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

export const AUTH_COOKIE_NAME = 'admin_token';

export const authenticateAdmin: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const validApiKey = process.env.ADMIN_API_KEY;

  if (!validApiKey) {
    next();
    return;
  }

  const token = req.cookies[AUTH_COOKIE_NAME];

  if (token !== validApiKey) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

export function getTokenFromRequest(req: Request): string | undefined {
  return req.cookies[AUTH_COOKIE_NAME];
}
