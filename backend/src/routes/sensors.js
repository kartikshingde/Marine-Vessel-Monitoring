import express from 'express';
import SensorReading from '../models/SensorReading.js';
import Vessel from '../models/Vessel.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * GET /api/sensors/latest/all
 * Get latest sensor readings for ALL vessels (Manager only)
 */
router.get('/latest/all', protect, restrictTo('manager'), async (req, res) => {
  try {
    const vessels = await Vessel.find({ status: 'active' });

    const sensorsData = await Promise.all(
      vessels.map(async (vessel) => {
        const [engineTemp, fuelLevel, speed, rpm, heading] = await Promise.all([
          SensorReading.findOne({
            vesselId: vessel._id,
            sensorType: 'engine_temp'
          }).sort({ timestamp: -1 }),

          SensorReading.findOne({
            vesselId: vessel._id,
            sensorType: 'fuel_level'
          }).sort({ timestamp: -1 }),

          SensorReading.findOne({
            vesselId: vessel._id,
            sensorType: 'gps'
          }).sort({ timestamp: -1 }),

          SensorReading.findOne({
            vesselId: vessel._id,
            sensorType: 'rpm'
          }).sort({ timestamp: -1 }),

          SensorReading.findOne({
            vesselId: vessel._id,
            sensorType: 'heading'
          }).sort({ timestamp: -1 }),
        ]);

        return {
          vesselId: vessel._id,
          vesselName: vessel.name,
          sensors: {
            engineTemp: engineTemp?.value || 0,
            fuelLevel: fuelLevel?.value || 0,
            speed: speed?.value || vessel.speed || 0,
            rpm: rpm?.value || 0,
            heading: heading?.value || vessel.heading || 0,
          },
          lastUpdate: engineTemp?.timestamp || new Date(),
        };
      })
    );

    res.status(200).json({
      success: true,
      count: sensorsData.length,
      data: sensorsData,
    });
  } catch (error) {
    console.error('Get all sensors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor data',
    });
  }
});

/**
 * GET /api/sensors/latest/:vesselId
 * FIXED: Better captain ownership check
 */
router.get('/latest/:vesselId', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.vesselId);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    // ✅ FIXED: Better captain ownership check
    if (req.user.role === 'captain') {
      const vesselCaptainId = vessel.captainId?._id 
        ? vessel.captainId._id.toString() 
        : vessel.captainId?.toString();

      const userId = req.user._id.toString();

      console.log('🔍 Captain access check:');
      console.log('  User ID:', userId);
      console.log('  Vessel captain ID:', vesselCaptainId);

      if (vesselCaptainId !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own vessel sensors.',
        });
      }
    }

    // Get latest reading for each sensor type
    const [engineTemp, fuelLevel, speed, rpm, heading] = await Promise.all([
      SensorReading.findOne({
        vesselId: vessel._id,
        sensorType: 'engine_temp'
      }).sort({ timestamp: -1 }),

      SensorReading.findOne({
        vesselId: vessel._id,
        sensorType: 'fuel_level'
      }).sort({ timestamp: -1 }),

      SensorReading.findOne({
        vesselId: vessel._id,
        sensorType: 'gps'
      }).sort({ timestamp: -1 }),

      SensorReading.findOne({
        vesselId: vessel._id,
        sensorType: 'rpm'
      }).sort({ timestamp: -1 }),

      SensorReading.findOne({
        vesselId: vessel._id,
        sensorType: 'heading'
      }).sort({ timestamp: -1 }),
    ]);

    const sensorsData = {
      vesselId: vessel._id,
      vesselName: vessel.name,
      sensors: {
        engineTemp: engineTemp?.value || 0,
        fuelLevel: fuelLevel?.value || 0,
        speed: speed?.value || vessel.speed || 0,
        rpm: rpm?.value || 0,
        heading: heading?.value || vessel.heading || 0,
      },
      lastUpdate: engineTemp?.timestamp || new Date(),
    };

    res.status(200).json({
      success: true,
      data: sensorsData,
    });
  } catch (error) {
    console.error('Get vessel sensors error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor data',
    });
  }
});

/**
 * GET /api/sensors/history/:vesselId
 */
router.get('/history/:vesselId', protect, async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    const vessel = await Vessel.findById(req.params.vesselId);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    // Check access for captain
    if (req.user.role === 'captain') {
      const vesselCaptainId = vessel.captainId?._id 
        ? vessel.captainId._id.toString() 
        : vessel.captainId?.toString();

      if (vesselCaptainId !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied',
        });
      }
    }

    const timeFilter = new Date();
    timeFilter.setHours(timeFilter.getHours() - parseInt(hours));

    const readings = await SensorReading.find({
      vesselId: vessel._id,
      timestamp: { $gte: timeFilter },
    }).sort({ timestamp: 1 });

    res.status(200).json({
      success: true,
      count: readings.length,
      data: readings,
    });
  } catch (error) {
    console.error('Get sensor history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sensor history',
    });
  }
});

export default router;
