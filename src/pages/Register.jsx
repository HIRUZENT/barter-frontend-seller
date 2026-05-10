import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import api from "../api/axios";
import { saveAuthData } from "../auth/auth";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const redirectUrl = searchParams.get("redirect") || "/";

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    password_confirmation: "",
    wa_number: "",
  });

  const [loading, setLoading] = useState(false);
  const [oauthLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });

    setErrorMessage("");
  };

  const handleRegister = async () => {
    if (!acceptedTerms) {
      alert("Silakan centang 'Saya menyetujui syarat dan ketentuan' terlebih dahulu.");
      return;
    }

    if (!form.name || !form.email || !form.phone || !form.password) {
      setErrorMessage("Semua field harus diisi");
      return;
    }

    if (form.password !== form.password_confirmation) {
      setErrorMessage("Password tidak cocok");
      return;
    }

    setLoading(true);
    setErrorMessage("");

    try {
      const payload = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        password: form.password,
        password_confirmation: form.password_confirmation,
        wa_number: form.wa_number || form.phone,
      };

      const res = await api.post("/register", payload);

      if (res.data.success) {
        const { token, user } = res.data.data;

        if (!token || !user) {
          setErrorMessage("Response dari server tidak lengkap. Token atau user data hilang.");
          setLoading(false);
          return;
        }

        saveAuthData(token, user);

        alert("Registrasi berhasil! Selamat datang di RatheR");

        setTimeout(() => {
          if (user.is_seller) {
            navigate("/", { replace: true });
          } else {
            navigate(redirectUrl, { replace: true });
          }
        }, 100);
      } else {
        setErrorMessage(res.data.message || "Registrasi gagal. Silakan coba lagi.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Register error:", err.response?.data);

      const errors = err.response?.data?.errors;

      if (errors) {
        const errorText = Object.values(errors).flat().join(", ");
        setErrorMessage(errorText);
      } else {
        setErrorMessage(
          err.response?.data?.message || "Registrasi gagal. Silakan coba lagi."
        );
      }

      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !loading) {
      handleRegister();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl shadow-slate-200">
        <div className="text-center mb-8">
          <p className="text-4xl font-semibold text-slate-900">RatheR</p>
          <p className="text-sm text-slate-500 mt-2">Buat akun baru Anda</p>
        </div>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}

        <div className="space-y-5">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nama lengkap</span>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              placeholder="Masukkan nama lengkap"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              placeholder="Masukkan email"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nomor HP</span>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              placeholder="Masukkan nomor HP"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Nomor WhatsApp</span>
            <input
              type="text"
              name="wa_number"
              value={form.wa_number}
              onChange={handleChange}
              onKeyDown={handleKeyPress}
              placeholder="Opsional, kosongkan jika sama dengan nomor HP"
              className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <PasswordField
            label="Password"
            name="password"
            value={form.password}
            show={showPassword}
            setShow={setShowPassword}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            placeholder="Masukkan password"
          />

          <PasswordField
            label="Konfirmasi Password"
            name="password_confirmation"
            value={form.password_confirmation}
            show={showConfirmPassword}
            setShow={setShowConfirmPassword}
            onChange={handleChange}
            onKeyDown={handleKeyPress}
            placeholder="Ulangi password"
          />

          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600 mt-1">
              Saya menyetujui syarat dan ketentuan yang berlaku.
            </span>
          </label>

          <button
            type="button"
            onClick={handleRegister}
            disabled={loading || oauthLoading}
            className="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Mendaftar..." : "Daftar"}
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-3 text-xs uppercase tracking-wide text-slate-400">
                atau
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled
            className="w-full flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-400 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Daftar dengan Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-slate-500">
          Sudah punya akun?{" "}
          <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-700">
            Masuk sekarang
          </Link>
        </p>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  name,
  value,
  show,
  setShow,
  onChange,
  onKeyDown,
  placeholder,
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-2 relative">
        <input
          type={show ? "text" : "password"}
          name={name}
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="w-full rounded-2xl border border-slate-200 px-4 py-3 pr-12 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute inset-y-0 right-4 text-sm text-slate-500"
        >
          {show ? "Hide" : "Show"}
        </button>
      </div>
    </label>
  );
}