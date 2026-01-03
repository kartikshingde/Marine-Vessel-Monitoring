import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Polyline, Popup } from 'react-leaflet';
import api from '../utils/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Ship, ArrowLeft, RefreshCw, MapPin, Gauge, Navigation as NavigationIcon } from 'lucide-react';
import io from 'socket.io-client';

// Fix Leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const TrackVessel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [vessel, setVessel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  // Load vessel data
  useEffect(() => {
    const loadVessel = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/vessels/${id}`);
        setVessel(data.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to load vessel:', error);
        setLoading(false);
      }
    };

    loadVessel();
  }, [id]);

  // Socket.IO for real-time updates
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Listen for position updates
  useEffect(() => {
    if (!socket || !vessel) return;

    const handlePositionUpdate = (data) => {
      if (data.vesselId === vessel._id) {
        console.log('📍 Position update:', data);
        setVessel(prev => ({
          ...prev,
          currentPosition: data.position,
          speed: data.speed,
          heading: data.heading,
        }));
      }
    };

    socket.on('vessel-position-update', handlePositionUpdate);

    return () => {
      socket.off('vessel-position-update', handlePositionUpdate);
    };
  }, [socket, vessel]);

  const formatDateTime = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-lg">Loading vessel...</p>
        </div>
      </div>
    );
  }

  if (!vessel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <Ship className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Vessel Not Found</h2>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Prepare track line from position history
  const trackCoordinates = vessel.positionHistory?.length > 0
    ? vessel.positionHistory.map(pos => [pos.latitude, pos.longitude])
    : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </button>
              <div className="h-8 w-px bg-gray-300"></div>
              <Ship className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{vessel.name}</h1>
                <p className="text-sm text-gray-500">MMSI: {vessel.mmsi}</p>
              </div>
            </div>
            <span
              className={`px-4 py-2 rounded-full text-sm font-bold ${
                vessel.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {vessel.status}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-xs text-gray-500">Latitude</p>
                <p className="text-lg font-bold text-gray-900">
                  {vessel.currentPosition?.latitude.toFixed(6)}°
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-xs text-gray-500">Longitude</p>
                <p className="text-lg font-bold text-gray-900">
                  {vessel.currentPosition?.longitude.toFixed(6)}°
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <Gauge className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-xs text-gray-500">Speed</p>
                <p className="text-lg font-bold text-gray-900">
                  {vessel.speed?.toFixed(1) || 0} knots
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <NavigationIcon className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-xs text-gray-500">Heading</p>
                <p className="text-lg font-bold text-gray-900">
                  {vessel.heading?.toFixed(0) || 0}°
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-800">Live Vessel Tracking</h2>
            <p className="text-sm text-gray-500">
              Last updated: {formatDateTime(vessel.currentPosition?.timestamp)}
            </p>
          </div>
          
          <div className="h-[600px]">
            <MapContainer
              center={[
                vessel.currentPosition?.latitude || 0,
                vessel.currentPosition?.longitude || 0,
              ]}
              zoom={10}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              />

              {/* Current Position Marker */}
              <Marker
                position={[
                  vessel.currentPosition?.latitude || 0,
                  vessel.currentPosition?.longitude || 0,
                ]}
              >
                <Popup>
                  <div className="text-center">
                    <p className="font-bold">{vessel.name}</p>
                    <p className="text-sm">Speed: {vessel.speed?.toFixed(1)} knots</p>
                    <p className="text-sm">Heading: {vessel.heading?.toFixed(0)}°</p>
                    <p className="text-xs text-gray-500">
                      {formatDateTime(vessel.currentPosition?.timestamp)}
                    </p>
                  </div>
                </Popup>
              </Marker>

              {/* Track Line */}
              {trackCoordinates.length > 0 && (
                <Polyline
                  positions={trackCoordinates}
                  color="blue"
                  weight={3}
                  opacity={0.6}
                />
              )}
            </MapContainer>
          </div>
        </div>

        {/* Position History Table */}
        {vessel.positionHistory?.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg mt-6 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Position History</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Latitude
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Longitude
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Speed
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {vessel.positionHistory.slice(-20).reverse().map((pos, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDateTime(pos.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {pos.latitude.toFixed(6)}°
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {pos.longitude.toFixed(6)}°
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {pos.speed?.toFixed(1) || '-'} knots
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrackVessel;
