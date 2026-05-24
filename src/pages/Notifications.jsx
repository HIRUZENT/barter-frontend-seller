import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api/axios";
import SidebarProfile from "../components/SidebarProfile";

const formatRelativeDate = (dateStr) => {
  if (!dateStr) return "";

  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Baru saja";
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const mapNotificationResponse = (item) => {
  const data = item.data ?? {};
  const rawDate =
    item.created_at ||
    item.createdAt ||
    item.updated_at ||
    item.updatedAt ||
    "";

  return {
    id: item.id ?? data.id ?? "",
    title: data.title || "Notifikasi baru",
    description: data.message || "",
    date: formatRelativeDate(rawDate),
    unread: item.read_at === null,
    actionUrl: data.action_url,
    type: data.type,
  };
};

const sellerMenus = [
  { name: "Dashboard", href: "/" },
  { name: "Produk", href: "/products" },
  { name: "Transaksi", href: "/transactions" },
  { name: "Refunds", href: "/refunds" },
  { name: "Wallet", href: "/wallet" },
  { name: "Notifikasi", href: "/notifications" },
  { name: "Analitik", href: "/analytics" },
  { name: "Pindah ke halaman pembeli", href: "http://localhost:3000/" },
];

export default function Notifications() {
  const pathname = useLocation().pathname;
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem("current_user");

    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser(null);
      }
    }

    const fetchNotifications = async () => {
      try {
        const res = await api.get("/notifications");

        const payload = res.data?.data?.data ?? res.data?.data ?? [];

        const notificationsData = Array.isArray(payload)
          ? payload
          : Array.isArray(payload.notifications)
            ? payload.notifications
            : [];

        setNotifications(notificationsData.map(mapNotificationResponse));
      } catch (error) {
        console.error("Gagal memuat notifikasi:", error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, []);

  const markAllRead = async () => {
    try {
      await api.put("/notifications/read-all");

      setNotifications((prev) =>
        prev.map((item) => ({
          ...item,
          unread: false,
        }))
      );
    } catch (err) {
      console.error("Gagal menandai semua dibaca:", err);
    }
  };

  const toggleRead = async (id) => {
    const target = notifications.find((item) => item.id === id);
    if (!target) return;

    if (target.unread) {
      try {
        await api.put(`/notifications/${id}/read`);

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                ...item,
                unread: false,
              }
              : item
          )
        );
      } catch (err) {
        console.error("Gagal menandai notifikasi:", err);
      }
    } else {
      try {
        await api.put(`/notifications/${id}/unread`);

        setNotifications((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                ...item,
                unread: true,
              }
              : item
          )
        );
      } catch (err) {
        console.error("Gagal menandai notifikasi:", err);
      }
    }
  };

  const normalizeActionUrl = (url) => {
    if (!url) return null;

    if (url.startsWith("/seller/notifications")) return "/notifications";
    if (url.startsWith("/seller/products")) return "/products";
    if (url.startsWith("/seller/transactions")) return "/transactions";
    if (url.startsWith("/seller/refunds")) return "/refunds";
    if (url.startsWith("/seller/wallet")) return "/wallet";
    if (url === "/seller") return "/";

    return url;
  };

  const handleClickNotification = (item) => {
    if (item.unread) {
      toggleRead(item.id);
    }

    if (item.actionUrl) {
      const url = normalizeActionUrl(item.actionUrl);

      if (url.startsWith("http")) {
        window.location.href = url;
      } else {
        navigate(url);
      }
    }
  };

  const isActive = (href) => {
    return pathname === href;
  };

  const unreadCount = notifications.filter((item) => item.unread).length;

  return (
    <div className="flex min-h-screen w-screen bg-white font-sans">
      <div className="w-64 bg-white border-r p-4 flex flex-col justify-between fixed h-screen overflow-y-auto z-10">
        <div>
          <h1
            className="text-2xl font-bold text-blue-500"
            style={{ letterSpacing: "2px" }}
          >
            Rather&apos;s
          </h1>

          <p className="text-sm text-gray-500 mb-4">Seller Dashboard</p>

          <nav className="mt-6 space-y-2">
            {sellerMenus.map((item) => {
              const isExternal = item.href.startsWith("http");
              const isActive = pathname === item.href;

              if (isExternal) {
                return (
                  <a
                    key={item.name}
                    href={item.href}
                    className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <span>{item.name}</span>
                  </a>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${isActive
                      ? "bg-blue-100 text-blue-600"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                >
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <SidebarProfile user={user} />
      </div>

      <div className="flex-1 md:ml-64 pt-4 pb-8 px-6 lg:px-8 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Notifikasi Penjual
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                Semua notifikasi terbaru untuk akun penjual Anda.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
                {unreadCount} belum dibaca
              </div>

              <button
                onClick={markAllRead}
                className="rounded-2xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50"
              >
                Tandai semua dibaca
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {loading ? (
              <div className="rounded-3xl border p-8 text-center text-gray-500">
                Memuat notifikasi...
              </div>
            ) : notifications.length === 0 ? (
              <div className="rounded-3xl border border-dashed p-10 text-center">
                <p className="text-lg font-semibold">Tidak ada notifikasi</p>
                <p className="mt-2 text-sm text-gray-600">
                  Periksa kembali nanti.
                </p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleClickNotification(item)}
                  className={`cursor-pointer rounded-3xl border px-6 py-5 shadow-sm transition ${item.unread
                      ? "border-blue-300 bg-blue-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg text-blue-500 font-semibold">
                          {item.title}
                        </h2>

                        {item.unread && (
                          <span className="bg-orange-500 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">
                            Baru
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-gray-600">
                        {item.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      <span>{item.date}</span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleRead(item.id);
                        }}
                        className="rounded-full bg-green-500 text-white border px-3 py-2 text-sm"
                      >
                        {item.unread
                          ? "Tandai dibaca"
                          : "Tandai belum dibaca"}
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}