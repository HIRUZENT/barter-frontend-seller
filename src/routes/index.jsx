import { BrowserRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "../auth/ProtectedRoute";

import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Transactions from "../pages/Transactions";
import Wallet from "../pages/Wallet";
import Refunds from "../pages/Refunds";
import Notifications from "../pages/Notifications";
import AuthCallback from "../pages/AuthCallback";
import AuthReceiver from "../pages/AuthReceiver";

function ExternalRedirect({ to }) {
  window.location.href = to;
  return null;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />

        <Route
          path="/login"
          element={<ExternalRedirect to="http://localhost:3000/login" />}
        />

        <Route
          path="/register"
          element={<ExternalRedirect to="http://localhost:3000/register" />}
        />

        <Route path="/auth/receiver" element={<AuthReceiver />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/seller"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <Products />
            </ProtectedRoute>
          }
        />

        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <Transactions />
            </ProtectedRoute>
          }
        />

        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <Wallet />
            </ProtectedRoute>
          }
        />

        <Route
          path="/refunds"
          element={
            <ProtectedRoute>
              <Refunds />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}