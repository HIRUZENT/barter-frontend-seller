export default function ProtectedRoute({ children }) {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("auth_token");

  if (!token) {
    window.location.href = "http://localhost:3000/login";
    return null;
  }

  return children;
}