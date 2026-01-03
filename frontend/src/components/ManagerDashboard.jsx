import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import api from "../utils/api";
import SensorGrid from './SensorGrid';
import RecentNoonReports from './RecentNoonReports';
import Toast from './Toast';
import io from 'socket.io-client';
import { Ship, Anchor, BarChart3, Map, Plus, UserPlus, X, AlertTriangle } from "lucide-react";

const ManagerDashboard = () => {
  const { user } = useContext(AuthContext);

  // Real data states
  const [vessels, setVessels] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [noonReportCount, setNoonReportCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const vesselsPerPage = 10;

  // Assign modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState({ vesselId: "", captainId: "" });
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");

  // Create Vessel Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createData, setCreateData] = useState({
    name: "", mmsi: "", type: "cargo", latitude: "", longitude: "",
    speed: "0", heading: "0",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Socket.IO state
  const [socket, setSocket] = useState(null);

  // Toast notification state
  const [toast, setToast] = useState(null);

  const showToast = (type, message) => {
    setToast({ type, message });
  };

  // ✅ SINGLE SOCKET.IO CONNECTION
  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000', {
      auth: { token: localStorage.getItem('token') }
    });

    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('🔌 Manager Socket.IO connected');
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 Manager Socket.IO disconnected');
    });

    // Listen for new noon reports
    newSocket.on('new-noon-report', (data) => {
      console.log('📨 New noon report notification:', data);
      showToast('success', `📋 New noon report from ${data.report.vesselId?.name}`);
      
      // Update report count
      setNoonReportCount(prev => prev + 1);
    });

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Load all data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const vesselsRes = await api.get("/vessels");
        console.log("📦 Vessels loaded:", vesselsRes.data.data);
        setVessels(vesselsRes.data.data || []);

        const captainsRes = await api.get("/users?role=captain");
        console.log("👨‍✈️ Captains loaded:", captainsRes.data.data);
        setCaptains(captainsRes.data.data || []);

        try {
          const reportsRes = await api.get("/vessels/noon-reports-count");
          setNoonReportCount(reportsRes.data.count || 0);
        } catch (err) {
          console.error("Noon report count unavailable:", err);
          setNoonReportCount(0);
        }

        setLoading(false);
      } catch (error) {
        console.error("Dashboard load error:", error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate unassigned count properly
  const unassignedCount = vessels.filter(v => {
    if (!v.captainId) return true;
    if (typeof v.captainId === 'object' && !v.captainId._id) return true;
    return false;
  }).length;

  const handleAssignChange = (e) => {
    const { name, value } = e.target;
    setAssignError("");
    setAssignData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignData.vesselId || !assignData.captainId) {
      setAssignError("Please select both vessel and captain");
      return;
    }

    try {
      setAssigning(true);
      setAssignError("");
      await api.put(`/vessels/${assignData.vesselId}`, {
        captainId: assignData.captainId
      });

      const assignedCaptain = captains.find(c => c._id === assignData.captainId);
      setVessels(prev => prev.map(v =>
        v._id === assignData.vesselId
          ? { ...v, captainId: assignedCaptain || assignData.captainId }
          : v
      ));

      setAssignData({ vesselId: "", captainId: "" });
      setShowAssignModal(false);
      setAssigning(false);
      showToast('success', 'Captain assigned successfully!');
    } catch (error) {
      console.error("Assign error:", error);
      setAssignError(error.response?.data?.message || "Failed to assign captain");
      setAssigning(false);
    }
  };

  const handleCreateChange = (e) => {
    const { name, value } = e.target;
    setCreateError("");
    setCreateData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createData.name || !createData.mmsi) {
      setCreateError("Vessel name and MMSI are required");
      return;
    }
    if (!createData.latitude || !createData.longitude) {
      setCreateError("Position (latitude and longitude) is required");
      return;
    }

    try {
      setCreating(true);
      setCreateError("");

      const payload = {
        name: createData.name,
        mmsi: createData.mmsi,
        vesselType: createData.type,
        currentPosition: {
          latitude: parseFloat(createData.latitude),
          longitude: parseFloat(createData.longitude),
          timestamp: new Date(),
        },
        speed: parseFloat(createData.speed) || 0,
        heading: parseFloat(createData.heading) || 0,
        status: "active",
      };

      const { data } = await api.post("/vessels", payload);
      setVessels(prev => [data.data, ...prev]);
      setCreateData({
        name: "", mmsi: "", type: "cargo", latitude: "", longitude: "",
        speed: "0", heading: "0",
      });
      setShowCreateModal(false);
      setCreating(false);
      showToast('success', `Vessel ${createData.name} created successfully!`);
    } catch (error) {
      console.error("Create vessel error:", error);
      setCreateError(error.response?.data?.message || "Failed to create vessel");
      setCreating(false);
    }
  };

  const getCaptainName = (captainId) => {
    if (!captainId) return "Unassigned";
    if (typeof captainId === 'object' && captainId.name) {
      return captainId.name;
    }
    const captainIdString = captainId._id ? captainId._id.toString() : captainId.toString();
    const captain = captains.find(c => c._id.toString() === captainIdString);
    return captain ? captain.name : "Unassigned";
  };

  const getAssignedVessel = (captainId) => {
    return vessels.find(v => {
      if (!v.captainId) return false;
      if (typeof v.captainId === 'object' && v.captainId._id) {
        return v.captainId._id.toString() === captainId.toString();
      }
      return v.captainId.toString() === captainId.toString();
    });
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Never";
    const now = new Date();
    const diff = Math.floor((now - new Date(timestamp)) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const isNoonOverdue = (vessel) => {
    if (!vessel.lastNoonReportAt) return false;
    const hoursSince = (new Date() - new Date(vessel.lastNoonReportAt)) / (1000 * 60 * 60);
    return hoursSince > 26;
  };

  // Pagination
  const indexOfLastVessel = currentPage * vesselsPerPage;
  const indexOfFirstVessel = indexOfLastVessel - vesselsPerPage;
  const currentVessels = vessels.slice(indexOfFirstVessel, indexOfLastVessel);
  const totalPages = Math.ceil(vessels.length / vesselsPerPage);
  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Ship className="w-12 h-12 animate-bounce mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 text-lg">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">⚓ Manager Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Manage your fleet and assign captains to vessels.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vessels</p>
                <p className="text-3xl font-bold text-gray-900">{vessels.length}</p>
                <p className="text-xs text-gray-500 mt-1">Fleet size</p>
              </div>
              <Ship className="w-12 h-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Captains</p>
                <p className="text-3xl font-bold text-gray-900">{captains.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {captains.length > 0 ? "All active" : "No captains"}
                </p>
              </div>
              <Anchor className="w-12 h-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unassigned Vessels</p>
                <p className="text-3xl font-bold text-gray-900">{unassignedCount}</p>
                <p className="text-xs text-gray-500 mt-1">Ready to assign</p>
              </div>
              <AlertTriangle className={`w-12 h-12 ${unassignedCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Reports</p>
                <p className="text-3xl font-bold text-gray-900">{noonReportCount}</p>
                <p className="text-xs text-gray-500 mt-1">All noon submissions</p>
              </div>
              <BarChart3 className="w-12 h-12 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white p-6 rounded-lg shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-3 font-semibold text-lg"
          >
            <Plus className="w-6 h-6" />
            Create New Vessel
          </button>

          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-green-600 text-white p-6 rounded-lg shadow-lg hover:bg-green-700 transition flex items-center justify-center gap-3 font-semibold text-lg"
          >
            <UserPlus className="w-6 h-6" />
            Assign Captain
          </button>

          <Link
            to="/map"
            className="bg-purple-600 text-white p-6 rounded-lg shadow-lg hover:bg-purple-700 transition flex items-center justify-center gap-3 font-semibold text-lg"
          >
            <Map className="w-6 h-6" />
            View Fleet Map
          </Link>
        </div>

        {/* ✅ SENSOR GRID - WITH SOCKET */}
        <div className="mb-8">
          <SensorGrid vessels={vessels} socket={socket} />
        </div>

        {/* ✅ RECENT NOON REPORTS - WITH SOCKET */}
        <div className="mb-8">
          <RecentNoonReports socket={socket} />
        </div>

        {/* Vessel Management Section */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Fleet Management</h2>

          {/* Unassigned Vessels Warning */}
          {unassignedCount > 0 ? (
            <div className="mb-6 p-4 bg-yellow-50 border-l-4 border-yellow-500 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <div>
                  <h3 className="font-bold text-yellow-800">
                    {unassignedCount} vessel{unassignedCount > 1 ? 's' : ''} without captain
                  </h3>
                  <p className="text-sm text-yellow-700">
                    Assign captains to manage these vessels
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 rounded-lg">
              <p className="text-green-800 font-semibold">All vessels assigned! 🎉</p>
            </div>
          )}

          {/* Vessel Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vessel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Captain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Speed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Noon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentVessels.map((vessel) => {
                  const overdue = isNoonOverdue(vessel);
                  return (
                    <tr key={vessel._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 font-bold text-lg">
                              {vessel.name.charAt(0)}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{vessel.name}</div>
                            <div className="text-sm text-gray-500">MMSI: {vessel.mmsi}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            getCaptainName(vessel.captainId) === "Unassigned"
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {getCaptainName(vessel.captainId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            vessel.status === "active"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {vessel.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {vessel.speed || 0} knots
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {overdue ? (
                          <span className="text-red-600 font-semibold">
                            ⚠️ {formatTimeAgo(vessel.lastNoonReportAt)}
                          </span>
                        ) : (
                          <span className="text-gray-600">
                            {formatTimeAgo(vessel.lastNoonReportAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <Link
                          to={`/track/${vessel._id}`}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Track →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {indexOfFirstVessel + 1}-{Math.min(indexOfLastVessel, vessels.length)} of{" "}
                {vessels.length}
              </div>
              <div className="flex gap-2">
                {[...Array(totalPages)].map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => paginate(idx + 1)}
                    className={`px-4 py-2 rounded ${
                      currentPage === idx + 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Captain List */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Captain Directory</h2>
          {captains.length === 0 ? (
            <p className="text-gray-600">No captains registered</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {captains.map((captain) => {
                const assignedVessel = getAssignedVessel(captain._id);
                return (
                  <div
                    key={captain._id}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-bold">
                          {captain.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{captain.name}</p>
                        <p className="text-xs text-gray-500">{captain.email}</p>
                      </div>
                    </div>
                    <div className="mt-3">
                      {assignedVessel ? (
                        <p className="text-sm text-green-600 font-medium">
                          ⚓ {assignedVessel.name}
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">No vessel assigned</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Assign Captain Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Assign Captain</h2>
              <button onClick={() => setShowAssignModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAssignSubmit}>
              {assignError && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {assignError}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Vessel
                </label>
                <select
                  name="vesselId"
                  value={assignData.vesselId}
                  onChange={handleAssignChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a vessel...</option>
                  {vessels.map((vessel) => (
                    <option key={vessel._id} value={vessel._id}>
                      {vessel.name} (MMSI: {vessel.mmsi})
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Captain
                </label>
                <select
                  name="captainId"
                  value={assignData.captainId}
                  onChange={handleAssignChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Choose a captain...</option>
                  {captains.map((captain) => (
                    <option key={captain._id} value={captain._id}>
                      {captain.name} - {captain.email}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {assigning ? "Assigning..." : "Assign"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Vessel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 m-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Create New Vessel</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-gray-700">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              {createError && (
                <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vessel Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={createData.name}
                    onChange={handleCreateChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    MMSI *
                  </label>
                  <input
                    type="text"
                    name="mmsi"
                    value={createData.mmsi}
                    onChange={handleCreateChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vessel Type
                  </label>
                  <select
                    name="type"
                    value={createData.type}
                    onChange={handleCreateChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cargo">Cargo</option>
                    <option value="tanker">Tanker</option>
                    <option value="container">Container</option>
                    <option value="passenger">Passenger</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Speed (knots)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="speed"
                    value={createData.speed}
                    onChange={handleCreateChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    name="latitude"
                    value={createData.latitude}
                    onChange={handleCreateChange}
                    placeholder="e.g., 28.6139"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    name="longitude"
                    value={createData.longitude}
                    onChange={handleCreateChange}
                    placeholder="e.g., 77.2090"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create Vessel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default ManagerDashboard;
