import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Navbar from './Navbar';
import ManagerDashboard from './ManagerDashboard';
import CaptainDashboard from './CaptainDashboard';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      {user?.role === 'manager' ? <ManagerDashboard /> : <CaptainDashboard />}
    </div>
  );
};

export default Dashboard;
