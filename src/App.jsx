import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import BottomNav from "./components/BottomNav";

// Pages
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Routine from "./pages/Routine";
import Todos from "./pages/Todos";
import Journal from "./pages/Journal";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import LoadingSpinner from "./components/LoadingSpinner";

import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}

function AppContent() {
  const { loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="d-flex flex-column min-vh-100 pb-5">
      <Navbar />
      <div className="flex-grow-1 position-relative overflow-hidden">
        <div key={location.pathname} className="route-transition-wrapper">
          <Routes location={location}>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/routine" element={
              <ProtectedRoute>
                <Routine />
              </ProtectedRoute>
            } />
            <Route path="/todos" element={
              <ProtectedRoute>
                <Todos />
              </ProtectedRoute>
            } />
            <Route path="/journal" element={
              <ProtectedRoute>
                <Journal />
              </ProtectedRoute>
            } />
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            } />
          </Routes>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}

export default App;
