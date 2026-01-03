import { useEffect, useState } from 'react';
import { FileText, Download, Eye, X, Ship, MapPin, Fuel, Gauge } from 'lucide-react';
import api from '../utils/api';

const RecentNoonReports = ({ socket }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Load recent reports
  useEffect(() => {
    loadReports();
  }, []);

  // Listen for new noon reports via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewReport = (data) => {
      console.log('📨 New noon report received:', data);
      // Add to top of list
      setReports(prev => [data.report, ...prev].slice(0, 10));
    };

    socket.on('new-noon-report', handleNewReport);

    return () => {
      socket.off('new-noon-report', handleNewReport);
    };
  }, [socket]);

  const loadReports = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/vessels/noon-reports/recent?limit=10');
      setReports(data.data || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load recent reports:', error);
      setLoading(false);
    }
  };

  const handleViewDetails = (report) => {
    setSelectedReport(report);
    setShowModal(true);
  };

  const handleExportCSV = () => {
    // CSV headers
    const headers = [
      'Date',
      'Vessel',
      'Captain',
      'Latitude',
      'Longitude',
      'Speed (kn)',
      'Distance (nm)',
      'Fuel ROB (t)',
      'Fuel Consumed (t)',
      'Next Port',
      'ETA'
    ];

    // CSV rows
    const rows = reports.map(report => [
      new Date(report.reportedAt).toLocaleString(),
      report.vesselId?.name || 'N/A',
      report.captainId?.name || 'N/A',
      report.position?.latitude.toFixed(6) || '',
      report.position?.longitude.toFixed(6) || '',
      report.averageSpeed || '',
      report.distanceSinceLastNoon || '',
      report.fuelRob || '',
      report.fuelConsumedSinceLastNoon || '',
      report.nextPort || '',
      report.eta ? new Date(report.eta).toLocaleString() : ''
    ]);

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `noon-reports-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const formatDateTime = (date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-100 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-800">Recent Noon Reports</h2>
              <p className="text-sm text-gray-500">Last 10 submissions</p>
            </div>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={reports.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Reports Table */}
        {reports.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No noon reports submitted yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date & Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Vessel
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Captain
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Position
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Distance (nm)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fuel ROB (t)
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reports.map((report) => (
                  <tr key={report._id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                      {formatDateTime(report.reportedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {report.vesselId?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {report.captainId?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {report.position?.latitude.toFixed(2)}°, {report.position?.longitude.toFixed(2)}°
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {report.distanceSinceLastNoon?.toFixed(1) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {report.fuelRob?.toFixed(1) || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleViewDetails(report)}
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Report Details Modal */}
      {showModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Noon Report Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Vessel Info */}
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Ship className="w-6 h-6 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-800">Vessel Information</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Vessel Name</p>
                    <p className="font-semibold text-gray-900">{selectedReport.vesselId?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Captain</p>
                    <p className="font-semibold text-gray-900">{selectedReport.captainId?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Report Time</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedReport.reportedAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Voyage No</p>
                    <p className="font-semibold text-gray-900">{selectedReport.voyageNo || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Position & Navigation */}
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <MapPin className="w-6 h-6 text-green-600" />
                  <h3 className="text-lg font-bold text-gray-800">Position & Navigation</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Latitude</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReport.position?.latitude.toFixed(6)}°
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Longitude</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReport.position?.longitude.toFixed(6)}°
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Average Speed</p>
                    <p className="font-semibold text-gray-900">{selectedReport.averageSpeed} knots</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Distance Since Last Noon</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReport.distanceSinceLastNoon} nm
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Course Over Ground</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReport.courseOverGround || '-'}°
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Next Port</p>
                    <p className="font-semibold text-gray-900">{selectedReport.nextPort || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Fuel Data */}
              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Fuel className="w-6 h-6 text-yellow-600" />
                  <h3 className="text-lg font-bold text-gray-800">Fuel Consumption</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Fuel ROB (Remaining on Board)</p>
                    <p className="font-semibold text-gray-900">{selectedReport.fuelRob} tons</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fuel Consumed Since Last Noon</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReport.fuelConsumedSinceLastNoon} tons
                    </p>
                  </div>
                </div>
              </div>

              {/* Engine Data */}
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Gauge className="w-6 h-6 text-purple-600" />
                  <h3 className="text-lg font-bold text-gray-800">Engine Performance</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Main Engine RPM</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReport.mainEngineRpm || '-'} RPM
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Main Engine Power</p>
                    <p className="font-semibold text-gray-900">
                      {selectedReport.mainEnginePower || '-'} kW
                    </p>
                  </div>
                </div>
              </div>

              {/* Weather */}
              {selectedReport.weather && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-gray-800 mb-3">Weather Conditions</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Wind Speed</p>
                      <p className="font-semibold text-gray-900">
                        {selectedReport.weather.windSpeed || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Wind Direction</p>
                      <p className="font-semibold text-gray-900">
                        {selectedReport.weather.windDirection || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Sea State</p>
                      <p className="font-semibold text-gray-900">
                        {selectedReport.weather.seaState || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Swell</p>
                      <p className="font-semibold text-gray-900">
                        {selectedReport.weather.swell || '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Visibility</p>
                      <p className="font-semibold text-gray-900">
                        {selectedReport.weather.visibility || '-'}
                      </p>
                    </div>
                  </div>
                  {selectedReport.weather.remarks && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600">Remarks</p>
                      <p className="text-gray-900">{selectedReport.weather.remarks}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <button
                onClick={() => setShowModal(false)}
                className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default RecentNoonReports;
