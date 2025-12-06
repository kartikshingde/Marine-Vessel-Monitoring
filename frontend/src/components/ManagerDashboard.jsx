import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";

const ManagerDashboard = () => {
  const { user } = useContext(AuthContext);

  const stats = [
    {
      label: "Total Vessels",
      value: "24",
      icon: "🚢",
      color: "from-blue-500 to-blue-600",
      change: "+2 this month",
    },
    {
      label: "Active Reports",
      value: "156",
      icon: "📊",
      color: "from-green-500 to-green-600",
      change: "+12 today",
    },
    {
      label: "Alerts",
      value: "3",
      icon: "⚠️",
      color: "from-red-500 to-red-600",
      change: "Requires attention",
    },
    {
      label: "Total Captains",
      value: "18",
      icon: "⚓",
      color: "from-purple-500 to-purple-600",
      change: "All active",
    },
  ];

  const recentVessels = [
    {
      id: 1,
      name: "SS Discovery",
      status: "Active",
      location: "Pacific Ocean",
      lastUpdate: "5 mins ago",
      speed: "18 knots",
    },
    {
      id: 2,
      name: "MV Explorer",
      status: "Active",
      location: "Atlantic Ocean",
      lastUpdate: "12 mins ago",
      speed: "22 knots",
    },
    {
      id: 3,
      name: "HMS Navigator",
      status: "Docked",
      location: "Port of Singapore",
      lastUpdate: "1 hour ago",
      speed: "0 knots",
    },
    {
      id: 4,
      name: "SS Voyager",
      status: "Active",
      location: "Indian Ocean",
      lastUpdate: "8 mins ago",
      speed: "20 knots",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h2>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your fleet today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div
                  className={`w-12 h-12 bg-linear-to-br ${stat.color} rounded-xl flex items-center justify-center text-2xl shadow-lg`}
                >
                  {stat.icon}
                </div>
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">
                {stat.value}
              </h3>
              <p className="text-sm font-medium text-gray-600 mb-2">
                {stat.label}
              </p>
              <p className="text-xs text-gray-500">{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Recent Vessels Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-cyan-50">
            <h3 className="text-lg font-bold text-gray-900">
              Recent Vessel Activity
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Monitor all vessels in real-time
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vessel Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Speed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Update
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentVessels.map((vessel) => (
                  <tr
                    key={vessel.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-semibold shadow">
                          {vessel.name.charAt(0)}
                        </div>
                        <span className="font-medium text-gray-900">
                          {vessel.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          vessel.status === "Active"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : "bg-gray-50 text-gray-700 border border-gray-200"
                        }`}
                      >
                        <span
                          className={`w-2 h-2 rounded-full ${
                            vessel.status === "Active"
                              ? "bg-green-500 animate-pulse"
                              : "bg-gray-400"
                          }`}
                        ></span>
                        {vessel.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {vessel.location}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {vessel.speed}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {vessel.lastUpdate}
                    </td>
                    <td className="px-6 py-4">
                      <button className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline">
                        View Details →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link to={"/map"}>
            <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <div className="text-3xl mb-3">🗺️</div>
              <h4 className="text-lg font-bold mb-2">View Map</h4>
              <p className="text-blue-100 text-sm">
                Track all vessels on interactive map
              </p>
            </div>
          </Link>

          <div className="bg-linear-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">📈</div>
            <h4 className="text-lg font-bold mb-2">Analytics</h4>
            <p className="text-green-100 text-sm">
              View performance reports and insights
            </p>
          </div>

          <div className="bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
            <div className="text-3xl mb-3">⚙️</div>
            <h4 className="text-lg font-bold mb-2">Settings</h4>
            <p className="text-purple-100 text-sm">
              Manage fleet and user settings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
