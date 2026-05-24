import { useEffect, useState } from "react";

export default function AuthReceiver() {
  const [status, setStatus] = useState("loading"); // loading | error

  useEffect(() => {
    let timeout;

    const handleMessage = (event) => {
      if (event.origin !== "http://localhost:3000") return;

      const { token, user } = event.data || {};

      if (!token || !user) {
        setStatus("error");
        return;
      }

      clearTimeout(timeout);
      localStorage.setItem("token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem(
        "current_user",
        typeof user === "string" ? user : JSON.stringify(user)
      );

      // Redirect ke dashboard seller React
      window.location.replace("/");
    };

    window.addEventListener("message", handleMessage);

    // Beritahu opener bahwa halaman sudah siap
    if (window.opener) {
      window.opener.postMessage(
        { type: "SELLER_APP_READY" },
        "http://localhost:3000"
      );
    }

    // Timeout 8 detik — kalau tidak ada token masuk, tampilkan error
    timeout = setTimeout(() => {
      setStatus("error");
    }, 8000);

    return () => {
      window.removeEventListener("message", handleMessage);
      clearTimeout(timeout);
    };
  }, []);

  if (status === "error") {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 bg-gray-50">
        <div className="text-4xl">⚠️</div>
        <p className="text-gray-700 font-semibold">Gagal menerima sesi login.</p>
        <p className="text-sm text-gray-500">
          Buka <strong>localhost:3000</strong>, login, lalu klik{" "}
          <strong> Pindah ke Seller App</strong> di sidebar.
        </p>
        <a
          href="http://localhost:3000"
          className="mt-2 px-5 py-2 bg-blue-500 text-white rounded-xl text-sm font-semibold hover:bg-blue-600"
        >
          Ke Halaman Login
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-3 bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      <p className="text-gray-600 font-medium">Menghubungkan akun seller...</p>
      <p className="text-xs text-gray-400">Menerima sesi dari localhost:3000</p>
    </div>
  );
}