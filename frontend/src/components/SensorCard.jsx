import { Thermometer, Droplets, Gauge, Navigation, Activity } from 'lucide-react';

const SensorCard = ({ 
  type, 
  value, 
  unit, 
  label, 
  threshold = {},
  size = 'normal' // 'normal' or 'large'
}) => {
  
  // Determine status based on thresholds
  const getStatus = () => {
    if (!threshold.warning && !threshold.critical) return 'normal';
    
    if (type === 'engineTemp') {
      if (value >= 90) return 'critical';
      if (value >= 80) return 'warning';
      return 'normal';
    }
    
    if (type === 'fuelLevel') {
      if (value < 20) return 'critical';
      if (value < 50) return 'warning';
      return 'normal';
    }
    
    return 'normal';
  };

  const status = getStatus();

  // Get icon based on type
  const getIcon = () => {
    switch (type) {
      case 'engineTemp':
        return <Thermometer className="w-5 h-5" />;
      case 'fuelLevel':
        return <Droplets className="w-5 h-5" />;
      case 'speed':
        return <Gauge className="w-5 h-5" />;
      case 'rpm':
        return <Activity className="w-5 h-5" />;
      case 'heading':
        return <Navigation className="w-5 h-5" />;
      default:
        return <Gauge className="w-5 h-5" />;
    }
  };

  // Get color classes based on status
  const getColorClasses = () => {
    switch (status) {
      case 'critical':
        return {
          border: 'border-red-500',
          bg: 'bg-red-50',
          text: 'text-red-700',
          icon: 'text-red-600',
          badge: 'bg-red-100 text-red-800',
          progress: 'bg-red-500',
        };
      case 'warning':
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-50',
          text: 'text-yellow-700',
          icon: 'text-yellow-600',
          badge: 'bg-yellow-100 text-yellow-800',
          progress: 'bg-yellow-500',
        };
      default:
        return {
          border: 'border-gray-300',
          bg: 'bg-white',
          text: 'text-gray-900',
          icon: 'text-blue-600',
          badge: 'bg-green-100 text-green-800',
          progress: 'bg-blue-500',
        };
    }
  };

  const colors = getColorClasses();

  // Calculate progress bar percentage
  const getProgressPercentage = () => {
    if (type === 'engineTemp') {
      return Math.min((value / 100) * 100, 100);
    }
    if (type === 'fuelLevel') {
      return value;
    }
    if (type === 'speed') {
      return Math.min((value / 30) * 100, 100); // Max 30 knots
    }
    if (type === 'rpm') {
      return Math.min((value / 2000) * 100, 100); // Max 2000 RPM
    }
    return 50;
  };

  const getStatusLabel = () => {
    switch (status) {
      case 'critical':
        return type === 'engineTemp' ? 'HIGH!' : 'LOW!';
      case 'warning':
        return 'WARNING';
      default:
        return 'NORMAL';
    }
  };

  // Get heading direction
  const getHeadingDirection = (heading) => {
    if (heading >= 337.5 || heading < 22.5) return 'N ↑';
    if (heading >= 22.5 && heading < 67.5) return 'NE ↗';
    if (heading >= 67.5 && heading < 112.5) return 'E →';
    if (heading >= 112.5 && heading < 157.5) return 'SE ↘';
    if (heading >= 157.5 && heading < 202.5) return 'S ↓';
    if (heading >= 202.5 && heading < 247.5) return 'SW ↙';
    if (heading >= 247.5 && heading < 292.5) return 'W ←';
    if (heading >= 292.5 && heading < 337.5) return 'NW ↖';
    return 'N ↑';
  };

  if (size === 'large') {
    return (
      <div className={`border-2 ${colors.border} ${colors.bg} rounded-lg p-6 shadow-md transition-all duration-300 hover:shadow-lg`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={colors.icon}>
              {getIcon()}
            </div>
            <h3 className="text-lg font-semibold text-gray-700">{label}</h3>
          </div>
          {status !== 'normal' && (
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${colors.badge}`}>
              {getStatusLabel()}
            </span>
          )}
        </div>

        <div className="text-center mb-4">
          <div className={`text-4xl font-bold ${colors.text}`}>
            {type === 'heading' ? Math.round(value) : value.toFixed(1)}
            <span className="text-2xl ml-2">{unit}</span>
          </div>
          {type === 'heading' && (
            <div className="text-xl font-semibold text-gray-600 mt-2">
              {getHeadingDirection(value)}
            </div>
          )}
        </div>

        {type !== 'heading' && (
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`${colors.progress} h-3 rounded-full transition-all duration-500 ease-out`}
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  // Normal size (for manager grid)
  return (
    <div className={`border ${colors.border} ${colors.bg} rounded-lg p-3 transition-all duration-300`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={`${colors.icon} text-sm`}>
            {getIcon()}
          </div>
          <span className="text-xs font-medium text-gray-600">{label}</span>
        </div>
        {status !== 'normal' && (
          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${colors.badge}`}>
            ⚠️
          </span>
        )}
      </div>
      
      <div className={`text-xl font-bold ${colors.text}`}>
        {type === 'heading' ? Math.round(value) : value.toFixed(1)}
        <span className="text-sm ml-1">{unit}</span>
      </div>
      
      {type !== 'heading' && (
        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
          <div
            className={`${colors.progress} h-1.5 rounded-full transition-all duration-500`}
            style={{ width: `${getProgressPercentage()}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default SensorCard;
