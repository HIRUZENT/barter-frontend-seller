import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Products from "../pages/Products";
import Orders from "../pages/Orders";
import TradeRequests from "../pages/TradeRequests";
import BarterRequests from "../pages/BarterRequests";

function ProtectedRoute({ children }) {
  const token = localStorage.getItem("seller_token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="orders" element={<Orders />} />
          <Route path="trade-requests" element={<TradeRequests />} />
          <Route path="barter-requests" element={<BarterRequests />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}