import { useEffect } from "react";

export default function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    const token = params.get("token");
    const user = params.get("user");

    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("auth_token", token);
    }

    if (user) {
      localStorage.setItem("current_user", user);
    }

    window.location.replace("/");
  }, []);

  return (
    <div className="flex h-screen items-center justify-center">
      Loading...
    </div>
  );
}