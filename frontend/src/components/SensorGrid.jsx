import { useEffect, useState } from 'react';
import { Ship, RefreshCw } from 'lucide-react';
import SensorCard from './SensorCard';
import api from '../utils/api';

const SensorGrid = ({ vessels, socket }) => {
  const [sensorsData, setSensorsData] = useState({});
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Fetch initial sensor data
  useEffect(() => {
    const fetchSensorData = async () => {
      try {
        setLoading(true);
        const { data } = await api.get('/sensors/latest/all');
        
        // Convert array to object keyed by vesselId
        const sensorsMap = {};
        data.data.forEach(item => {
          sensorsMap[item.vesselId] = item;
        });
        
        setSensorsData(sensorsMap);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch sensor data:', error);
        setLoading(false);
      }
    };

    fetchSensorData();
  }, []);

  // Listen for real-time sensor updates via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleSensorUpdate = (data) => {
      console.log('🔔 Sensor update received:', data);
      
      setSensorsData(prev => ({
        ...prev,
        [data.vesselId]: {
          vesselId: data.vesselId,
          sensors: data.sensors,
          lastUpdate: new Date(data.timestamp),
        },
      }));
      
      setLastUpdate(new Date());
    };

    socket.on('sensor-update', handleSensorUpdate);

    return () => {
      socket.off('sensor-update', handleSensorUpdate);
    };
  }, [socket]);

  // Manual refresh function
  const handleRefresh = async () => {
    try {
      const { data } = await api.get('/sensors/latest/all');
      
      const sensorsMap = {};
      data.data.forEach(item => {
        sensorsMap[item.vesselId] = item;
      });
      
      setSensorsData(sensorsMap);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to refresh sensor data:', error);
    }
  };

  // Format time ago
  const timeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 10) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
        <p className="text-gray-600">Loading sensor data...</p>
      </div>
    );
  }

  if (vessels.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <Ship className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600">No vessels available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            🌡️ Live Vessel Sensors
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {vessels.map((vessel) => {
          const sensorData = sensorsData[vessel._id];
          const sensors = sensorData?.sensors || {
            engineTemp: 0,
            fuelLevel: 0,
            speed: 0,
            rpm: 0,
            heading: 0,
          };

          return (
            <div
              key={vessel._id}
              className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:shadow-md transition-all duration-300"
            >
              {/* Vessel Header */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-300">
                <Ship className="w-6 h-6 text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{vessel.name}</h3>
                  <p className="text-xs text-gray-500">MMSI: {vessel.mmsi}</p>
                </div>
                <div className="text-xs text-gray-400">
                  {sensorData ? timeAgo(sensorData.lastUpdate) : 'No data'}
                </div>
              </div>

              {/* Sensor Cards Grid */}
              <div className="grid grid-cols-2 gap-3">
                <SensorCard
                  type="engineTemp"
                  value={sensors.engineTemp}
                  unit="°C"
                  label="Engine"
                  size="normal"
                />
                <SensorCard
                  type="fuelLevel"
                  value={sensors.fuelLevel}
                  unit="%"
                  label="Fuel"
                  size="normal"
                />
                <SensorCard
                  type="speed"
                  value={sensors.speed}
                  unit="kn"
                  label="Speed"
                  size="normal"
                />
                <SensorCard
                  type="rpm"
                  value={sensors.rpm}
                  unit="RPM"
                  label="Engine"
                  size="normal"
                />
              </div>

              {/* Heading (full width) */}
              <div className="mt-3">
                <SensorCard
                  type="heading"
                  value={sensors.heading}
                  unit="°"
                  label="Heading"
                  size="normal"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SensorGrid;
