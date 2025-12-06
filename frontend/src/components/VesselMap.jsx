import { useEffect, useState, useContext, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { io } from 'socket.io-client';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom ship icon
const createShipIcon = (status) => {
  const color = status === 'active' ? '#10b981' : '#6b7280';
  return L.divIcon({
    html: `<div style="font-size: 24px; color: ${color}; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));">🚢</div>`,
    className: 'custom-ship-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
  });
};

// Component to handle map centering
function MapCenter({ center }) {
  const map = useMap();
  
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  
  return null;
}

const VesselMap = () => {
  const { user } = useContext(AuthContext);
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [mapCenter, setMapCenter] = useState([20, 0]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  // Fetch vessels on mount
  useEffect(() => {
    const fetchVessels = async () => {
      try {
        const { data } = await api.get('/vessels');
        setVessels(data.data);
        
        // Center map on first vessel
        if (data.data.length > 0) {
          const firstVessel = data.data[0];
          setMapCenter([firstVessel.currentPosition.latitude, firstVessel.currentPosition.longitude]);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching vessels:', error);
        setLoading(false);
      }
    };

    fetchVessels();
  }, []);

  // Socket.IO real-time updates with useRef to prevent double connection
  useEffect(() => {
    // Prevent double connection in React 19 Strict Mode
    if (socketRef.current) return;

    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000', {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Socket.IO connected:', socket.id);
    });

    socket.on('vessel-position-update', (data) => {
      console.log('📍 Vessel position update:', data);
      
      setVessels((prevVessels) =>
        prevVessels.map((vessel) =>
          vessel._id === data.vesselId
            ? {
                ...vessel,
                currentPosition: data.position,
                speed: data.speed,
                heading: data.heading,
              }
            : vessel
        )
      );
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket.IO disconnected');
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  const handleVesselClick = (vessel) => {
    setSelectedVessel(vessel);
    setMapCenter([vessel.currentPosition.latitude, vessel.currentPosition.longitude]);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {/* Vessel List Sidebar */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
        <div className="p-6 border-b border-gray-200 bg-linear-to-r from-blue-50 to-cyan-50">
          <h3 className="text-xl font-bold text-gray-900">Vessels</h3>
          <p className="text-sm text-gray-600 mt-1">{vessels.length} active</p>
        </div>

        <div className="p-4 space-y-3">
          {vessels.map((vessel) => (
            <div
              key={vessel._id}
              onClick={() => handleVesselClick(vessel)}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedVessel?._id === vessel._id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚢</span>
                  <h4 className="font-bold text-gray-900">{vessel.name}</h4>
                </div>
                <span className={`w-3 h-3 rounded-full ${vessel.status === 'active' ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
              </div>
              
              <div className="space-y-1 text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Speed:</span> {vessel.speed} knots
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">MMSI:</span> {vessel.mmsi}
                </p>
                <p className="text-gray-500 text-xs">
                  {new Date(vessel.currentPosition.timestamp).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={5}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapCenter center={mapCenter} />

          {vessels.map((vessel) => (
            <Marker
              key={vessel._id}
              position={[vessel.currentPosition.latitude, vessel.currentPosition.longitude]}
              icon={createShipIcon(vessel.status)}
              eventHandlers={{
                click: () => handleVesselClick(vessel),
              }}
            >
              <Popup>
                <div className="p-2">
                  <h3 className="font-bold text-gray-900 mb-2">{vessel.name}</h3>
                  <div className="space-y-1 text-sm">
                    <p><span className="font-medium">MMSI:</span> {vessel.mmsi}</p>
                    <p><span className="font-medium">Speed:</span> {vessel.speed} knots</p>
                    <p><span className="font-medium">Heading:</span> {vessel.heading}°</p>
                    <p><span className="font-medium">Status:</span> {vessel.status}</p>
                    <p className="text-gray-500 text-xs mt-2">
                      Last update: {new Date(vessel.currentPosition.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Draw track line for selected vessel if it has history */}
          {selectedVessel?.positionHistory && selectedVessel.positionHistory.length > 0 && (
            <Polyline
              positions={selectedVessel.positionHistory.map((pos) => [pos.latitude, pos.longitude])}
              color="#3b82f6"
              weight={2}
              opacity={0.6}
              dashArray="5, 10"
            />
          )}
        </MapContainer>

        {/* Map Legend */}
        <div className="absolute bottom-6 left-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-1000">
          <h4 className="font-bold text-gray-900 mb-3">Legend</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-gray-700">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
              <span className="text-gray-700">Docked</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-12 h-0.5 bg-blue-500" style={{ borderStyle: 'dashed' }}></div>
              <span className="text-gray-700">Track</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VesselMap;
