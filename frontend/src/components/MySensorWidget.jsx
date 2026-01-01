import { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import SensorCard from './SensorCard';
import api from '../utils/api';

const MySensorWidget = ({ vesselId, socket }) => {
  const [sensors, setSensors] = useState({
    engineTemp: 0,
    fuelLevel: 0,
    speed: 0,
    rpm: 0,
    heading: 0,
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  // Fetch initial sensor data
  useEffect(() => {
    if (!vesselId) return;

    const fetchSensors = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/sensors/latest/${vesselId}`);
        setSensors(data.data.sensors);
        setLastUpdate(data.data.lastUpdate);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch sensors:', error);
        setLoading(false);
      }
    };

    fetchSensors();
  }, [vesselId]);

  // Listen for real-time updates
  useEffect(() => {
    if (!socket || !vesselId) return;

    const handleSensorUpdate = (data) => {
      if (data.vesselId === vesselId) {
        console.log('🔔 My vessel sensor update:', data);
        setSensors(data.sensors);
        setLastUpdate(data.timestamp);

        // Check for alerts
        const newAlerts = [];
        if (data.sensors.engineTemp >= 90) {
          newAlerts.push('🔥 High engine temperature detected!');
        }
        if (data.sensors.fuelLevel < 20) {
          newAlerts.push('⛽ Low fuel level!');
        }
        setAlerts(newAlerts);
      }
    };

    socket.on('sensor-update', handleSensorUpdate);

    return () => {
      socket.off('sensor-update', handleSensorUpdate);
    };
  }, [socket, vesselId]);

  // Manual refresh
  const handleRefresh = async () => {
    try {
      const { data } = await api.get(`/sensors/latest/${vesselId}`);
      setSensors(data.data.sensors);
      setLastUpdate(data.data.lastUpdate);
    } catch (error) {
      console.error('Failed to refresh sensors:', error);
    }
  };

  const timeAgo = (date) => {
    if (!date) return 'Never';
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds} seconds ago`;
    return `${Math.floor(seconds / 60)} minutes ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Loading sensors...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            🌡️ My Vessel Sensors
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {timeAgo(lastUpdate)}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-red-800 mb-2">Active Alerts</h3>
              {alerts.map((alert, idx) => (
                <p key={idx} className="text-sm text-red-700">{alert}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Sensor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SensorCard
          type="engineTemp"
          value={sensors.engineTemp}
          unit="°C"
          label="Engine Temperature"
          size="large"
        />
        <SensorCard
          type="fuelLevel"
          value={sensors.fuelLevel}
          unit="%"
          label="Fuel Level"
          size="large"
        />
        <SensorCard
          type="speed"
          value={sensors.speed}
          unit="knots"
          label="Speed"
          size="large"
        />
        <SensorCard
          type="rpm"
          value={sensors.rpm}
          unit="RPM"
          label="Engine RPM"
          size="large"
        />
      </div>

      {/* Heading (full width) */}
      <div className="mt-6">
        <SensorCard
          type="heading"
          value={sensors.heading}
          unit="°"
          label="Heading"
          size="large"
        />
      </div>
    </div>
  );
};

export default MySensorWidget;
