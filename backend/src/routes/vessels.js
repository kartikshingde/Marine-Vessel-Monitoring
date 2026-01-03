import express from 'express';
import axios from 'axios';
import Vessel from '../models/Vessel.js';
import NoonReport from '../models/NoonReport.js';
import { protect, restrictTo } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * Helper: check captain owns vessel (FIXED for populated ObjectIds)
 */
const ensureCaptainOwnsVessel = (user, vessel) => {
  if (user.role !== 'captain') return true;
  // Handle both raw ObjectId and populated captain object
  const captainIdStr = user._id.toString();
  const vesselCaptainIdStr = vessel.captainId?._id 
    ? vessel.captainId._id.toString() 
    : vessel.captainId?.toString();
  return vesselCaptainIdStr === captainIdStr;
};

/**
 * Helper: Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return distance;
};

/**
 * GET /api/vessels
 * Manager: all vessels (populated)
 * Captain: only own vessel(s)
 */
router.get('/', protect, async (req, res) => {
  try {
    console.log('🔍 GET /vessels - User:', req.user._id, 'Role:', req.user.role);
    
    let query = {};
    if (req.user.role === 'captain') {
      query = { captainId: req.user._id };
      console.log('🔍 Captain filtering by:', query);
    }

    const vessels = await Vessel.find(query)
      .populate('captainId', 'name email')
      .populate('lastNoonReportId', 'reportedAt averageSpeed')
      .sort({ updatedAt: -1 });
    
    console.log('🔍 Vessels found:', vessels.length);
    if (vessels.length > 0) {
      console.log('🔍 First vessel:', vessels[0].name, 'Captain:', vessels[0].captainId?._id || vessels[0].captainId);
    }

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

/**
 * GET /api/vessels/noon-reports-count
 * ⚠️ MUST be BEFORE /:id routes to avoid conflicts
 * Manager only - Get total count of all noon reports
 */
router.get('/noon-reports-count', protect, restrictTo('manager'), async (req, res) => {
  try {
    const count = await NoonReport.countDocuments();
    console.log('📊 Total noon reports:', count);
    
    res.status(200).json({
      success: true,
      count: count,
    });
  } catch (error) {
    console.error('Count Noon Reports Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to count noon reports',
    });
  }
});

/**
 * GET /api/vessels/noon-reports/recent
 * Get recent noon reports from all vessels (Manager only)
 */
router.get(
  '/noon-reports/recent',
  protect,
  restrictTo('manager'),
  async (req, res) => {
    try {
      const { limit = 10 } = req.query;

      const reports = await NoonReport.find()
        .populate('vesselId', 'name mmsi')
        .populate('captainId', 'name email')
        .sort({ reportedAt: -1 })
        .limit(parseInt(limit));

      res.status(200).json({
        success: true,
        count: reports.length,
        data: reports,
      });
    } catch (error) {
      console.error('Get recent reports error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch recent reports',
      });
    }
  }
);

/**
 * POST /api/vessels
 */
router.post('/', protect, async (req, res) => {
  try {
    const {
      name, mmsi, imo, vesselType, flag, status, currentPosition,
      speed, heading, destination, eta, captainId,
    } = req.body;

    if (!name || !mmsi) {
      return res.status(400).json({
        success: false,
        message: 'Name and MMSI are required',
      });
    }

    const assignedCaptainId = req.user.role === 'captain' ? req.user._id : captainId || null;
    console.log('📝 Creating vessel - captainId:', assignedCaptainId);

    const vessel = await Vessel.create({
      name, mmsi, imo, vesselType, flag,
      status: status || 'active',
      currentPosition: currentPosition || {
        latitude: 0, longitude: 0, timestamp: new Date(),
      },
      speed: speed || 0,
      heading: heading || 0,
      destination, eta,
      captainId: assignedCaptainId,
    });

    const io = req.app.get('io');
    io.emit('vessel-added', { vessel });

    res.status(201).json({
      success: true,
      message: 'Vessel created',
      data: vessel,
    });
  } catch (error) {
    console.error('Create Vessel Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create vessel',
    });
  }
});

/**
 * GET /api/vessels/:id
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id)
      .populate('captainId', 'name email')
      .populate('lastNoonReportId', 'reportedAt');

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    if (!ensureCaptainOwnsVessel(req.user, vessel)) {
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

/**
 * PUT /api/vessels/:id - FIXED for captainId updates
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    if (!ensureCaptainOwnsVessel(req.user, vessel) && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const allowedFields = [
      'name', 'mmsi', 'imo', 'vesselType', 'flag', 'status',
      'speed', 'heading', 'destination', 'eta',
    ];

    // Managers can update captainId
    if (req.user.role === 'manager') {
      allowedFields.push('captainId');
    }

    console.log('🔧 Updating vessel - captainId:', req.body.captainId);

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vessel[field] = req.body[field];
      }
    });

    await vessel.save();

    const io = req.app.get('io');
    io.emit('vessel-updated', { vessel });
    
    if (req.body.captainId) {
      io.emit('vessel-captain-assigned', {
        vesselId: vessel._id,
        captainId: req.body.captainId,
        vesselName: vessel.name
      });
    }

    res.status(200).json({
      success: true,
      message: 'Vessel updated',
      data: vessel,
    });
  } catch (error) {
    console.error('Update Vessel Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update vessel',
    });
  }
});

/**
 * DELETE /api/vessels/:id
 */
router.delete('/:id', protect, restrictTo('manager'), async (req, res) => {
  try {
    const vessel = await Vessel.findByIdAndDelete(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    const io = req.app.get('io');
    io.emit('vessel-deleted', { vesselId: vessel._id });

    res.status(200).json({
      success: true,
      message: 'Vessel deleted',
    });
  } catch (error) {
    console.error('Delete Vessel Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete vessel',
    });
  }
});

/**
 * GET /api/vessels/:id/track
 */
router.get('/:id/track', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id).select('positionHistory');

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    if (!ensureCaptainOwnsVessel(req.user, vessel)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

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

/**
 * PUT /api/vessels/:id/position
 */
router.put('/:id/position', protect, async (req, res) => {
  try {
    const { latitude, longitude, speed, heading } = req.body;

    const vessel = await Vessel.findById(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    if (!ensureCaptainOwnsVessel(req.user, vessel) && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    vessel.currentPosition = {
      latitude, longitude, timestamp: new Date(),
    };

    if (speed !== undefined) vessel.speed = speed;
    if (heading !== undefined) vessel.heading = heading;

    vessel.positionHistory.push({
      latitude, longitude, timestamp: new Date(),
      speed: speed || vessel.speed,
    });

    if (vessel.positionHistory.length > 50) {
      vessel.positionHistory = vessel.positionHistory.slice(-50);
    }

    await vessel.save();

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

/**
 * GET /api/vessels/:id/weather
 */
router.get('/:id/weather', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    if (!ensureCaptainOwnsVessel(req.user, vessel)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { latitude, longitude } = vessel.currentPosition;
    const apiKey = process.env.OPENWEATHER_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'OpenWeatherMap API key not configured',
      });
    }

    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;

    try {
      const weatherResponse = await axios.get(weatherUrl, { timeout: 5000 });
      const weatherInfo = weatherResponse.data;

      let waveHeight = '0.5';

      try {
        const marineUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly,daily,alerts&units=metric&appid=${apiKey}`;
        const marineResponse = await axios.get(marineUrl, { timeout: 5000 });

        if (marineResponse.data.current?.wave_height) {
          waveHeight = marineResponse.data.current.wave_height.toFixed(1);
        } else {
          const windSpeed = weatherInfo.wind.speed;
          if (windSpeed < 5) waveHeight = '0.5';
          else if (windSpeed < 10) waveHeight = '1.0';
          else if (windSpeed < 15) waveHeight = '1.5';
          else if (windSpeed < 20) waveHeight = '2.0';
          else waveHeight = '2.5';
        }
      } catch {
        // ignore marine errors
      }

      const weather = {
        condition: weatherInfo.weather[0].main,
        description: weatherInfo.weather[0].description,
        icon: weatherInfo.weather[0].icon,
        temperature: Math.round(weatherInfo.main.temp),
        feelsLike: Math.round(weatherInfo.main.feels_like),
        tempMin: Math.round(weatherInfo.main.temp_min),
        tempMax: Math.round(weatherInfo.main.temp_max),
        humidity: weatherInfo.main.humidity,
        pressure: weatherInfo.main.pressure,
        windSpeed: Math.round(weatherInfo.wind.speed * 3.6),
        windDirection: weatherInfo.wind.deg || 0,
        windGust: weatherInfo.wind.gust ? Math.round(weatherInfo.wind.gust * 3.6) : null,
        visibility: weatherInfo.visibility ? (weatherInfo.visibility / 1000).toFixed(1) : 'N/A',
        cloudiness: weatherInfo.clouds.all,
        waveHeight,
        sunrise: weatherInfo.sys.sunrise
          ? new Date(weatherInfo.sys.sunrise * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A',
        sunset: weatherInfo.sys.sunset
          ? new Date(weatherInfo.sys.sunset * 1000).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'N/A',
        location: weatherInfo.name || 'Open Sea',
        country: weatherInfo.sys.country || '',
        timestamp: new Date(),
        coordinates: {
          lat: weatherInfo.coord.lat,
          lon: weatherInfo.coord.lon,
        },
      };

      res.status(200).json({
        success: true,
        data: weather,
      });
    } catch (apiError) {
      console.error('OpenWeatherMap API Error:', apiError.response?.data || apiError.message);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch weather data',
      });
    }
  } catch (error) {
    console.error('Weather Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data',
    });
  }
});

/**
 * POST /api/vessels/:id/noon-report
 *  ENHANCED: Auto-calculate distance, validate fuel, broadcast to managers
 */
router.post('/:id/noon-report', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    if (!ensureCaptainOwnsVessel(req.user, vessel) && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const {
      reportedAt, position, averageSpeed, distanceSinceLastNoon, courseOverGround,
      fuelRob, fuelConsumedSinceLastNoon, mainEngineRpm, mainEnginePower,
      weather, voyageNo, nextPort, eta,
    } = req.body;

    if (!position?.latitude || !position?.longitude) {
      return res.status(400).json({
        success: false,
        message: 'Position (latitude & longitude) is required',
      });
    }

    // ✅ VALIDATION: Fuel consumed cannot exceed ROB
    if (fuelConsumedSinceLastNoon && fuelRob) {
      if (fuelConsumedSinceLastNoon > fuelRob) {
        return res.status(400).json({
          success: false,
          message: 'Fuel consumed cannot exceed Remaining on Board (ROB)',
        });
      }
    }

    // ✅ AUTO-CALCULATE DISTANCE if not provided
    let calculatedDistance = distanceSinceLastNoon;
    
    if (!calculatedDistance) {
      // Get last noon report to calculate distance
      const lastReport = await NoonReport.findOne({ vesselId: vessel._id })
        .sort({ reportedAt: -1 })
        .limit(1);

      if (lastReport && lastReport.position) {
        calculatedDistance = calculateDistance(
          lastReport.position.latitude,
          lastReport.position.longitude,
          position.latitude,
          position.longitude
        );
        console.log(`📏 Auto-calculated distance: ${calculatedDistance.toFixed(2)} nm`);
      }
    }

    const report = await NoonReport.create({
      vesselId: vessel._id,
      captainId: req.user._id,
      reportedAt: reportedAt || new Date(),
      position,
      averageSpeed,
      distanceSinceLastNoon: calculatedDistance,
      courseOverGround,
      fuelRob,
      fuelConsumedSinceLastNoon,
      mainEngineRpm,
      mainEnginePower,
      weather,
      voyageNo,
      nextPort,
      eta,
    });

    vessel.lastNoonReportAt = report.reportedAt;
    vessel.lastNoonReportId = report._id;
    await vessel.save();

    // ✅ BROADCAST: Notify all managers via Socket.IO
    const io = req.app.get('io');
    
    // Populate report for broadcast
    const populatedReport = await NoonReport.findById(report._id)
      .populate('vesselId', 'name mmsi')
      .populate('captainId', 'name email');

    io.emit('new-noon-report', {
      report: populatedReport,
      message: `New noon report from ${vessel.name}`,
    });

    io.emit('noon-report-created', {
      vesselId: vessel._id,
      reportSummary: {
        _id: report._id,
        reportedAt: report.reportedAt,
        position: report.position,
        averageSpeed: report.averageSpeed,
        distanceSinceLastNoon: report.distanceSinceLastNoon,
        fuelRob: report.fuelRob,
        fuelConsumedSinceLastNoon: report.fuelConsumedSinceLastNoon,
        nextPort: report.nextPort,
        eta: report.eta,
      },
    });

    console.log('📡 Broadcasted new noon report to all clients');

    res.status(201).json({
      success: true,
      message: 'Noon report created',
      data: report,
    });
  } catch (error) {
    console.error('Create Noon Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create noon report',
    });
  }
});

/**
 * GET /api/vessels/:id/noon-reports
 */
router.get('/:id/noon-reports', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    if (!ensureCaptainOwnsVessel(req.user, vessel) && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const reports = await NoonReport.find({ vesselId: vessel._id })
      .sort({ reportedAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports,
    });
  } catch (error) {
    console.error('Get Noon Reports Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch noon reports',
    });
  }
});

/**
 * GET /api/vessels/:id/noon-reports/latest
 */
router.get('/:id/noon-reports/latest', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    if (!ensureCaptainOwnsVessel(req.user, vessel) && req.user.role !== 'manager') {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const report = await NoonReport.findOne({ vesselId: vessel._id }).sort({
      reportedAt: -1,
    });

    res.status(200).json({
      success: true,
      data: report || null,
    });
  } catch (error) {
    console.error('Get Latest Noon Report Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest noon report',
    });
  }
});

export default router;
