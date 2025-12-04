import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";

const CaptainDashboard = () => {
  const { user } = useContext(AuthContext);
  const [showReportForm, setShowReportForm] = useState(false);

  const vesselInfo = {
    name: "SS Discovery",
    status: "Active",
    currentSpeed: "18 knots",
    location: "Pacific Ocean",
    coordinates: "25.5°N, 165.3°W",
  };

  const sensorData = [
    {
      label: "Engine Temperature",
      value: "85°C",
      status: "normal",
      icon: "🌡️",
    },
    { label: "Fuel Level", value: "72%", status: "normal", icon: "⛽" },
    { label: "Speed", value: "18 knots", status: "normal", icon: "💨" },
    { label: "Engine RPM", value: "1450", status: "normal", icon: "⚙️" },
  ];

  const recentReports = [
    {
      id: 1,
      date: "Dec 4, 2025 - 12:00 PM",
      distance: "245 nm",
      fuel: "156 L",
      status: "Submitted",
    },
    {
      id: 2,
      date: "Dec 3, 2025 - 12:00 PM",
      distance: "238 nm",
      fuel: "152 L",
      status: "Submitted",
    },
    {
      id: 3,
      date: "Dec 2, 2025 - 12:00 PM",
      distance: "251 nm",
      fuel: "160 L",
      status: "Submitted",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome, Captain {user?.name}! ⚓
          </h2>
          <p className="text-gray-600 mt-2">
            Vessel ID:{" "}
            <span className="font-mono font-semibold">{user?.vesselId}</span>
          </p>
        </div>

        {/* Vessel Info Card */}
        <div className="bg-linear-to-br from-blue-600 to-cyan-500 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">{vesselInfo.name}</h3>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-blue-100 font-medium">
                  {vesselInfo.status}
                </span>
              </div>
            </div>
            <div className="w-16 h-16 bg-white/20 backdrop-blur-lg rounded-2xl flex items-center justify-center text-4xl">
              🚢
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-blue-100 text-sm mb-1">Current Speed</p>
              <p className="text-2xl font-bold">{vesselInfo.currentSpeed}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Location</p>
              <p className="text-2xl font-bold">{vesselInfo.location}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm mb-1">Coordinates</p>
              <p className="text-xl font-mono font-semibold">
                {vesselInfo.coordinates}
              </p>
            </div>
          </div>
        </div>

        {/* Sensor Data Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {sensorData.map((sensor, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-3xl">{sensor.icon}</div>
                <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                  Normal
                </span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {sensor.value}
              </h3>
              <p className="text-sm font-medium text-gray-600">
                {sensor.label}
              </p>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <button
            onClick={() => setShowReportForm(!showReportForm)}
            className="bg-linear-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl mb-3">📝</div>
                <h4 className="text-xl font-bold mb-2">Submit Noon Report</h4>
                <p className="text-blue-100 text-sm">
                  Report daily vessel status and operations
                </p>
              </div>
              <svg
                className="w-8 h-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>

          <button className="bg-white border-2 border-gray-200 hover:border-blue-500 rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all text-left group">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl mb-3">🗺️</div>
                <h4 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                  View Position
                </h4>
                <p className="text-gray-600 text-sm">
                  Check vessel location on map
                </p>
              </div>
              <svg
                className="w-8 h-8 text-gray-400 group-hover:text-blue-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>
        </div>

        {/* Simple Report Form */}
        {showReportForm && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Noon Report Form
              </h3>
              <button
                onClick={() => setShowReportForm(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
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

            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Speed (knots)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="18"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Distance Traveled (nm)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="245"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel Consumed (L)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="156"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Fuel Remaining (%)
                  </label>
                  <input
                    type="number"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    placeholder="72"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Weather Summary
                </label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Clear skies, light winds from NE, sea state calm..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Remarks (Optional)
                </label>
                <textarea
                  rows="2"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                  placeholder="Any additional notes..."
                ></textarea>
              </div>

              <button
                type="submit"
                className="w-full bg-linear-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white font-semibold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
              >
                Submit Noon Report
              </button>
            </form>
          </div>
        )}

        {/* Recent Reports */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-cyan-50">
            <h3 className="text-lg font-bold text-gray-900">
              Recent Noon Reports
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Your submission history
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Distance
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Fuel Consumed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentReports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {report.date}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {report.distance}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {report.fuel}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium border border-green-200">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        {report.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline">
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptainDashboard;
