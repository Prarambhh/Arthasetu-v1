import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import Landing from './pages/Landing';
import { Register, Login } from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Borrow from './pages/Borrow';
import Lend from './pages/Lend';
import Repay from './pages/Repay';
import Profile from './pages/Profile';
import Explorer from './pages/Explorer';
import Community from './pages/Community';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen bg-mesh flex items-center justify-center">
      <div className="text-white/40 animate-pulse">Connecting to protocol...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/explorer" element={<Explorer />} />
        <Route path="/community" element={<Community />} />
        <Route path="/profile/:userId" element={<Profile />} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/borrow" element={<ProtectedRoute><Borrow /></ProtectedRoute>} />
        <Route path="/lend" element={<ProtectedRoute><Lend /></ProtectedRoute>} />
        <Route path="/repay" element={<ProtectedRoute><Repay /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
