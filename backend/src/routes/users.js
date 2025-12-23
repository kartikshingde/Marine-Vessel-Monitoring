import express from 'express';
import User from '../models/User.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/users?role=captain (Manager only)
router.get('/', protect, restrictTo('manager'), async (req, res) => {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 });
      
    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

export default router;
