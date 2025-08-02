import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import { PLATFORM_PERMISSIONS } from '@shared/schema';

// Extended Request type with user context
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
    permissionLevel: number;
    organizationId: number;
    sessionToken: string;
  };
}

// Authentication middleware
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const sessionToken = req.headers.authorization?.replace('Bearer ', '') || req.session?.sessionToken;
    
    if (!sessionToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const session = await storage.getSession(sessionToken);
    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ error: 'Session expired' });
    }

    const user = await storage.getUser(session.userId);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User account inactive' });
    }

    // Set user context
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      permissionLevel: user.permissionLevel,
      organizationId: user.organizationId,
      sessionToken: session.sessionToken,
    };

    // Log user activity
    await storage.logAction({
      userId: user.id,
      organizationId: user.organizationId,
      action: 'api_access',
      resource: 'platform',
      resourceId: null,
      details: JSON.stringify({ 
        endpoint: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'] 
      }),
      ipAddress: req.ip || null,
      userAgent: req.headers['user-agent'] || null,
    });

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

// Permission check middleware factory
export const requirePermission = (permission: keyof typeof PLATFORM_PERMISSIONS) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const permissionConfig = PLATFORM_PERMISSIONS[permission];
    if (!permissionConfig) {
      return res.status(500).json({ error: 'Invalid permission configuration' });
    }

    // Check role-specific permissions
    if (permissionConfig.allowedRoles && !permissionConfig.allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Check permission level
    if (req.user.permissionLevel < permissionConfig.level) {
      return res.status(403).json({ error: 'Insufficient permission level' });
    }

    next();
  };
};

// Role-based access control
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];
  
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    next();
  };
};

// Owner-only access
export const requireOwner = requireRole('owner');

// Admin+ access (Owner, Admin, DevOps for infrastructure)
export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.permissionLevel < 3) {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
};

// Check if user can manage specific resource
export const canManageResource = (req: AuthenticatedRequest, resourceUserId: number): boolean => {
  if (!req.user) return false;
  
  // Owner can manage everything
  if (req.user.role === 'owner') return true;
  
  // Admin can manage within organization
  if (req.user.role === 'admin' && req.user.permissionLevel >= 3) return true;
  
  // Users can only manage their own resources
  return req.user.id === resourceUserId;
};

// Validate session and refresh if needed
export const validateSession = async (sessionToken: string) => {
  const session = await storage.getSession(sessionToken);
  if (!session) return null;

  // Check if session is expired
  if (session.expiresAt < new Date()) {
    await storage.deleteSession(sessionToken);
    return null;
  }

  // Check if session needs refresh (expires in less than 1 hour)
  const oneHour = 60 * 60 * 1000;
  if (session.expiresAt.getTime() - Date.now() < oneHour) {
    // Extend session by 24 hours
    const newExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    // Note: In a real implementation, you'd update the session in storage
    session.expiresAt = newExpiresAt;
  }

  return session;
};