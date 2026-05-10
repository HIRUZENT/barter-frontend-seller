import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { saveAuthData } from "../auth/auth";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectUrl = searchParams.get("redirect") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage("Email dan password harus diisi!");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const res = await api.post("/login", { email, password });

      if (res.data.success) {
        const { token, user } = res.data.data;

        saveAuthData(token, user);

        if (rememberMe) {
          document.cookie = `token=${token}; path=/; samesite=lax; max-age=2592000`;
          document.cookie = `auth_token=${token}; path=/; samesite=lax; max-age=2592000`;
        }

        if (user.is_seller) {
          navigate("/", { replace: true });
        } else {
          navigate(redirectUrl, { replace: true });
        }
      } else {
        setErrorMessage(res.data.message || "Login gagal");
      }
    } catch (err) {
      console.error("Login error:", err.response?.data ?? err.message);

      if (err.response?.status === 401) {
        setErrorMessage("Email atau password salah");
      } else if (err.response?.status === 403) {
        setErrorMessage("Akun Anda telah dinonaktifkan");
      } else if (err.response?.status === 422) {
        setErrorMessage("Validasi gagal. Silakan periksa input Anda");
      } else {
        setErrorMessage(
          err.response?.data?.message || "Login gagal. Silakan coba lagi nanti."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200">
        <div className="text-center mb-8">
          <p className="text-4xl font-semibold text-slate-900">RatheR</p>
          <p className="text-sm text-slate-500 mt-2">Masuk ke akun Anda</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrorMessage("");
              }}
              onKeyUp={handleKeyPress}
              placeholder="nama@email.com"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Password</span>
            <div className="relative mt-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage("");
                }}
                onKeyUp={handleKeyPress}
                placeholder="Masukkan password"
                className="w-full rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 pr-12 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />

              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
              >
                {showPassword ? "🙈" : "👁️"}
              </button>
            </div>
          </label>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Ingat saya
            </label>

            <Link to="#" className="font-medium text-blue-600 hover:text-blue-700">
              Lupa password?
            </Link>
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {loading ? "Memproses..." : "Masuk"}
          </button>

          <div className="flex items-center gap-3 text-sm text-slate-400">
            <div className="h-px flex-1 bg-slate-200" />
            atau
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Masuk dengan Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Belum punya akun?{" "}
          <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-700">
            Daftar sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}