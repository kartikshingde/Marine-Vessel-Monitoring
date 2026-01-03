import { useContext, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { AuthContext } from "../context/AuthContext";
import api from "../utils/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MySensorWidget from "./MySensorWidget";
import Toast from "./Toast";
import io from "socket.io-client";

// ✅ React-Lucide Icons
import {
  Ship,
  MapPin,
  Cloud,
  RefreshCw,
  FileText,
  X,
  Navigation,
  Gauge,
  Activity,
  Droplets,
  Wind,
  Eye,
  Sunrise as SunriseIcon,
  Sunset as SunsetIcon,
  Thermometer,
  Waves,
} from "lucide-react";

// Fix Leaflet default icon issue
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// Map Click Handler Component
function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition({
        latitude: e.latlng.lat,
        longitude: e.latlng.lng,
      });
    },
  });

  return position.latitude && position.longitude ? (
    <Marker position={[position.latitude, position.longitude]} />
  ) : null;
}

const CaptainDashboard = () => {
  const { user } = useContext(AuthContext);

  const [vessel, setVessel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  // Last noon report for distance calculation
  const [lastNoonReport, setLastNoonReport] = useState(null);

  // Noon Report Modal
  const [showNoonModal, setShowNoonModal] = useState(false);
  const [noonFormData, setNoonFormData] = useState({
    position: { latitude: "", longitude: "" },
    averageSpeed: "",
    distanceSinceLastNoon: "",
    courseOverGround: "",
    fuelRob: "",
    fuelConsumedSinceLastNoon: "",
    mainEngineRpm: "",
    mainEnginePower: "",
    weather: {
      windSpeed: "",
      windDirection: "",
      seaState: "",
      swell: "",
      visibility: "",
      remarks: "",
    },
    voyageNo: "",
    nextPort: "",
    eta: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [noonError, setNoonError] = useState("");

  // Report History
  const [reports, setReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Socket.IO State
  const [socket, setSocket] = useState(null);

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  // ✅ Load vessel data
  useEffect(() => {
    const loadVessel = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/vessels");
        console.log("📦 Captain vessels:", data);

        if (data.data && data.data.length > 0) {
          const myVessel = data.data[0];
          setVessel(myVessel);

          // Pre-fill noon report position with current position
          if (myVessel.currentPosition) {
            setNoonFormData((prev) => ({
              ...prev,
              position: {
                latitude: myVessel.currentPosition.latitude,
                longitude: myVessel.currentPosition.longitude,
              },
              averageSpeed: myVessel.speed?.toString() || "",
            }));
          }
        }
        setLoading(false);
      } catch (error) {
        console.error("Failed to load vessel:", error);
        setLoading(false);
      }
    };

    loadVessel();
  }, []);

  // ✅ Load last noon report for distance calculation
  useEffect(() => {
    const loadLastReport = async () => {
      if (!vessel?._id) return;

      try {
        const { data } = await api.get(
          `/vessels/${vessel._id}/noon-reports/latest`
        );
        setLastNoonReport(data.data);
        console.log("📋 Last noon report loaded:", data.data);
      } catch (error) {
        console.error("Failed to load last report:", error);
      }
    };

    if (vessel) {
      loadLastReport();
    }
  }, [vessel]);

  // ✅ SINGLE SOCKET.IO CONNECTION
  useEffect(() => {
    const newSocket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
      {
        auth: { token: localStorage.getItem("token") },
      }
    );

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("🔌 Captain Socket.IO connected");
    });

    newSocket.on("disconnect", () => {
      console.log("🔌 Captain Socket.IO disconnected");
    });

    // ✅ Listen for position updates (for weather widget updates)
    newSocket.on("vessel-position-update", (data) => {
      console.log("📍 Position update received:", data);

      // Only update if it's for our vessel
      if (vessel && data.vesselId === vessel._id) {
        setVessel((prev) => ({
          ...prev,
          currentPosition: data.position,
          speed: data.speed,
          heading: data.heading,
        }));
      }
    });

    return () => {
      newSocket.disconnect();
    };
  }, [vessel?._id]);

  // Fetch weather
  const fetchWeather = async () => {
    if (!vessel?._id) return;

    try {
      setWeatherLoading(true);
      const { data } = await api.get(`/vessels/${vessel._id}/weather`);
      setWeather(data.data);
      setWeatherLoading(false);
    } catch (error) {
      console.error("Weather fetch error:", error);
      setWeatherLoading(false);
    }
  };

  useEffect(() => {
    if (vessel) {
      fetchWeather();
      const interval = setInterval(fetchWeather, 30 * 60 * 1000); // Every 30 mins
      return () => clearInterval(interval);
    }
  }, [vessel]);

  // Load noon reports
  const loadReports = async () => {
    if (!vessel?._id) return;

    try {
      setReportsLoading(true);
      const { data } = await api.get(`/vessels/${vessel._id}/noon-reports`);
      setReports(data.data || []);
      setReportsLoading(false);
    } catch (error) {
      console.error("Failed to load reports:", error);
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (vessel) {
      loadReports();
    }
  }, [vessel]);

  // ✅ Auto-fill weather from API
  const handleAutoFillWeather = async () => {
    if (!vessel?._id) return;

    try {
      showToast("info", "⛅ Fetching current weather...");
      const { data } = await api.get(`/vessels/${vessel._id}/weather`);

      setNoonFormData((prev) => ({
        ...prev,
        weather: {
          windSpeed: `${data.data.windSpeed} km/h`,
          windDirection: `${data.data.windDirection}°`,
          seaState: data.data.waveHeight
            ? `${data.data.waveHeight}m waves`
            : "",
          swell: data.data.condition || "",
          visibility: `${data.data.visibility} km`,
          remarks: `${data.data.description}, Temp: ${data.data.temperature}°C`,
        },
      }));

      showToast("success", "✅ Weather data filled!");
    } catch (error) {
      console.error("Failed to fetch weather:", error);
      showToast("error", "❌ Failed to fetch weather data");
    }
  };

  // ✅ Calculate distance automatically
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
    return R * c;
  };

  // Noon report form handlers
  const handleNoonFormChange = (e) => {
    const { name, value } = e.target;
    setNoonError("");

    if (name.startsWith("weather.")) {
      const weatherField = name.split(".")[1];
      setNoonFormData((prev) => ({
        ...prev,
        weather: {
          ...prev.weather,
          [weatherField]: value,
        },
      }));
    } else {
      setNoonFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleNoonSubmit = async (e) => {
    e.preventDefault();

    if (!noonFormData.position.latitude || !noonFormData.position.longitude) {
      setNoonError("Please click on the map to set your position");
      return;
    }

    // ✅ VALIDATION: Fuel consumed cannot exceed ROB
    if (noonFormData.fuelConsumedSinceLastNoon && noonFormData.fuelRob) {
      const consumed = parseFloat(noonFormData.fuelConsumedSinceLastNoon);
      const rob = parseFloat(noonFormData.fuelRob);

      if (consumed > rob) {
        setNoonError("⚠️ Fuel consumed cannot exceed Remaining on Board (ROB)");
        return;
      }
    }

    try {
      setSubmitting(true);
      setNoonError("");

      // ✅ AUTO-CALCULATE DISTANCE if not provided
      let distance =
        parseFloat(noonFormData.distanceSinceLastNoon) || undefined;

      if (!distance && lastNoonReport?.position) {
        distance = calculateDistance(
          lastNoonReport.position.latitude,
          lastNoonReport.position.longitude,
          parseFloat(noonFormData.position.latitude),
          parseFloat(noonFormData.position.longitude)
        );
        console.log(`📏 Auto-calculated distance: ${distance.toFixed(2)} nm`);
      }

      const payload = {
        position: {
          latitude: parseFloat(noonFormData.position.latitude),
          longitude: parseFloat(noonFormData.position.longitude),
        },
        averageSpeed: parseFloat(noonFormData.averageSpeed) || undefined,
        distanceSinceLastNoon: distance,
        courseOverGround:
          parseFloat(noonFormData.courseOverGround) || undefined,
        fuelRob: parseFloat(noonFormData.fuelRob) || undefined,
        fuelConsumedSinceLastNoon:
          parseFloat(noonFormData.fuelConsumedSinceLastNoon) || undefined,
        mainEngineRpm: parseFloat(noonFormData.mainEngineRpm) || undefined,
        mainEnginePower: parseFloat(noonFormData.mainEnginePower) || undefined,
        weather: noonFormData.weather,
        voyageNo: noonFormData.voyageNo || undefined,
        nextPort: noonFormData.nextPort || undefined,
        eta: noonFormData.eta ? new Date(noonFormData.eta) : undefined,
      };

      await api.post(`/vessels/${vessel._id}/noon-report`, payload);

      showToast("success", "✅ Noon report submitted successfully!");
      setShowNoonModal(false);
      setSubmitting(false);
      loadReports(); // Reload reports

      // Reload vessel to get updated position
      const { data } = await api.get("/vessels");
      if (data.data && data.data.length > 0) {
        setVessel(data.data[0]);
      }

      // Reload last report
      const lastReportRes = await api.get(
        `/vessels/${vessel._id}/noon-reports/latest`
      );
      setLastNoonReport(lastReportRes.data.data);
    } catch (error) {
      console.error("Submit noon report error:", error);
      setNoonError(
        error.response?.data?.message || "Failed to submit noon report"
      );
      setSubmitting(false);
      showToast(
        "error",
        error.response?.data?.message || "❌ Failed to submit noon report"
      );
    }
  };

  const formatDateTime = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCoords = () => {
    if (!vessel?.currentPosition) return "N/A";
    const { latitude, longitude } = vessel.currentPosition;
    return `${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-lg">Loading your vessel...</p>
        </div>
      </div>
    );
  }

  if (!vessel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <Ship className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            No Vessel Assigned
          </h2>
          <p className="text-gray-600">
            Ask your manager to assign a vessel to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            ⚓ Captain Dashboard
          </h1>
          <p className="mt-2 text-gray-600">
            Manage your vessel and submit noon reports.
          </p>
        </div>

        {/* Vessel Card */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Ship className="w-12 h-12 text-blue-600" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {vessel.name}
                </h2>
                <p className="text-gray-600">Your Assigned Vessel</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">MMSI: {vessel.mmsi}</p>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">
                    {vessel.speed || 0} knots
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                    vessel.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {vessel.status}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <MapPin className="w-5 h-5 text-blue-600 mb-2" />
              <p className="text-sm text-gray-600">Current Position</p>
              <p className="font-semibold text-gray-900">{formatCoords()}</p>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-gray-600">Latitude</p>
                  <p className="font-semibold text-gray-900">
                    {vessel.currentPosition?.latitude.toFixed(6)}°
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Longitude</p>
                  <p className="font-semibold text-gray-900">
                    {vessel.currentPosition?.longitude.toFixed(6)}°
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4">
              <Navigation className="w-5 h-5 text-blue-600 mb-2" />
              <p className="text-sm text-gray-600">Last Updated</p>
              <p className="font-semibold text-gray-900">
                {formatDateTime(vessel.currentPosition?.timestamp)}
              </p>
            </div>
          </div>
        </div>

        {/* ✅ SENSOR WIDGET - WITH SOCKET */}
        {vessel && (
          <div className="mb-6">
            <MySensorWidget vesselId={vessel._id} socket={socket} />
          </div>
        )}

        {/* Weather Widget */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Cloud className="w-6 h-6 text-blue-600" />
              Weather Conditions
            </h3>
            <button
              onClick={fetchWeather}
              disabled={weatherLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${weatherLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {weatherLoading ? (
            <p className="text-gray-600">Loading weather...</p>
          ) : weather ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <Thermometer className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Temperature</p>
                <p className="text-xl font-bold text-gray-900">
                  {weather.temperature}°C
                </p>
                <p className="text-xs text-gray-500">
                  Feels like {weather.feelsLike}°C
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <Cloud className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Condition</p>
                <p className="font-semibold text-gray-900">
                  {weather.condition}
                </p>
                <p className="text-xs text-gray-500">{weather.description}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <Wind className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Wind Speed</p>
                <p className="text-xl font-bold text-gray-900">
                  {weather.windSpeed} km/h
                </p>
                <p className="text-xs text-gray-500">
                  Direction: {weather.windDirection}°
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <Droplets className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Humidity</p>
                <p className="text-xl font-bold text-gray-900">
                  {weather.humidity}%
                </p>
                <p className="text-xs text-gray-500">
                  Pressure: {weather.pressure} hPa
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <Waves className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Wave Height</p>
                <p className="text-xl font-bold text-gray-900">
                  {weather.waveHeight} m
                </p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <SunriseIcon className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Sunrise</p>
                <p className="font-semibold text-gray-900">{weather.sunrise}</p>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <SunsetIcon className="w-5 h-5 text-blue-600 mb-2" />
                <p className="text-sm text-gray-600">Sunset</p>
                <p className="font-semibold text-gray-900">{weather.sunset}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-600">No weather data available</p>
          )}
        </div>

        {/* Noon Report Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowNoonModal(true)}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white px-6 py-4 rounded-lg hover:bg-blue-700 transition font-semibold text-lg shadow-lg"
          >
            <FileText className="w-6 h-6" />
            Submit Noon Report
          </button>
        </div>

        {/* Noon Report Modal */}
        {showNoonModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">
                  Submit Noon Report
                </h2>
                <button
                  onClick={() => setShowNoonModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleNoonSubmit} className="p-6">
                {noonError && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
                    {noonError}
                  </div>
                )}

                {/* Map to set position */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Click on map to set your current position *
                  </label>
                  <div className="h-96 rounded-lg overflow-hidden border-2 border-gray-300">
                    <MapContainer
                      center={[
                        noonFormData.position.latitude ||
                          vessel.currentPosition.latitude,
                        noonFormData.position.longitude ||
                          vessel.currentPosition.longitude,
                      ]}
                      zoom={8}
                      style={{ height: "100%", width: "100%" }}
                    >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <LocationMarker
                        position={noonFormData.position}
                        setPosition={(pos) =>
                          setNoonFormData((prev) => ({
                            ...prev,
                            position: pos,
                          }))
                        }
                      />
                    </MapContainer>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">
                    Selected: {noonFormData.position.latitude.toFixed(6)},{" "}
                    {noonFormData.position.longitude.toFixed(6)}
                  </p>
                </div>

                {/* Navigation Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Average Speed (knots)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="averageSpeed"
                      value={noonFormData.averageSpeed}
                      onChange={handleNoonFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Distance Since Last Noon (nm)
                      {lastNoonReport && (
                        <span className="text-xs text-blue-600 ml-2">
                          (Auto-calculated if left empty)
                        </span>
                      )}
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="distanceSinceLastNoon"
                      value={noonFormData.distanceSinceLastNoon}
                      onChange={handleNoonFormChange}
                      placeholder="Leave empty for auto-calculation"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuel ROB (tons)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="fuelRob"
                      value={noonFormData.fuelRob}
                      onChange={handleNoonFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fuel Consumed (tons)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      name="fuelConsumedSinceLastNoon"
                      value={noonFormData.fuelConsumedSinceLastNoon}
                      onChange={handleNoonFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Next Port
                    </label>
                    <input
                      type="text"
                      name="nextPort"
                      value={noonFormData.nextPort}
                      onChange={handleNoonFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ETA
                    </label>
                    <input
                      type="datetime-local"
                      name="eta"
                      value={noonFormData.eta}
                      onChange={handleNoonFormChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Weather Section */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Weather Conditions
                    </label>
                    <button
                      type="button"
                      onClick={handleAutoFillWeather}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
                    >
                      <Cloud className="w-4 h-4" />
                      Auto-fill Weather
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Wind Speed
                      </label>
                      <input
                        type="text"
                        name="weather.windSpeed"
                        value={noonFormData.weather.windSpeed}
                        onChange={handleNoonFormChange}
                        placeholder="e.g., 15 knots"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Wind Direction
                      </label>
                      <input
                        type="text"
                        name="weather.windDirection"
                        value={noonFormData.weather.windDirection}
                        onChange={handleNoonFormChange}
                        placeholder="e.g., NW or 315°"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Sea State
                      </label>
                      <input
                        type="text"
                        name="weather.seaState"
                        value={noonFormData.weather.seaState}
                        onChange={handleNoonFormChange}
                        placeholder="e.g., Moderate"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Swell
                      </label>
                      <input
                        type="text"
                        name="weather.swell"
                        value={noonFormData.weather.swell}
                        onChange={handleNoonFormChange}
                        placeholder="e.g., 2m from SW"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Visibility
                      </label>
                      <input
                        type="text"
                        name="weather.visibility"
                        value={noonFormData.weather.visibility}
                        onChange={handleNoonFormChange}
                        placeholder="e.g., 10 nm"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm text-gray-600 mb-1">
                        Remarks
                      </label>
                      <textarea
                        name="weather.remarks"
                        value={noonFormData.weather.remarks}
                        onChange={handleNoonFormChange}
                        rows="2"
                        placeholder="Additional weather observations..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex gap-4">
                  <button
                    type="button"
                    onClick={() => setShowNoonModal(false)}
                    className="flex-1 px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Report History */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            My Noon Report History
          </h3>
          {reportsLoading ? (
            <p className="text-gray-600">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-gray-600">No reports submitted yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Date & Time
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Distance (nm)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fuel Used (t)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ROB (t)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Speed (kn)
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Position
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reports.map((report) => (
                    <tr key={report._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDateTime(report.reportedAt)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.distanceSinceLastNoon?.toFixed(1) ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.fuelConsumedSinceLastNoon ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.fuelRob ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.averageSpeed ?? "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {report.position?.latitude?.toFixed(2)}°,{" "}
                        {report.position?.longitude?.toFixed(2)}°
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ✅ TOAST NOTIFICATIONS */}
      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default CaptainDashboard;
