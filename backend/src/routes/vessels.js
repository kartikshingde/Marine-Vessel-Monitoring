import express from 'express';
import Vessel from '../models/Vessel.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

// @route   GET /api/vessels
// @desc    Get all vessels (Manager) or assigned vessel (Captain)
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    let query = {};

    // If captain, only show their assigned vessel
    if (req.user.role === 'captain') {
      query.captainId = req.user._id;
    }

    const vessels = await Vessel.find(query).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      count: vessels.length,
      data: vessels,
    });
  } catch (error) {
    console.error('Get Vessels Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vessels',
    });
  }
});

// @route   GET /api/vessels/:id
// @desc    Get single vessel details
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    // Captain can only access their vessel
    if (req.user.role === 'captain' && vessel.captainId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    res.status(200).json({
      success: true,
      data: vessel,
    });
  } catch (error) {
    console.error('Get Vessel Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vessel',
    });
  }
});

// @route   GET /api/vessels/:id/track
// @desc    Get vessel position history (last 20 positions)
// @access  Private
router.get('/:id/track', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id).select('positionHistory');

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    // Get last 20 positions
    const track = vessel.positionHistory.slice(-20);

    res.status(200).json({
      success: true,
      data: track,
    });
  } catch (error) {
    console.error('Get Track Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch vessel track',
    });
  }
});

// @route   PUT /api/vessels/:id/position
// @desc    Update vessel position (for testing)
// @access  Private - Manager only
router.put('/:id/position', protect, restrictTo('manager'), async (req, res) => {
  try {
    const { latitude, longitude, speed, heading } = req.body;

    const vessel = await Vessel.findById(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    // Update current position
    vessel.currentPosition = {
      latitude,
      longitude,
      timestamp: new Date(),
    };

    if (speed !== undefined) vessel.speed = speed;
    if (heading !== undefined) vessel.heading = heading;

    // Add to position history
    vessel.positionHistory.push({
      latitude,
      longitude,
      timestamp: new Date(),
      speed: speed || vessel.speed,
    });

    // Keep only last 50 positions
    if (vessel.positionHistory.length > 50) {
      vessel.positionHistory = vessel.positionHistory.slice(-50);
    }

    await vessel.save();

    // Emit Socket.IO event
    const io = req.app.get('io');
    io.emit('vessel-position-update', {
      vesselId: vessel._id,
      position: vessel.currentPosition,
      speed: vessel.speed,
      heading: vessel.heading,
    });

    res.status(200).json({
      success: true,
      message: 'Vessel position updated',
      data: vessel,
    });
  } catch (error) {
    console.error('Update Position Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vessel position',
    });
  }
});

export default router;
