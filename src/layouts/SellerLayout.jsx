import { Link, Outlet, useLocation } from "react-router-dom";
import { logout, getCurrentUser } from "../auth/auth";

const menu = [
    { name: "Dashboard", path: "/" },
    { name: "Produk", path: "/products" },
    { name: "Transaksi", path: "/transactions" },
    { name: "Wallet", path: "/wallet" },
    { name: "Iklan", path: "/ads" },
    { name: "Refund", path: "/refunds" },
    { name: "Notifikasi", path: "/notifications" },
    { name: "Analitik", path: "/analytics" },
];

export default function SellerLayout() {
    const location = useLocation();
    const user = getCurrentUser();

    return (
        <div className="min-h-screen w-full bg-slate-100">
            <aside className="fixed left-0 top-0 hidden h-screen w-72 border-r bg-white px-6 py-6 shadow-sm lg:block">
                <h1 className="text-3xl font-bold text-blue-600">RatheR</h1>
                <p className="mt-1 text-sm text-slate-500">Seller Dashboard</p>

                <div className="mt-8 rounded-2xl bg-slate-100 p-4">
                    <p className="font-semibold text-slate-900">{user?.name || "Seller"}</p>
                    <p className="mt-1 truncate text-sm text-slate-500">{user?.email}</p>
                </div>

                <nav className="mt-8 space-y-2">
                    {menu.map((item) => {
                        const active = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${active
                                    ? "bg-blue-600 text-white shadow"
                                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                            >
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>

                <button
                    onClick={logout}
                    className="absolute bottom-6 left-6 right-6 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-100"
                >
                    Logout
                </button>
            </aside>

            <div className="min-h-screen lg:pl-72">
                <header className="sticky top-0 z-10 border-b bg-white/90 px-4 py-4 backdrop-blur lg:px-8">
                    <div className="mx-auto flex max-w-7xl items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900">
                                Seller Center
                            </h2>
                            <p className="text-sm text-slate-500">
                                Kelola produk, transaksi, wallet, dan aktivitas seller.
                            </p>
                        </div>

                        <button
                            onClick={logout}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white lg:hidden"
                        >
                            Logout
                        </button>
                    </div>
                </header>

                <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}