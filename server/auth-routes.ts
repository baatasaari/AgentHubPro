import type { Express } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { storage } from './storage';
import { authenticate, requireOwner, AuthenticatedRequest } from './auth';
import { insertUserSchema } from '@shared/schema';

export function registerAuthRoutes(app: Express) {
  // Login endpoint
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password (in demo, we use simple comparison)
      const isValidPassword = user.passwordHash === `hashed_${password}`;
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Create session
      const sessionToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await storage.createSession(user.id, sessionToken, expiresAt);

      // Update last login
      await storage.updateUser(user.id, { lastLoginAt: new Date() });

      // Log login
      await storage.logAction({
        userId: user.id,
        organizationId: user.organizationId,
        action: 'user_login',
        resource: 'auth',
        resourceId: user.id,
        details: JSON.stringify({ method: 'email_password' }),
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          permissionLevel: user.permissionLevel,
          organizationId: user.organizationId,
        },
        sessionToken,
        expiresAt,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  // Logout endpoint
  app.post('/api/auth/logout', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      if (req.user?.sessionToken) {
        await storage.deleteSession(req.user.sessionToken);
        
        // Log logout
        await storage.logAction({
          userId: req.user.id,
          organizationId: req.user.organizationId,
          action: 'user_logout',
          resource: 'auth',
          resourceId: req.user.id,
          details: '{}',
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent'] || null,
        });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ error: 'Logout failed' });
    }
  });

  // Get current user info
  app.get('/api/auth/me', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        permissionLevel: user.permissionLevel,
        organizationId: user.organizationId,
        isEmailVerified: user.isEmailVerified,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Failed to get user info' });
    }
  });

  // Change password
  app.post('/api/auth/change-password', authenticate, async (req: AuthenticatedRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password required' });
      }

      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Verify current password
      const isValidPassword = user.passwordHash === `hashed_${currentPassword}`;
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid current password' });
      }

      // Update password
      await storage.updateUser(user.id, { password: newPassword });

      // Log password change
      await storage.logAction({
        userId: user.id,
        organizationId: user.organizationId,
        action: 'password_changed',
        resource: 'auth',
        resourceId: user.id,
        details: '{}',
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ error: 'Password change failed' });
    }
  });

  // Owner-only: Create new user
  app.post('/api/auth/create-user', authenticate, requireOwner, async (req: AuthenticatedRequest, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ error: 'User already exists' });
      }

      // Generate temporary password if not provided
      const tempPassword = userData.password || crypto.randomBytes(8).toString('hex');

      // Create user
      const newUser = await storage.createUser({
        ...userData,
        password: tempPassword,
        isEmailVerified: false,
      });

      // Log user creation
      await storage.logAction({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        action: 'user_created',
        resource: 'users',
        resourceId: newUser.id,
        details: JSON.stringify({ role: newUser.role, createdBy: req.user!.email }),
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          role: newUser.role,
          permissionLevel: newUser.permissionLevel,
        },
        temporaryPassword: tempPassword, // Return temp password for owner to share
      });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  });

  // Owner-only: Update user role
  app.patch('/api/auth/users/:id/role', authenticate, requireOwner, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);
      const { role, permissionLevel } = req.body;

      if (!role || permissionLevel === undefined) {
        return res.status(400).json({ error: 'Role and permission level required' });
      }

      const updatedUser = await storage.updateUserRole(userId, role, permissionLevel);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Log role change
      await storage.logAction({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        action: 'role_updated',
        resource: 'users',
        resourceId: userId,
        details: JSON.stringify({ 
          newRole: role, 
          newPermissionLevel: permissionLevel,
          updatedBy: req.user!.email 
        }),
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error('Update role error:', error);
      res.status(500).json({ error: 'Failed to update user role' });
    }
  });

  // Owner-only: Delete user
  app.delete('/api/auth/users/:id', authenticate, requireOwner, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = parseInt(req.params.id);

      // Prevent owner from deleting themselves
      if (userId === req.user!.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Log user deletion
      await storage.logAction({
        userId: req.user!.id,
        organizationId: req.user!.organizationId,
        action: 'user_deleted',
        resource: 'users',
        resourceId: userId,
        details: JSON.stringify({ deletedBy: req.user!.email }),
        ipAddress: req.ip || null,
        userAgent: req.headers['user-agent'] || null,
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Failed to delete user' });
    }
  });
}