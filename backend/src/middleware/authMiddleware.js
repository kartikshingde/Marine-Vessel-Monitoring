import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - Verify JWT token
export const protect = async (req, res, next) => {
  try {
    let token;

    // Check if authorization header exists and starts with Bearer
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Not authorized, no token provided' 
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token (select password explicitly since it's excluded by default)
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'User not found or token invalid' 
      });
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid token' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expired' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      message: 'Authentication failed' 
    });
  }
};

// Role-based access control
export const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires ${roles.join(' or ')} role`,
      });
    }
    next();
  };
};
