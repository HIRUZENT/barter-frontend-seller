import { Link } from "react-router-dom";
import { logout } from "../auth/auth";

export default function SidebarProfile({ user }) {
  return (
    <div className="space-y-3 pb-4">
      {user ? (
        <>
          <div className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name || "User"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center font-bold text-2xl text-blue-600">
                  {user?.name?.substring(0, 2).toUpperCase() || "U"}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-800 leading-tight">
                {user.name || "User"}
              </p>

              <Link
                to="/profile"
                className="text-xs text-blue-600 cursor-pointer mt-0.5 hover:underline"
              >
                Lihat Profil
              </Link>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-gray-300 hover:bg-gray-50 shadow-sm"
          >
            Logout
          </button>
        </>
      ) : (
        <Link
          to="/login"
          className="w-full rounded-xl bg-blue-600 text-white px-3 py-2.5 text-sm font-semibold transition hover:bg-blue-700 shadow-md text-center block"
        >
          Login
        </Link>
      )}
    </div>
  );
}