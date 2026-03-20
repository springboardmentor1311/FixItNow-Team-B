import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AnimatePresence } from "framer-motion";

import LandingPage from "./pages/LandingPage.js";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ProviderPendingApproval from "./pages/ProviderPendingApproval";

import CustomerDashboard from "./pages/CustomerDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <Router>
      <AnimatePresence mode="wait">
        <Routes>

          {/* ===== PUBLIC ROUTES ===== */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/pending-approval" element={<ProviderPendingApproval />} />

          {/* ===== PROTECTED ROUTES ===== */}
          <Route
            path="/customer/*"
            element={
              <ProtectedRoute allowedRole="CUSTOMER">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/provider/*"
            element={
              <ProtectedRoute allowedRole="PROVIDER">
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/*"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<LandingPage />} />

        </Routes>
      </AnimatePresence>
    </Router>
  );
}

export default App;
