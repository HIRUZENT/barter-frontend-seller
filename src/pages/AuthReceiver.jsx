import { useEffect } from "react";

export default function AuthReceiver() {
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.origin !== "http://localhost:3000") {
        return;
      }

      const { token, user } = event.data || {};

      if (!token || !user) {
        window.location.href = "http://localhost:3000/login";
        return;
      }

      localStorage.setItem("token", token);
      localStorage.setItem("auth_token", token);
      localStorage.setItem(
        "current_user",
        typeof user === "string" ? user : JSON.stringify(user)
      );

      window.location.replace("/");
    };

    window.addEventListener("message", handleMessage);

    if (window.opener) {
      window.opener.postMessage(
        { type: "SELLER_APP_READY" },
        "http://localhost:3000"
      );
    }

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      Menghubungkan akun seller...
    </div>
  );
}