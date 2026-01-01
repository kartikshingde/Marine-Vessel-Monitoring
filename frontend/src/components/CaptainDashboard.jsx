import { useContext, useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { AuthContext } from "../context/AuthContext";
import api from "../utils/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import MySensorWidget from "./MySensorWidget";
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
  const [loadingVessel, setLoadingVessel] = useState(true);
  const [loadingReports, setLoadingReports] = useState(true);
  const [recentReports, setRecentReports] = useState([]);

  // Weather state
  const [weather, setWeather] = useState(null);
  const [loadingWeather, setLoadingWeather] = useState(false);

  const [showReportForm, setShowReportForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");

  const [formData, setFormData] = useState({
    latitude: "",
    longitude: "",
    averageSpeed: "",
    distanceSinceLastNoon: "",
    fuelConsumedSinceLastNoon: "",
    fuelRob: "",
    weatherSummary: "",
    remarks: "",
  });

  const [useMapForPosition, setUseMapForPosition] = useState(false);

  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(
      import.meta.env.VITE_SOCKET_URL || "http://localhost:5000",
      {
        auth: { token: localStorage.getItem("token") },
      }
    );

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("🔌 Socket.IO connected");
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Load captain's vessel
  useEffect(() => {
    const fetchVessel = async () => {
      try {
        setLoadingVessel(true);
        const { data } = await api.get("/vessels");
        const vessels = data.data || [];
        const myVessel = vessels[0] || null;
        setVessel(myVessel);
        setLoadingVessel(false);

        if (myVessel?._id) {
          fetchWeather(myVessel._id);
        }
      } catch (err) {
        console.error("Error fetching captain vessel:", err);
        setLoadingVessel(false);
      }
    };

    fetchVessel();
  }, []);

  // Load recent noon reports
  useEffect(() => {
    const fetchReports = async () => {
      if (!vessel?._id) return;
      try {
        setLoadingReports(true);
        const { data } = await api.get(`/vessels/${vessel._id}/noon-reports`);
        setRecentReports(data.data || []);
        setLoadingReports(false);
      } catch (err) {
        console.error("Error fetching noon reports:", err);
        setLoadingReports(false);
      }
    };

    fetchReports();
  }, [vessel]);

  // Fetch weather
  const fetchWeather = async (vesselId) => {
    try {
      setLoadingWeather(true);
      const { data } = await api.get(`/vessels/${vesselId}/weather`);
      setWeather(data.data);
      setLoadingWeather(false);
    } catch (err) {
      console.error("Error fetching weather:", err);
      setLoadingWeather(false);
    }
  };

  useEffect(() => {
    if (showReportForm && vessel?.currentPosition) {
      setFormData((prev) => ({
        ...prev,
        latitude: vessel.currentPosition.latitude.toFixed(6),
        longitude: vessel.currentPosition.longitude.toFixed(6),
      }));
    }
  }, [showReportForm, vessel]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormError("");
    setFormSuccess("");
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleMapPositionChange = (newPosition) => {
    setFormData((prev) => ({
      ...prev,
      latitude: newPosition.latitude.toFixed(6),
      longitude: newPosition.longitude.toFixed(6),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!vessel?._id) {
      setFormError("No vessel found for this captain.");
      return;
    }

    if (!formData.latitude || !formData.longitude) {
      setFormError("Position (latitude & longitude) is required.");
      return;
    }

    try {
      setSubmitting(true);
      setFormError("");
      setFormSuccess("");

      const payload = {
        position: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
        },
        averageSpeed: formData.averageSpeed
          ? Number(formData.averageSpeed)
          : undefined,
        distanceSinceLastNoon: formData.distanceSinceLastNoon
          ? Number(formData.distanceSinceLastNoon)
          : undefined,
        fuelConsumedSinceLastNoon: formData.fuelConsumedSinceLastNoon
          ? Number(formData.fuelConsumedSinceLastNoon)
          : undefined,
        fuelRob: formData.fuelRob ? Number(formData.fuelRob) : undefined,
        weather: {
          remarks: formData.weatherSummary || "",
        },
        remarks: formData.remarks || "",
      };

      const { data } = await api.post(
        `/vessels/${vessel._id}/noon-report`,
        payload
      );

      await api.put(`/vessels/${vessel._id}/position`, {
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        speed: formData.averageSpeed
          ? Number(formData.averageSpeed)
          : vessel.speed,
      });

      setFormSuccess("Noon report submitted & vessel position updated!");

      setFormData({
        latitude: "",
        longitude: "",
        averageSpeed: "",
        distanceSinceLastNoon: "",
        fuelConsumedSinceLastNoon: "",
        fuelRob: "",
        weatherSummary: "",
        remarks: "",
      });

      setRecentReports((prev) => [data.data, ...prev]);

      setVessel((prev) => ({
        ...prev,
        currentPosition: {
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          timestamp: new Date(),
        },
        speed: formData.averageSpeed
          ? Number(formData.averageSpeed)
          : prev.speed,
      }));

      setSubmitting(false);

      setTimeout(() => {
        setShowReportForm(false);
        setFormSuccess("");
      }, 2000);
    } catch (err) {
      console.error("Submit noon report error:", err);
      setFormError(
        err.response?.data?.message || "Failed to submit noon report."
      );
      setSubmitting(false);
    }
  };

  const formatCoords = () => {
    if (!vessel?.currentPosition) return "N/A";
    return `${vessel.currentPosition.latitude.toFixed(
      4
    )}°, ${vessel.currentPosition.longitude.toFixed(4)}°`;
  };

  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "-";

  if (loadingVessel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading your vessel...</p>
        </div>
      </div>
    );
  }

  if (!vessel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-12 text-center max-w-md border border-gray-200">
          <div className="w-20 h-20 bg-linear-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <Ship className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            No Vessel Assigned
          </h2>
          <p className="text-gray-600 mb-6">
            Ask your manager to assign a vessel to your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="w-full px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Ship className="w-8 h-8 text-blue-600" />
            Welcome, Captain {user?.name}!
          </h2>
          <p className="text-gray-600 mt-2">
            Manage your vessel and submit noon reports.
          </p>
        </div>

        {/* Vessel Info Card */}
        <div className="bg-linear-to-br from-blue-500 to-cyan-500 rounded-3xl shadow-xl p-8 text-white mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-blue-100 text-sm mb-2">Your Assigned Vessel</p>
              <h3 className="text-3xl font-bold mb-2">{vessel.name}</h3>
              <p className="text-blue-100">
                MMSI: <span className="font-semibold">{vessel.mmsi}</span>
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Ship className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-blue-100 text-sm mb-1 flex items-center gap-2">
                <Gauge className="w-4 h-4" /> Current Speed
              </p>
              <p className="text-2xl font-bold">{vessel.speed || 0} knots</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-blue-100 text-sm mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Status
              </p>
              <p className="text-2xl font-bold capitalize">{vessel.status}</p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-blue-100 text-sm mb-1 flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Coordinates
              </p>
              <p className="text-lg font-semibold">{formatCoords()}</p>
            </div>
          </div>
        </div>

        {/* Sensor Widget */}
        {vessel && (
          <div className="mt-6">
            <MySensorWidget vesselId={vessel._id} socket={socket} />
          </div>
        )}

        {/* ✅ FIXED: Current Position Map - Reduced Height */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-emerald-50 to-teal-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-600" /> Current Position
            </h3>
          </div>
          <div className="p-6">
            <div className="h-64 rounded-xl overflow-hidden border-2 border-gray-200">
              <MapContainer
                center={[
                  vessel.currentPosition?.latitude || 19.076,
                  vessel.currentPosition?.longitude || 72.8777,
                ]}
                zoom={6}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <Marker
                  position={[
                    vessel.currentPosition?.latitude || 19.076,
                    vessel.currentPosition?.longitude || 72.8777,
                  ]}
                />
              </MapContainer>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Latitude</p>
                <p className="text-xl font-bold text-gray-900">
                  {vessel.currentPosition?.latitude.toFixed(6)}°
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Longitude</p>
                <p className="text-xl font-bold text-gray-900">
                  {vessel.currentPosition?.longitude.toFixed(6)}°
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-600 mb-1">Last Updated</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatDateTime(vessel.currentPosition?.timestamp)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Weather Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-sky-50 to-blue-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-600" /> Weather Conditions
              </h3>
              <button
                onClick={() => fetchWeather(vessel._id)}
                disabled={loadingWeather}
                className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${loadingWeather ? "animate-spin" : ""}`}
                />
                {loadingWeather ? "Loading..." : "Refresh"}
              </button>
            </div>
          </div>
          <div className="p-6">
            {loadingWeather ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
                <p className="text-gray-600">Loading weather...</p>
              </div>
            ) : weather ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-linear-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                  <div className="flex items-center gap-2 text-orange-700 mb-2">
                    <Thermometer className="w-4 h-4" />
                    <p className="text-sm font-medium">Temperature</p>
                  </div>
                  <p className="text-3xl font-bold text-orange-900">
                    {weather.temperature}°C
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    Feels like {weather.feelsLike}°C
                  </p>
                </div>
                <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center gap-2 text-blue-700 mb-2">
                    <Cloud className="w-4 h-4" />
                    <p className="text-sm font-medium">Condition</p>
                  </div>
                  <p className="text-xl font-bold text-blue-900 capitalize">
                    {weather.condition}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {weather.description}
                  </p>
                </div>
                <div className="bg-linear-to-br from-cyan-50 to-cyan-100 rounded-xl p-4 border border-cyan-200">
                  <div className="flex items-center gap-2 text-cyan-700 mb-2">
                    <Wind className="w-4 h-4" />
                    <p className="text-sm font-medium">Wind Speed</p>
                  </div>
                  <p className="text-3xl font-bold text-cyan-900">
                    {weather.windSpeed} km/h
                  </p>
                  <p className="text-xs text-cyan-600 mt-1">
                    Direction: {weather.windDirection}°
                  </p>
                </div>
                <div className="bg-linear-to-br from-teal-50 to-teal-100 rounded-xl p-4 border border-teal-200">
                  <div className="flex items-center gap-2 text-teal-700 mb-2">
                    <Droplets className="w-4 h-4" />
                    <p className="text-sm font-medium">Humidity</p>
                  </div>
                  <p className="text-3xl font-bold text-teal-900">
                    {weather.humidity}%
                  </p>
                  <p className="text-xs text-teal-600 mt-1 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> {weather.visibility} km
                  </p>
                </div>
                <div className="bg-linear-to-br from-indigo-50 to-indigo-100 rounded-xl p-4 border border-indigo-200">
                  <div className="flex items-center gap-2 text-indigo-700 mb-2">
                    <Gauge className="w-4 h-4" />
                    <p className="text-sm font-medium">Pressure</p>
                  </div>
                  <p className="text-2xl font-bold text-indigo-900">
                    {weather.pressure} hPa
                  </p>
                </div>
                <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                  <div className="flex items-center gap-2 text-purple-700 mb-2">
                    <Waves className="w-4 h-4" />
                    <p className="text-sm font-medium">Wave Height</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-900">
                    {weather.waveHeight} m
                  </p>
                </div>
                <div className="bg-linear-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                  <div className="flex items-center gap-2 text-pink-700 mb-2">
                    <SunriseIcon className="w-4 h-4" />
                    <p className="text-sm font-medium">Sunrise</p>
                  </div>
                  <p className="text-lg font-bold text-pink-900">
                    {weather.sunrise}
                  </p>
                </div>
                <div className="bg-linear-to-br from-rose-50 to-rose-100 rounded-xl p-4 border border-rose-200">
                  <div className="flex items-center gap-2 text-rose-700 mb-2">
                    <SunsetIcon className="w-4 h-4" />
                    <p className="text-sm font-medium">Sunset</p>
                  </div>
                  <p className="text-lg font-bold text-rose-900">
                    {weather.sunset}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Cloud className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>No weather data available</p>
                <button
                  onClick={() => fetchWeather(vessel._id)}
                  className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                >
                  Load Weather
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit Noon Report Button */}
        <button
          onClick={() => setShowReportForm(true)}
          className="w-full bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold py-6 px-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all mb-8 text-xl flex items-center justify-center gap-3"
        >
          <FileText className="w-6 h-6" />
          Submit Noon Report
        </button>

        {/* Recent Reports */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-cyan-50">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Your Recent Submissions
            </h3>
          </div>

          {loadingReports ? (
            <div className="p-8 text-center text-gray-500">
              Loading reports...
            </div>
          ) : recentReports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No noon reports yet. Submit your first one!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Distance (nm)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Fuel Used (t)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      ROB (t)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Speed (kn)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Position
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentReports.map((report) => (
                    <tr key={report._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDateTime(report.reportedAt)}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {report.distanceSinceLastNoon ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {report.fuelConsumedSinceLastNoon ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {report.fuelRob ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {report.averageSpeed ?? "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
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

      {/* ✅ FIXED: Noon Report Modal - NO OVERLAP */}
      {showReportForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 p-6 border-b border-gray-200 rounded-t-3xl">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-6 h-6 text-emerald-600" />
                  Submit Noon Report
                </h3>
                <button
                  onClick={() => {
                    setShowReportForm(false);
                    setFormSuccess("");
                    setFormError("");
                  }}
                  className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm">
                  {formSuccess}
                </div>
              )}

              {/* Position Input */}
              <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold text-gray-900 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    Vessel Position
                  </h4>
                  <button
                    type="button"
                    onClick={() => setUseMapForPosition(!useMapForPosition)}
                    className="flex items-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Navigation className="w-4 h-4" />
                    {useMapForPosition ? "Manual Input" : "Pick from Map"}
                  </button>
                </div>

                {useMapForPosition ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Click on the map to set position:
                    </p>
                    <div className="h-56 rounded-xl overflow-hidden border-2 border-blue-300">
                      <MapContainer
                        center={[
                          vessel.currentPosition?.latitude || 19.076,
                          vessel.currentPosition?.longitude || 72.8777,
                        ]}
                        zoom={5}
                        style={{ height: "100%", width: "100%" }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution="&copy; OpenStreetMap"
                        />
                        <LocationMarker
                          position={{
                            latitude: formData.latitude
                              ? parseFloat(formData.latitude)
                              : null,
                            longitude: formData.longitude
                              ? parseFloat(formData.longitude)
                              : null,
                          }}
                          setPosition={handleMapPositionChange}
                        />
                      </MapContainer>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Latitude
                        </label>
                        <input
                          type="text"
                          value={formData.latitude}
                          readOnly
                          className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-700"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Longitude
                        </label>
                        <input
                          type="text"
                          value={formData.longitude}
                          readOnly
                          className="w-full px-4 py-3 bg-gray-100 border border-gray-300 rounded-xl text-gray-700"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Latitude *
                      </label>
                      <input
                        type="number"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleChange}
                        required
                        step="0.000001"
                        min="-90"
                        max="90"
                        placeholder="e.g., 19.0760"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Longitude *
                      </label>
                      <input
                        type="number"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleChange}
                        required
                        step="0.000001"
                        min="-180"
                        max="180"
                        placeholder="e.g., 72.8777"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Other Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Average Speed (knots)
                  </label>
                  <input
                    type="number"
                    name="averageSpeed"
                    value={formData.averageSpeed}
                    onChange={handleChange}
                    step="0.1"
                    placeholder="e.g., 18.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Distance Since Last Noon (nm)
                  </label>
                  <input
                    type="number"
                    name="distanceSinceLastNoon"
                    value={formData.distanceSinceLastNoon}
                    onChange={handleChange}
                    step="0.1"
                    placeholder="e.g., 450"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel Consumed (tonnes)
                  </label>
                  <input
                    type="number"
                    name="fuelConsumedSinceLastNoon"
                    value={formData.fuelConsumedSinceLastNoon}
                    onChange={handleChange}
                    step="0.1"
                    placeholder="e.g., 24.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel ROB (tonnes)
                  </label>
                  <input
                    type="number"
                    name="fuelRob"
                    value={formData.fuelRob}
                    onChange={handleChange}
                    step="0.1"
                    placeholder="e.g., 320.5"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Weather Summary
                </label>
                <textarea
                  name="weatherSummary"
                  value={formData.weatherSummary}
                  onChange={handleChange}
                  rows="3"
                  placeholder="e.g., Clear skies, moderate swell..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  name="remarks"
                  value={formData.remarks}
                  onChange={handleChange}
                  rows="2"
                  placeholder="Additional notes..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowReportForm(false);
                    setFormSuccess("");
                    setFormError("");
                  }}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      Submit Noon Report
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CaptainDashboard;
