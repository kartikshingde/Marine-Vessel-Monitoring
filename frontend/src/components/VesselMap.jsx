import { useEffect, useState, useContext, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";
import api from "../utils/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const createShipIcon = (status, heading = 0) =>
  L.divIcon({
    html: `<div style="font-size:32px;color:${
      status === "active" ? "#10b981" : "#6b7280"
    };filter:drop-shadow(0 2px 6px rgba(0,0,0,0.4));transform:rotate(${
      heading - 90
    }deg);transition:all 0.5s ease;">🚢</div>`,
    className: "custom-ship-icon",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

const getWeatherEmoji = (condition) =>
  ({
    Clear: "☀️",
    Clouds: "☁️",
    Rain: "🌧️",
    Drizzle: "🌦️",
    Thunderstorm: "⛈️",
    Snow: "❄️",
    Mist: "🌫️",
    Fog: "🌫️",
    Haze: "🌫️",
  }[condition] || "🌤️");

function MapCenter({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 8, { duration: 1.5, easeLinearity: 0.5 });
  }, [center, map]);
  return null;
}

const VesselMap = () => {
  const { user } = useContext(AuthContext);
  const [vessels, setVessels] = useState([]);
  const [selectedVessel, setSelectedVessel] = useState(null);
  const [mapCenter, setMapCenter] = useState([13.0827, 80.2707]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [weatherData, setWeatherData] = useState({});
  const [loadingWeather, setLoadingWeather] = useState({});
  const socketRef = useRef(null);

  const fetchVesselWeather = async (vesselId) => {
    try {
      setLoadingWeather((prev) => ({ ...prev, [vesselId]: true }));
      const { data } = await api.get(`/vessels/${vesselId}/weather`);
      setWeatherData((prev) => ({ ...prev, [vesselId]: data.data }));
      setLoadingWeather((prev) => ({ ...prev, [vesselId]: false }));
    } catch (error) {
      console.error(`Weather fetch failed for vessel ${vesselId}:`, error);
      setLoadingWeather((prev) => ({ ...prev, [vesselId]: false }));
    }
  };

  useEffect(() => {
    const fetchVessels = async () => {
      try {
        const { data } = await api.get("/vessels");
        setVessels(data.data);
        if (data.data.length > 0)
          setMapCenter([
            data.data[0].currentPosition.latitude,
            data.data[0].currentPosition.longitude,
          ]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching vessels:", error);
        setLoading(false);
      }
    };
    fetchVessels();
  }, []);

  useEffect(() => {
    if (vessels.length > 0) {
      vessels.forEach((v) => fetchVesselWeather(v._id));
      const interval = setInterval(
        () => vessels.forEach((v) => fetchVesselWeather(v._id)),
        10 * 60 * 1000
      );
      return () => clearInterval(interval);
    }
  }, [vessels]);

  useEffect(() => {
    if (socketRef.current) return;
    const socket = io(
      import.meta.env.VITE_API_URL?.replace("/api", "") ||
        "http://localhost:5000",
      { transports: ["websocket", "polling"] }
    );
    socketRef.current = socket;

    socket.on("connect", () =>
      console.log("✅ Socket.IO connected:", socket.id)
    );
    socket.on("vessel-position-update", (data) => {
      console.log("📍 Vessel position update:", data);
      setVessels((prev) =>
        prev.map((v) =>
          v._id === data.vesselId
            ? {
                ...v,
                currentPosition: data.position,
                speed: data.speed,
                heading: data.heading,
                positionHistory: [
                  ...(v.positionHistory || []),
                  {
                    latitude: data.position.latitude,
                    longitude: data.position.longitude,
                    timestamp: data.position.timestamp,
                    speed: data.speed,
                  },
                ].slice(-20),
              }
            : v
        )
      );
      fetchVesselWeather(data.vesselId);
    });
    socket.on("disconnect", () => console.log("❌ Socket.IO disconnected"));

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  const handleVesselClick = (vessel) => {
    setSelectedVessel(vessel);
    setMapCenter([
      vessel.currentPosition.latitude,
      vessel.currentPosition.longitude,
    ]);
    if (!weatherData[vessel._id] && !loadingWeather[vessel._id])
      fetchVesselWeather(vessel._id);
  };

  const filteredVessels = vessels.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.mmsi.includes(searchQuery);
    const matchesStatus = statusFilter === "all" || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const InfoRow = ({ label, value, mono }) => (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span
        className={`font-semibold text-gray-900 ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {value}
      </span>
    </div>
  );

  const WeatherRow = ({ label, value }) => (
    <div className="flex justify-between">
      <span className="text-gray-600">{label}:</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  );

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading map...</p>
        </div>
      </div>
    );

  return (
    <div className="h-screen flex">
      {/* Sidebar */}
      <div className="w-96 bg-white border-r border-gray-200 overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-gray-200 bg-linear-to-r from-blue-50 to-cyan-50">
          <h3 className="text-xl font-bold text-gray-900">Vessels</h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredVessels.length} of {vessels.length} vessels
          </p>
        </div>

        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by name or MMSI..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <div className="flex gap-2">
            {["all", "active", "docked"].map((filter) => (
              <button
                key={filter}
                onClick={() => setStatusFilter(filter)}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  statusFilter === filter
                    ? filter === "all"
                      ? "bg-blue-600 text-white"
                      : filter === "active"
                      ? "bg-green-600 text-white"
                      : "bg-gray-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredVessels.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>No vessels found</p>
            </div>
          ) : (
            filteredVessels.map((vessel) => (
              <div
                key={vessel._id}
                onClick={() => handleVesselClick(vessel)}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                  selectedVessel?._id === vessel._id
                    ? "border-blue-500 bg-blue-50 shadow-md"
                    : "border-gray-200 hover:border-blue-300 bg-white hover:shadow-md"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🚢</span>
                    <h4 className="font-bold text-gray-900">{vessel.name}</h4>
                  </div>
                  <span
                    className={`w-3 h-3 rounded-full ${
                      vessel.status === "active"
                        ? "bg-green-500 animate-pulse"
                        : "bg-gray-400"
                    }`}
                  ></span>
                </div>
                <div className="space-y-2 text-sm">
                  <InfoRow label="Speed" value={`${vessel.speed} knots`} />
                  <InfoRow label="Heading" value={`${vessel.heading}°`} />
                  <InfoRow label="MMSI" value={vessel.mmsi} mono />
                  {loadingWeather[vessel._id] ? (
                    <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-center py-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-xs text-gray-500">
                        Loading weather...
                      </span>
                    </div>
                  ) : (
                    weatherData[vessel._id] && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-2xl">
                            {getWeatherEmoji(weatherData[vessel._id].condition)}
                          </span>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">
                              {weatherData[vessel._id].temperature}°C
                            </p>
                            <p className="text-xs text-gray-600 capitalize">
                              {weatherData[vessel._id].description}
                            </p>
                            <p className="text-xs text-gray-600">
                              Wind: {weatherData[vessel._id].windSpeed} km/h
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    Updated:{" "}
                    {new Date(
                      vessel.currentPosition.timestamp
                    ).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={mapCenter}
          zoom={6}
          className="h-full w-full"
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapCenter center={mapCenter} />
          {filteredVessels.map((vessel) => (
            <div key={vessel._id}>
              <Marker
                position={[
                  vessel.currentPosition.latitude,
                  vessel.currentPosition.longitude,
                ]}
                icon={createShipIcon(vessel.status, vessel.heading || 0)}
                eventHandlers={{ click: () => handleVesselClick(vessel) }}
              >
                <Popup maxWidth={260} minWidth={260}>
                  <div className="p-3">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">🚢</span>
                        <h3 className="font-bold text-gray-900 text-base">
                          {vessel.name}
                        </h3>
                      </div>
                      <button
                        onClick={() => fetchVesselWeather(vessel._id)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                        disabled={loadingWeather[vessel._id]}
                        title="Refresh weather"
                      >
                        {loadingWeather[vessel._id] ? "⟳" : "🔄"}
                      </button>
                    </div>
                    <div className="space-y-1 mb-3 text-sm">
                      <InfoRow label="MMSI" value={vessel.mmsi} mono />
                      <InfoRow label="Speed" value={`${vessel.speed} knots`} />
                      <InfoRow label="Heading" value={`${vessel.heading}°`} />
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span
                          className={`font-semibold capitalize ${
                            vessel.status === "active"
                              ? "text-green-600"
                              : "text-gray-600"
                          }`}
                        >
                          {vessel.status}
                        </span>
                      </div>
                    </div>
                    {loadingWeather[vessel._id] ? (
                      <div className="border-t border-gray-200 pt-3 flex items-center justify-center py-3">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-xs text-gray-500">
                          Loading...
                        </span>
                      </div>
                    ) : weatherData[vessel._id] ? (
                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-4xl">
                            {getWeatherEmoji(weatherData[vessel._id].condition)}
                          </span>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">
                              {weatherData[vessel._id].temperature}°C
                            </p>
                            <p className="text-xs text-gray-600 capitalize">
                              {weatherData[vessel._id].condition}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <WeatherRow
                            label="Wind"
                            value={`${weatherData[vessel._id].windSpeed} km/h`}
                          />
                          <WeatherRow
                            label="Humidity"
                            value={`${weatherData[vessel._id].humidity}%`}
                          />
                          <WeatherRow
                            label="Wave"
                            value={`${weatherData[vessel._id].waveHeight}m`}
                          />
                          <WeatherRow
                            label="Pressure"
                            value={`${weatherData[vessel._id].pressure} hPa`}
                          />
                        </div>
                        {weatherData[vessel._id].location && (
                          <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
                            <span>📍</span>
                            <span>{weatherData[vessel._id].location}</span>
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="border-t border-gray-200 pt-3 text-center">
                        <p className="text-gray-500 text-sm mb-2">
                          Weather unavailable
                        </p>
                        <button
                          onClick={() => fetchVesselWeather(vessel._id)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Retry
                        </button>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100 text-center">
                      Updated:{" "}
                      {new Date(
                        vessel.currentPosition.timestamp
                      ).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </Popup>
              </Marker>
              {selectedVessel?._id === vessel._id &&
                vessel.positionHistory?.length > 1 && (
                  <Polyline
                    positions={vessel.positionHistory.map((pos) => [
                      pos.latitude,
                      pos.longitude,
                    ])}
                    color="#1e40af"
                    weight={4}
                    opacity={0.9}
                    dashArray="5, 10"
                  />
                )}
            </div>
          ))}
        </MapContainer>

        <div className="absolute top-6 right-6 bg-white rounded-xl shadow-lg border border-gray-200 p-3 z-1000 space-y-2">
          <button
            onClick={() => {
              setMapCenter([
                vessels[0]?.currentPosition.latitude,
                vessels[0]?.currentPosition.longitude,
              ]);
              setSelectedVessel(null);
            }}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
          >
            🎯 Reset View
          </button>
          <button
            onClick={() => vessels.forEach((v) => fetchVesselWeather(v._id))}
            className="w-full px-4 py-2 rounded-lg text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
          >
            🔄 Refresh Weather
          </button>
        </div>

        <div className="absolute bottom-6 left-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-1000 max-w-xs">
          <h4 className="font-bold text-gray-900 mb-3">Legend</h4>
          <div className="space-y-2 text-sm">
            {[
              {
                icon: (
                  <span className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
                ),
                text: "Active Vessel",
              },
              {
                icon: (
                  <span className="w-3 h-3 bg-gray-400 rounded-full"></span>
                ),
                text: "Docked",
              },
              {
                icon: (
                  <div
                    className="w-12 h-1 bg-blue-800"
                    style={{ borderStyle: "dashed" }}
                  ></div>
                ),
                text: "Track (click vessel)",
              },
              {
                icon: <span className="text-xl">🚢</span>,
                text: "Vessel (rotates)",
              },
              {
                icon: <span className="text-xl">🌤️</span>,
                text: "Live Weather",
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                {item.icon}
                <span className="text-gray-700">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {selectedVessel && (
          <div className="absolute top-6 left-6 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-1000 max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-bold text-gray-900">{selectedVessel.name}</h4>
              <button
                onClick={() => setSelectedVessel(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="text-sm space-y-1">
              <p className="text-gray-600">
                Position:{" "}
                <span className="font-mono text-xs">
                  {selectedVessel.currentPosition.latitude.toFixed(4)}°N,{" "}
                  {selectedVessel.currentPosition.longitude.toFixed(4)}°E
                </span>
              </p>
              <p className="text-gray-600">
                Speed:{" "}
                <span className="font-semibold">
                  {selectedVessel.speed} knots
                </span>
              </p>
              <p className="text-gray-600">
                Heading:{" "}
                <span className="font-semibold">{selectedVessel.heading}°</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VesselMap;
