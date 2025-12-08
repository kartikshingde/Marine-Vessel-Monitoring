import express from 'express';
import axios from 'axios';
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

// @route   GET /api/vessels/:id/weather
// @desc    Get LIVE weather for vessel's current location
// @access  Private
router.get('/:id/weather', protect, async (req, res) => {
  try {
    const vessel = await Vessel.findById(req.params.id);

    if (!vessel) {
      return res.status(404).json({
        success: false,
        message: 'Vessel not found',
      });
    }

    // Captain can only access their vessel's weather
    if (req.user.role === 'captain' && vessel.captainId?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const { latitude, longitude } = vessel.currentPosition;

    // Check if API key is configured
    const apiKey = process.env.OPENWEATHER_API_KEY;
    
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'OpenWeatherMap API key not configured. Please add OPENWEATHER_API_KEY to .env file',
      });
    }

    // Fetch LIVE weather from OpenWeatherMap
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${apiKey}`;
    
    try {
      const weatherResponse = await axios.get(weatherUrl, { timeout: 5000 });
      const weatherInfo = weatherResponse.data;

      // Get marine data (waves) - try OneCall API
      let waveHeight = '0.5';
      let visibility = weatherInfo.visibility ? (weatherInfo.visibility / 1000).toFixed(1) : 'N/A';
      
      // Try to get wave data (available in some regions)
      try {
        const marineUrl = `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&exclude=minutely,hourly,daily,alerts&units=metric&appid=${apiKey}`;
        const marineResponse = await axios.get(marineUrl, { timeout: 5000 });
        
        if (marineResponse.data.current?.wave_height) {
          waveHeight = marineResponse.data.current.wave_height.toFixed(1);
        }
      } catch (marineErr) {
        // Marine data not available - use estimated wave height based on wind speed
        const windSpeed = weatherInfo.wind.speed;
        if (windSpeed < 5) waveHeight = '0.5';
        else if (windSpeed < 10) waveHeight = '1.0';
        else if (windSpeed < 15) waveHeight = '1.5';
        else if (windSpeed < 20) waveHeight = '2.0';
        else waveHeight = '2.5';
      }

      // Format weather data
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
        windSpeed: Math.round(weatherInfo.wind.speed * 3.6), // Convert m/s to km/h
        windDirection: weatherInfo.wind.deg || 0,
        windGust: weatherInfo.wind.gust ? Math.round(weatherInfo.wind.gust * 3.6) : null,
        visibility: visibility,
        cloudiness: weatherInfo.clouds.all,
        waveHeight: waveHeight,
        sunrise: weatherInfo.sys.sunrise ? new Date(weatherInfo.sys.sunrise * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        sunset: weatherInfo.sys.sunset ? new Date(weatherInfo.sys.sunset * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : 'N/A',
        location: weatherInfo.name || 'Open Sea',
        country: weatherInfo.sys.country || '',
        timestamp: new Date(),
        coordinates: {
          lat: weatherInfo.coord.lat,
          lon: weatherInfo.coord.lon,
        }
      };

      res.status(200).json({
        success: true,
        data: weather,
      });

    } catch (apiError) {
      console.error('OpenWeatherMap API Error:', apiError.response?.data || apiError.message);
      
      // Return error with helpful message
      let errorMessage = 'Failed to fetch weather data';
      
      if (apiError.response?.status === 401) {
        errorMessage = 'Invalid OpenWeatherMap API key. Please check your OPENWEATHER_API_KEY in .env';
      } else if (apiError.response?.status === 404) {
        errorMessage = 'Weather data not available for this location';
      } else if (apiError.code === 'ECONNABORTED') {
        errorMessage = 'Weather API request timeout. Please try again';
      }

      res.status(500).json({
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? apiError.message : undefined,
      });
    }

  } catch (error) {
    console.error('Weather Route Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weather data',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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
 