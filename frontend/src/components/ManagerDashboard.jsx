import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { Link } from "react-router-dom";
import api from "../utils/api";
import { 
  Ship, 
  Anchor, 
  BarChart3, 
  Map, 
  Plus, 
  UserPlus, 
  X,
  AlertTriangle
} from "lucide-react";

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
    name: "",
    mmsi: "",
    type: "cargo",
    latitude: "",
    longitude: "",
    speed: "0",
    heading: "0",
  });
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

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

  // ✅ FIXED: Calculate unassigned count properly
  const unassignedCount = vessels.filter(v => {
    if (!v.captainId) return true;
    // Handle populated captain object
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

      // ✅ FIXED: Update local state with proper captain object
      const assignedCaptain = captains.find(c => c._id === assignData.captainId);
      
      setVessels(prev => 
        prev.map(v => 
          v._id === assignData.vesselId 
            ? { ...v, captainId: assignedCaptain || assignData.captainId }
            : v
        )
      );

      setAssignData({ vesselId: "", captainId: "" });
      setShowAssignModal(false);
      setAssigning(false);
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
        name: "",
        mmsi: "",
        type: "cargo",
        latitude: "",
        longitude: "",
        speed: "0",
        heading: "0",
      });

      setShowCreateModal(false);
      setCreating(false);
    } catch (error) {
      console.error("Create vessel error:", error);
      setCreateError(error.response?.data?.message || "Failed to create vessel");
      setCreating(false);
    }
  };

  // ✅ FIXED: Properly handle both ObjectId and populated captain objects
  const getCaptainName = (captainId) => {
    if (!captainId) return "Unassigned";
    
    console.log("🔍 Getting captain name for:", captainId);
    
    // Handle populated captain object
    if (typeof captainId === 'object' && captainId.name) {
      console.log("✅ Found populated captain:", captainId.name);
      return captainId.name;
    }
    
    // Handle ObjectId string - find captain by ID
    const captainIdString = captainId._id ? captainId._id.toString() : captainId.toString();
    const captain = captains.find(c => c._id.toString() === captainIdString);
    
    console.log("🔍 Looking for captain ID:", captainIdString);
    console.log("✅ Found captain:", captain?.name || "Not found");
    
    return captain ? captain.name : "Unassigned";
  };

  // ✅ FIXED: Get assigned vessel for captain
  const getAssignedVessel = (captainId) => {
    return vessels.find(v => {
      if (!v.captainId) return false;
      
      // Handle populated captain object
      if (typeof v.captainId === 'object' && v.captainId._id) {
        return v.captainId._id.toString() === captainId.toString();
      }
      
      // Handle ObjectId string
      return v.captainId.toString() === captainId.toString();
    });
  };

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return "Never";
    const now = new Date();
    const diff = Math.floor((now - new Date(timestamp)) / 60000);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return `${Math.floor(diff/1440)}d ago`;
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-6 lg:px-8 py-8 max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h2>
          <p className="text-gray-600 mt-2">
            Manage your fleet and assign captains to vessels.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Ship className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {vessels.length}
            </h3>
            <p className="text-sm font-medium text-gray-600 mb-2">Total Vessels</p>
            <p className="text-xs text-gray-500">Fleet size</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <Anchor className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {captains.length}
            </h3>
            <p className="text-sm font-medium text-gray-600 mb-2">Total Captains</p>
            <p className="text-xs text-gray-500">{captains.length > 0 ? "All active" : "No captains"}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <Ship className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {unassignedCount}
            </h3>
            <p className="text-sm font-medium text-gray-600 mb-2">Unassigned Vessels</p>
            <p className="text-xs text-gray-500">Ready to assign</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-linear-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <h3 className="text-3xl font-bold text-gray-900 mb-1">
              {noonReportCount}
            </h3>
            <p className="text-sm font-medium text-gray-600 mb-2">Total Reports</p>
            <p className="text-xs text-gray-500">All noon submissions</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link to="/map">
            <div className="bg-linear-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
              <Map className="w-10 h-10 mb-3" />
              <h4 className="text-lg font-bold mb-2">View Live Map</h4>
              <p className="text-blue-100 text-sm">
                Track all vessels on interactive map
              </p>
            </div>
          </Link>

          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-linear-to-br from-cyan-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow text-left"
          >
            <Plus className="w-10 h-10 mb-3" />
            <h4 className="text-lg font-bold mb-2">Create Vessel</h4>
            <p className="text-cyan-100 text-sm">
              Add new vessel to fleet
            </p>
          </button>

          <button
            onClick={() => setShowAssignModal(true)}
            className="bg-linear-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow text-left"
          >
            <UserPlus className="w-10 h-10 mb-3" />
            <h4 className="text-lg font-bold mb-2">Assign Captain</h4>
            <p className="text-emerald-100 text-sm">
              Link vessels to captains
            </p>
          </button>
        </div>

        {/* Captains & Unassigned Vessels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Unassigned Vessels */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-orange-50 to-yellow-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Ship className="w-5 h-5 text-orange-600" />
                Unassigned Vessels ({unassignedCount})
              </h3>
            </div>
            <div className="p-6">
              {unassignedCount === 0 ? (
                <p className="text-center text-gray-500 py-8">All vessels assigned! 🎉</p>
              ) : (
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {vessels.filter(v => !v.captainId || (typeof v.captainId === 'object' && !v.captainId._id)).map((vessel) => (
                    <div key={vessel._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-linear-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">
                          {vessel.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{vessel.name}</p>
                          <p className="text-sm text-gray-500">MMSI: {vessel.mmsi}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setAssignData({ vesselId: vessel._id, captainId: "" });
                          setShowAssignModal(true);
                        }}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        Assign Now
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Captains Status */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-purple-50 to-indigo-50">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Anchor className="w-5 h-5 text-purple-600" />
                Captains ({captains.length})
              </h3>
            </div>
            <div className="p-6 max-h-64 overflow-y-auto">
              {captains.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No captains registered</p>
              ) : (
                captains.map((captain) => {
                  const assignedVessel = getAssignedVessel(captain._id);
                  return (
                    <div key={captain._id} className="flex items-center justify-between p-4 bg-linear-to-r from-white to-gray-50 rounded-xl mb-3 last:mb-0 hover:shadow-sm transition-all">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 bg-linear-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                          {captain.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{captain.name}</p>
                          <p className="text-xs text-gray-500">{captain.email}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        assignedVessel 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : 'bg-gray-100 text-gray-800 border border-gray-200'
                      }`}>
                        {assignedVessel ? assignedVessel.name : 'No Vessel'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* ALL Vessels Table with Pagination */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-linear-to-r from-blue-50 to-cyan-50">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">All Vessels</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Showing {indexOfFirstVessel + 1}-{Math.min(indexOfLastVessel, vessels.length)} of {vessels.length}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Vessel
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Captain
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Speed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Last Noon
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentVessels.map((vessel) => {
                  const overdue = isNoonOverdue(vessel);
                  return (
                    <tr key={vessel._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-linear-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center text-white font-semibold shadow">
                            {vessel.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-medium text-gray-900">{vessel.name}</span>
                            <p className="text-xs text-gray-500">MMSI: {vessel.mmsi}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-medium text-gray-900">
                          {getCaptainName(vessel.captainId)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                            vessel.status === "active"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : "bg-gray-50 text-gray-700 border border-gray-200"
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              vessel.status === "active"
                                ? "bg-green-500 animate-pulse"
                                : "bg-gray-400"
                            }`}
                          ></span>
                          {vessel.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {vessel.speed || 0} knots
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {overdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-lg text-xs font-medium border border-red-200">
                            <AlertTriangle className="w-3 h-3" />
                            OVERDUE
                          </span>
                        ) : (
                          <span className="text-sm text-gray-600">
                            {formatTimeAgo(vessel.lastNoonReportAt)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button 
                          onClick={() => {
                            // ✅ FIXED: Extract captain ID properly
                            const captainIdValue = vessel.captainId?._id || vessel.captainId || "";
                            setAssignData({ 
                              vesselId: vessel._id, 
                              captainId: captainIdValue
                            });
                            setShowAssignModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-700 hover:underline mr-3"
                        >
                          Reassign
                        </button>
                        <Link to={`/map`} className="text-emerald-600 hover:text-emerald-700 hover:underline">
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
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => paginate(i + 1)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      currentPage === i + 1
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Vessel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <Plus className="w-6 h-6 text-cyan-600" />
                  Create New Vessel
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 -m-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-8 space-y-6">
              {createError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {createError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vessel Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={createData.name}
                    onChange={handleCreateChange}
                    required
                    placeholder="e.g., SS Discovery"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    MMSI (9 digits) *
                  </label>
                  <input
                    type="text"
                    name="mmsi"
                    value={createData.mmsi}
                    onChange={handleCreateChange}
                    required
                    maxLength="9"
                    pattern="[0-9]{9}"
                    placeholder="e.g., 123456789"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Vessel Type
                  </label>
                  <select
                    name="type"
                    value={createData.type}
                    onChange={handleCreateChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none bg-white"
                  >
                    <option value="cargo">Cargo</option>
                    <option value="tanker">Tanker</option>
                    <option value="passenger">Passenger</option>
                    <option value="fishing">Fishing</option>
                    <option value="military">Military</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Latitude *
                  </label>
                  <input
                    type="number"
                    name="latitude"
                    value={createData.latitude}
                    onChange={handleCreateChange}
                    required
                    step="0.000001"
                    min="-90"
                    max="90"
                    placeholder="e.g., 19.0760"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Longitude *
                  </label>
                  <input
                    type="number"
                    name="longitude"
                    value={createData.longitude}
                    onChange={handleCreateChange}
                    required
                    step="0.000001"
                    min="-180"
                    max="180"
                    placeholder="e.g., 72.8777"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Speed (knots)
                  </label>
                  <input
                    type="number"
                    name="speed"
                    value={createData.speed}
                    onChange={handleCreateChange}
                    step="0.1"
                    min="0"
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Heading (degrees)
                  </label>
                  <input
                    type="number"
                    name="heading"
                    value={createData.heading}
                    onChange={handleCreateChange}
                    step="1"
                    min="0"
                    max="360"
                    placeholder="0"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-linear-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {creating ? "Creating..." : "Create Vessel"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Captain Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-8 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <UserPlus className="w-6 h-6 text-emerald-600" />
                  Assign Captain
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 -m-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAssignSubmit} className="p-8 space-y-6">
              {assignError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {assignError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Vessel
                </label>
                <select
                  name="vesselId"
                  value={assignData.vesselId}
                  onChange={handleAssignChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">Choose vessel...</option>
                  {vessels.map((vessel) => (
                    <option key={vessel._id} value={vessel._id}>
                      {vessel.name} ({vessel.mmsi})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Select Captain
                </label>
                <select
                  name="captainId"
                  value={assignData.captainId}
                  onChange={handleAssignChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none"
                >
                  <option value="">Choose captain...</option>
                  {captains.map((captain) => (
                    <option key={captain._id} value={captain._id}>
                      {captain.name} ({captain.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-900 font-semibold py-3 px-4 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigning}
                  className="flex-1 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {assigning ? "Assigning..." : "Assign Captain"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
