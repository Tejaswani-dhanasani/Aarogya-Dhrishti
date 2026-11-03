import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';

// Staff-portal pages (your own design, plain CSS)
import HomePage from './portal/HomePage.jsx';
import StaffRegister from './portal/RegisterPage.jsx';
import PatientManagement from './portal/PatientManagement.jsx';
import MedicalOfficerReview from './portal/MedicalOfficerReview.jsx';
import SpecialistConsultation from './portal/SpecialistConsultation.jsx';
import OfficialAccountManager from './portal/OfficialAccountManager.jsx';
import ComingSoon from './portal/ComingSoon.jsx';

function Protected({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RoleOnly({ allowedRoles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return allowedRoles.includes(user.role) ? children : <Navigate to="/dashboard" replace />;
}

function PortalEntry({ children }) {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      {/* Main site + live app (Tailwind design, connected to the backend) */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PortalEntry><Login /></PortalEntry>} />
      <Route path="/register" element={<PortalEntry><Register /></PortalEntry>} />
      <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />

      {/* Portal entry and account pages are only shown while signed out. */}
      <Route path="/portal" element={<PortalEntry><HomePage /></PortalEntry>} />
      <Route path="/login/:role" element={<PortalEntry><Login /></PortalEntry>} />
      <Route path="/register/:role" element={<PortalEntry><StaffRegister /></PortalEntry>} />
      <Route path="/overview" element={<RoleOnly allowedRoles={['DISTRICT_ADMIN']}><Navigate to="/dashboard" replace /></RoleOnly>} />
      <Route path="/patients" element={<RoleOnly allowedRoles={['MEDICAL_OFFICER']}><PatientManagement /></RoleOnly>} />
      <Route path="/medical-officer/review" element={<RoleOnly allowedRoles={['MEDICAL_OFFICER']}><MedicalOfficerReview /></RoleOnly>} />
      <Route path="/specialist/consultation" element={<RoleOnly allowedRoles={['SPECIALIST']}><SpecialistConsultation /></RoleOnly>} />
      <Route path="/staff-management" element={<RoleOnly allowedRoles={['SUPER_ADMIN', 'DISTRICT_ADMIN']}><OfficialAccountManager /></RoleOnly>} />
      <Route path="/follow-up" element={<RoleOnly allowedRoles={['NAVIGATOR']}><ComingSoon title="Patient Follow-up" /></RoleOnly>} />
      <Route path="/reports" element={<RoleOnly allowedRoles={['DISTRICT_ADMIN']}><ComingSoon title="Reports & Analytics" /></RoleOnly>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
