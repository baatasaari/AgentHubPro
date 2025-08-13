// AgentHub Authentication Service
// Handles user authentication, JWT token management, and session control

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const redis = require('redis');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const winston = require('winston');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'auth-service.log' })
  ]
});

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Redis connection
const redisClient = redis.createClient({
  url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
  logger.error('Redis Client Error:', err);
});

redisClient.connect();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: 'Too many authentication attempts, please try again later'
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

// Slow down repeated requests
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50,
  delayMs: 500
});

app.use('/auth/login', authLimiter);
app.use('/auth/register', authLimiter);
app.use(generalLimiter);
app.use(speedLimiter);

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

// Database initialization
async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100),
        last_name VARCHAR(100),
        role VARCHAR(50) DEFAULT 'user',
        permission_level INTEGER DEFAULT 1,
        organization_id INTEGER,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        verification_token VARCHAR(255),
        reset_token VARCHAR(255),
        reset_token_expires TIMESTAMP,
        last_login TIMESTAMP,
        login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS user_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        session_token VARCHAR(255) UNIQUE NOT NULL,
        refresh_token VARCHAR(255) UNIQUE NOT NULL,
        device_info JSONB,
        ip_address INET,
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_accessed TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS login_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ip_address INET,
        user_agent TEXT,
        login_successful BOOLEAN,
        failure_reason VARCHAR(255),
        location JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_login_history_user_id ON login_history(user_id);
    `);
    
    logger.info('Auth service database initialized successfully');
  } catch (error) {
    logger.error('Database initialization failed:', error);
    throw error;
  }
}

// Utility functions
function generateTokens(userId, email, role, organizationId) {
  const payload = {
    userId,
    email,
    role,
    organizationId,
    type: 'access'
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: JWT_EXPIRES_IN,
    issuer: 'agenthub-auth',
    audience: 'agenthub-services'
  });

  const refreshPayload = {
    userId,
    type: 'refresh',
    tokenId: uuidv4()
  };

  const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, { 
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: 'agenthub-auth',
    audience: 'agenthub-services'
  });

  return { accessToken, refreshToken };
}

async function hashPassword(password) {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

async function isAccountLocked(userId) {
  const result = await pool.query(
    'SELECT locked_until FROM users WHERE id = $1',
    [userId]
  );
  
  if (result.rows.length === 0) return false;
  
  const lockedUntil = result.rows[0].locked_until;
  return lockedUntil && new Date() < new Date(lockedUntil);
}

async function incrementLoginAttempts(userId) {
  const result = await pool.query(`
    UPDATE users 
    SET login_attempts = login_attempts + 1,
        locked_until = CASE 
          WHEN login_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
          ELSE locked_until
        END
    WHERE id = $1
    RETURNING login_attempts
  `, [userId]);
  
  return result.rows[0]?.login_attempts || 0;
}

async function resetLoginAttempts(userId) {
  await pool.query(`
    UPDATE users 
    SET login_attempts = 0, locked_until = NULL 
    WHERE id = $1
  `, [userId]);
}

async function recordLoginHistory(userId, ipAddress, userAgent, successful, failureReason = null) {
  await pool.query(`
    INSERT INTO login_history (user_id, ip_address, user_agent, login_successful, failure_reason)
    VALUES ($1, $2, $3, $4, $5)
  `, [userId, ipAddress, userAgent, successful, failureReason]);
}

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'auth-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// User registration
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, organizationId } = req.body;

    // Validation
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Missing required fields', 
        required: ['email', 'password', 'firstName', 'lastName'] 
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
    }

    // Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await hashPassword(password);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Create user
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, first_name, last_name, organization_id, verification_token)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role, organization_id, created_at
    `, [email.toLowerCase(), passwordHash, firstName, lastName, organizationId, verificationToken]);

    const user = result.rows[0];

    logger.info('User registered successfully', { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        organizationId: user.organization_id
      },
      verificationRequired: true
    });

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = req.ip;
    const userAgent = req.get('User-Agent');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Get user
    const userResult = await pool.query(`
      SELECT id, email, password_hash, first_name, last_name, role, 
             permission_level, organization_id, is_active, is_verified,
             login_attempts, locked_until
      FROM users WHERE email = $1
    `, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      await recordLoginHistory(null, ipAddress, userAgent, false, 'User not found');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Check if account is locked
    if (await isAccountLocked(user.id)) {
      await recordLoginHistory(user.id, ipAddress, userAgent, false, 'Account locked');
      return res.status(423).json({ error: 'Account temporarily locked due to too many failed attempts' });
    }

    // Check if account is active
    if (!user.is_active) {
      await recordLoginHistory(user.id, ipAddress, userAgent, false, 'Account inactive');
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const passwordValid = await verifyPassword(password, user.password_hash);
    
    if (!passwordValid) {
      await incrementLoginAttempts(user.id);
      await recordLoginHistory(user.id, ipAddress, userAgent, false, 'Invalid password');
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Reset login attempts on successful login
    await resetLoginAttempts(user.id);

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(
      user.id, 
      user.email, 
      user.role, 
      user.organization_id
    );

    // Create session
    const sessionToken = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await pool.query(`
      INSERT INTO user_sessions (user_id, session_token, refresh_token, ip_address, user_agent, expires_at)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [user.id, sessionToken, refreshToken, ipAddress, userAgent, expiresAt]);

    // Update last login
    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

    // Store session in Redis
    await redisClient.setEx(`session:${sessionToken}`, 7 * 24 * 60 * 60, JSON.stringify({
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    }));

    await recordLoginHistory(user.id, ipAddress, userAgent, true);

    logger.info('User logged in successfully', { userId: user.id, email: user.email });

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        permissionLevel: user.permission_level,
        organizationId: user.organization_id
      },
      tokens: {
        accessToken,
        refreshToken,
        sessionToken,
        expiresAt
      }
    });

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token refresh
app.post('/auth/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    if (decoded.type !== 'refresh') {
      return res.status(401).json({ error: 'Invalid token type' });
    }

    // Get user and session
    const sessionResult = await pool.query(`
      SELECT us.*, u.email, u.role, u.organization_id, u.is_active
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
      WHERE us.refresh_token = $1 AND us.expires_at > CURRENT_TIMESTAMP
    `, [refreshToken]);

    if (sessionResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const session = sessionResult.rows[0];

    if (!session.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(
      session.user_id,
      session.email,
      session.role,
      session.organization_id
    );

    // Update session with new refresh token
    await pool.query(`
      UPDATE user_sessions 
      SET refresh_token = $1, last_accessed = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newRefreshToken, session.id]);

    // Update Redis session
    await redisClient.setEx(`session:${session.session_token}`, 7 * 24 * 60 * 60, JSON.stringify({
      userId: session.user_id,
      email: session.email,
      role: session.role,
      organizationId: session.organization_id
    }));

    res.json({
      message: 'Tokens refreshed successfully',
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Token validation
app.post('/auth/validate', async (req, res) => {
  try {
    const { token, sessionToken } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    // Verify JWT token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token', valid: false });
    }

    // Check session if provided
    if (sessionToken) {
      const sessionData = await redisClient.get(`session:${sessionToken}`);
      if (!sessionData) {
        return res.status(401).json({ error: 'Session expired', valid: false });
      }

      const session = JSON.parse(sessionData);
      if (session.userId !== decoded.userId) {
        return res.status(401).json({ error: 'Session mismatch', valid: false });
      }
    }

    res.json({
      valid: true,
      user: {
        id: decoded.userId,
        email: decoded.email,
        role: decoded.role,
        organizationId: decoded.organizationId
      }
    });

  } catch (error) {
    logger.error('Token validation error:', error);
    res.status(500).json({ error: 'Internal server error', valid: false });
  }
});

// Logout
app.post('/auth/logout', async (req, res) => {
  try {
    const { sessionToken, refreshToken } = req.body;

    if (sessionToken) {
      // Remove from Redis
      await redisClient.del(`session:${sessionToken}`);
      
      // Remove from database
      await pool.query('DELETE FROM user_sessions WHERE session_token = $1', [sessionToken]);
    }

    if (refreshToken) {
      // Remove by refresh token
      await pool.query('DELETE FROM user_sessions WHERE refresh_token = $1', [refreshToken]);
    }

    res.json({ message: 'Logout successful' });

  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout all sessions
app.post('/auth/logout-all', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get all sessions for user
    const sessions = await pool.query(
      'SELECT session_token FROM user_sessions WHERE user_id = $1',
      [userId]
    );

    // Remove from Redis
    for (const session of sessions.rows) {
      await redisClient.del(`session:${session.session_token}`);
    }

    // Remove from database
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);

    res.json({ message: 'All sessions logged out successfully' });

  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user sessions
app.get('/auth/sessions/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const sessions = await pool.query(`
      SELECT id, device_info, ip_address, user_agent, expires_at, created_at, last_accessed
      FROM user_sessions 
      WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
      ORDER BY last_accessed DESC
    `, [userId]);

    res.json({ sessions: sessions.rows });

  } catch (error) {
    logger.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset request
app.post('/auth/password-reset-request', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const user = await pool.query('SELECT id, email FROM users WHERE email = $1', [email.toLowerCase()]);

    if (user.rows.length === 0) {
      // Don't reveal if email exists or not
      return res.json({ message: 'If the email exists, a reset link has been sent' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(`
      UPDATE users 
      SET reset_token = $1, reset_token_expires = $2 
      WHERE id = $3
    `, [resetToken, resetExpires, user.rows[0].id]);

    // Here you would typically send an email with the reset link
    logger.info('Password reset requested', { userId: user.rows[0].id, email });

    res.json({ 
      message: 'If the email exists, a reset link has been sent',
      resetToken // Remove this in production
    });

  } catch (error) {
    logger.error('Password reset request error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Password reset
app.post('/auth/password-reset', async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ error: 'Reset token and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const user = await pool.query(`
      SELECT id FROM users 
      WHERE reset_token = $1 AND reset_token_expires > CURRENT_TIMESTAMP
    `, [resetToken]);

    if (user.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const passwordHash = await hashPassword(newPassword);

    await pool.query(`
      UPDATE users 
      SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL,
          login_attempts = 0, locked_until = NULL
      WHERE id = $2
    `, [passwordHash, user.rows[0].id]);

    // Invalidate all sessions
    await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [user.rows[0].id]);

    logger.info('Password reset successful', { userId: user.rows[0].id });

    res.json({ message: 'Password reset successful' });

  } catch (error) {
    logger.error('Password reset error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info(`Auth service running on port ${PORT}`);
      console.log(`🔐 Auth Service running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await pool.end();
  await redisClient.quit();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await pool.end();
  await redisClient.quit();
  process.exit(0);
});

startServer();