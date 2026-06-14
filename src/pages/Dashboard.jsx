import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SidebarProfile from "../components/SidebarProfile";

const BASE_URL = "http://127.0.0.1:8000/api/v1";
const STORAGE_URL = "http://127.0.0.1:8000";

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

export default function Dashboard() {
  const location = useLocation();
  const pathname = location.pathname;

  const [myProducts, setMyProducts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [barters, setBarters] = useState([]);
  const [wallet, setWallet] = useState({ balance: 0 });
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // tambahan state baru
  const [currentTime, setCurrentTime] = useState(new Date());

  const getToken = () => {
    return localStorage.getItem("token") || localStorage.getItem("auth_token");
  };

  const getAuthHeaders = () => {
    const token = getToken();

    return {
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  const getStoredUser = () => {
    const keys = ["current_user", "user", "auth_user"];

    for (const key of keys) {
      const value = localStorage.getItem(key);

      if (value) {
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      }
    }

    return null;
  };

  const saveUser = (userData) => {
    setUser(userData);
    localStorage.setItem("current_user", JSON.stringify(userData));
  };

  const fetchCurrentUser = async () => {
    try {
      const possibleEndpoints = ["/me", "/user", "/profile"];

      for (const endpoint of possibleEndpoints) {
        const res = await fetch(`${BASE_URL}${endpoint}`, {
          headers: getAuthHeaders(),
        });

        if (!res.ok) continue;

        const json = await res.json();

        if (json.success) {
          const userData =
            json.data?.user ||
            json.data?.data ||
            json.data ||
            json.user;

          if (userData) {
            saveUser(userData);
            return;
          }
        }
      }
    } catch (error) {
      console.error("Gagal ambil user:", error);
    }
  };

  const fetchSellerData = async () => {
    try {
      setLoading(true);

      const [prodRes, transRes, walletRes, adsRes, barterRes] =
        await Promise.all([
          fetch(`${BASE_URL}/my/products`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${BASE_URL}/transactions?role=seller`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${BASE_URL}/wallet/balance`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${BASE_URL}/ads/my`, {
            headers: getAuthHeaders(),
          }),
          fetch(`${BASE_URL}/seller/barter`, {
            headers: getAuthHeaders(),
          }),
        ]);

      const prodJson = await prodRes.json();
      const transJson = await transRes.json();
      const walletJson = await walletRes.json();
      const adsJson = await adsRes.json();
      const barterJson = await barterRes.json();

      if (prodJson.success) {
        setMyProducts(prodJson.data?.data || prodJson.data || []);
      }

      if (transJson.success) {
        setTransactions(transJson.data?.data || transJson.data || []);
      }

      if (walletJson.success) {
        setWallet(walletJson.data || { balance: 0 });
      }

      if (adsJson.success) {
        setAds(adsJson.data?.data || adsJson.data || []);
      }

      if (barterJson.success) {
        setBarters(barterJson.data?.data || barterJson.data || []);
      }
    } catch (error) {
      console.error("Error fetch dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getToken();

    if (!token) {
      window.location.href = "http://localhost:3000/login";
      return;
    }

    const storedUser = getStoredUser();

    if (storedUser) {
      setUser(storedUser);
    } else {
      fetchCurrentUser();
    }

    fetchSellerData();
  }, []);


  const resolveImageUrl = (path) => {
    if (!path) return "/no-image.png";

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const normalizedPath = path.replace(/^\//, "");

    if (normalizedPath.startsWith("storage/")) {
      return `${STORAGE_URL}/${normalizedPath}`;
    }

    return `${STORAGE_URL}/storage/${normalizedPath}`;
  };

  const getImage = (product) => {
    if (product?.images?.length > 0) {
      return resolveImageUrl(product.images[0].image_path);
    }

    return "/no-image.png";
  };

  const formatRupiah = (value) => {
    const numericAmount =
      typeof value === "string"
        ? parseFloat(value.replace(/[^\d.-]/g, ""))
        : value;

    const safeAmount =
      isNaN(numericAmount) ||
        numericAmount === null ||
        numericAmount === undefined
        ? 0
        : numericAmount;

    return safeAmount.toLocaleString("id-ID");
  };

  const formatDate = (date) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("id-ID");
  };

  const getBarterStatusText = (status) => {
    if (status === "pending" || status === "seller_reviewing") {
      return "Menunggu Review";
    }

    if (status === "accepted") return "Disetujui";
    if (status === "payment_pending") return "Menunggu Bayar";
    if (status === "payment_confirmed") return "Bayar Dikonfirmasi";
    if (status === "completed") return "Selesai";
    if (status === "rejected") return "Ditolak";
    if (status === "cancelled") return "Dibatalkan";

    return status;
  };

  const getBarterStatusClass = (status) => {
    if (status === "completed") {
      return "bg-green-100 text-green-700";
    }

    if (status === "rejected" || status === "cancelled") {
      return "bg-red-100 text-red-700";
    }

    if (status === "accepted" || status === "payment_confirmed") {
      return "bg-blue-100 text-blue-700";
    }

    return "bg-yellow-100 text-yellow-700";
  };

  // tambahan analytics ringan
  const completedTransactions = transactions.filter(
    (item) => item.status === "completed"
  );

  const pendingTransactions = transactions.filter(
    (item) => item.status !== "completed"
  );

  const totalIncome = useMemo(() => {
    return completedTransactions.reduce((total, item) => {
      return total + Number(item.final_amount || 0);
    }, 0);
  }, [completedTransactions]);
  // gabungkan transaksi reguler + barter
  const latestActivities = useMemo(() => {
    const regularTransactions = transactions.map((item) => ({
      ...item,
      activity_type: "transaction",
      activity_date: item.created_at,
    }));

    const barterTransactions = barters.map((item) => ({
      ...item,
      activity_type: "barter",
      activity_date: item.created_at,
    }));

    return [...regularTransactions, ...barterTransactions]
      .sort(
        (a, b) =>
          new Date(b.activity_date) - new Date(a.activity_date)
      )
      .slice(0, 8);
  }, [transactions, barters]);
  const greeting = () => {
    const hour = currentTime.getHours();

    if (hour < 12) return "Selamat Pagi";
    if (hour < 15) return "Selamat Siang";
    if (hour < 18) return "Selamat Sore";

    return "Selamat Malam";
  };

  return (
    <div className="min-h-screen w-full bg-gray-50 overflow-x-hidden">
      {/* MOBILE HEADER */}
      <div className="md:hidden sticky top-0 z-20 bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-blue-500">
            Rather&apos;s
          </h1>

          <p className="text-xs text-gray-500">
            Seller Dashboard
          </p>
        </div>

      </div>

      <div className="flex">
        {/* SIDEBAR */}
        <div className="hidden md:flex w-64 bg-white border-r p-4 flex-col justify-between fixed h-screen overflow-y-auto z-10">
          <div>
            <h1
              className="text-2xl font-bold text-blue-500"
              style={{ letterSpacing: "2px" }}
            >
              Rather&apos;s
            </h1>

            <p className="text-sm text-gray-500 mb-4">
              Seller Dashboard
            </p>

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

        {/* CONTENT */}
        <div className="flex-1 md:ml-64 p-4 md:p-6 overflow-x-hidden">
          {/* HEADER */}
          <div className="hidden md:flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-primary">
                {greeting()},
                <span className="text-blue-600">
                  {" "}
                  {user?.name || " Seller"}
                </span>
              </h1>

              <p className="text-sm text-gray-500 mt-1">
                Kelola tokomu dengan mudah dan pantau aktivitas terbaru.
              </p>
            </div>

          </div>

          {/* STATISTIK */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-primary">
                Total Produk
              </h3>

              <p className="text-2xl font-bold text-blue-600">
                {myProducts.length}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Produk aktif di tokomu
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-primary">
                Transaksi
              </h3>

              <p className="text-2xl font-bold text-green-600">
                {transactions.length}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Total transaksi masuk
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-primary">
                Saldo Wallet
              </h3>

              <p className="text-2xl font-bold text-orange-600 break-words">
                Rp {formatRupiah(wallet.balance)}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Total saldo tersedia
              </p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-primary">
                Total Barter
              </h3>

              <p className="text-2xl font-bold text-purple-600">
                {barters.length}
              </p>

              <p className="text-xs text-gray-400 mt-2">
                Permintaan barter
              </p>
            </div>
          </div>

          {/* ANALYTICS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">
                Ringkasan Penjualan
              </h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Transaksi Selesai
                  </span>

                  <span className="font-bold text-green-600">
                    {completedTransactions.length}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    Transaksi Pending
                  </span>

                  <span className="font-bold text-yellow-600">
                    {pendingTransactions.length}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-gray-500">
                    Total Pendapatan
                  </span>

                  <span className="font-bold text-blue-600 text-right break-all">
                    Rp {formatRupiah(totalIncome)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold text-gray-700 mb-3">
                Aktivitas Barter
              </h3>

              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-500">
                  Total Permintaan
                </span>

                <span className="font-bold text-orange-600">
                  {barters.length}
                </span>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-orange-500 h-full"
                  style={{
                    width: `${barters.length > 0
                      ? Math.min(barters.length * 20, 100)
                      : 0
                      }%`,
                  }}
                />
              </div>

              <p className="text-xs text-gray-400 mt-3">
                Aktivitas barter tokomu
              </p>
            </div>

            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow p-5 text-white">
              <h3 className="font-semibold mb-2">
                Tips Seller Hari Ini!
              </h3>

              <ul className="text-sm space-y-2 opacity-95">
                <li>• Upload foto produk yang jelas</li>
                <li>• Balas transaksi lebih cepat</li>
                <li>• Tambahkan deskripsi produk detail</li>
                <li>• Aktif update produk setiap hari</li>
              </ul>
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="h-32 w-full rounded-lg bg-slate-200" />
                  <div className="mt-4 h-4 w-3/4 rounded-full bg-slate-200" />
                  <div className="mt-3 h-4 w-1/2 rounded-full bg-slate-200" />
                </div>
              ))}
            </div>
          )}

          {/* PRODUK */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-primary">
              Produk Terbaru
            </h2>

            <Link
              to="/products"
              className="text-sm text-blue-600 hover:underline"
            >
              Lihat Semua
            </Link>
          </div>
          {/* Tambahkan max-w-6xl atau max-w-7xl agar grid tidak melar tak terkendali di layar monitor besar */}
          <div className="w-full max-w-6xl grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
            {myProducts.slice(0, 4).map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="
        group
        h-full
        flex
        flex-col
        bg-white
        rounded-2xl
        border border-gray-200
        overflow-hidden
        shadow-sm
        hover:shadow-xl
        transition-all duration-300
      "
              >
                {/* IMAGE */}
                <div className="w-full aspect-[4/3] bg-gray-100 overflow-hidden">
                  <img
                    src={getImage(product)}
                    alt={product.title}
                    className="
            w-full
            h-full
            object-cover
            group-hover:scale-105
            transition-transform duration-300
          "
                  />
                </div>

                {/* CONTENT */}
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 min-h-[40px]">
                    {product.title}
                  </h3>

                  <p className="text-lg font-bold text-blue-600">
                    Rp {formatRupiah(product.price)}
                  </p>

                  <div className="mt-auto pt-1">
                    <p className="text-xs text-gray-500">
                      Status:
                      <span className="ml-1 font-medium text-gray-700">
                        {product.status || "Active"}
                      </span>
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-semibold text-primary">
                Aktivitas Terbaru
              </h2>

              <p className="text-xs text-gray-500">
                Penjualan reguler dan barter terbaru
              </p>
            </div>

            <Link
              to="/transactions"
              className="text-sm text-blue-600 hover:underline"
            >
              Lihat Semua
            </Link>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-hidden mb-10">
            <a href="http://localhost:5173/transactions">
              <div className="space-y-3">
                {latestActivities.map((item, index) => {
                  const isBarter = item.activity_type === "barter";

                  return (
                    <div
                      key={`${item.activity_type}-${item.id}-${index}`}
                      className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 border border-gray-100 rounded-xl p-4 hover:bg-gray-50 transition"
                    >
                      {/* LEFT */}
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`h-11 w-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 ${isBarter
                            ? "bg-orange-500"
                            : "bg-blue-500"
                            }`}
                        >
                          {isBarter ? "BT" : "TR"}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-sm text-gray-800 break-words">
                              {item.product?.title || "Produk"}
                            </p>

                            <span
                              className={`text-[11px] px-2 py-1 rounded-full font-semibold ${isBarter
                                ? "bg-orange-100 text-orange-700"
                                : "bg-blue-100 text-blue-700"
                                }`}
                            >
                              {isBarter
                                ? "Tukar Tambah"
                                : "Penjualan"}
                            </span>
                          </div>

                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(item.created_at)}
                          </p>

                          {isBarter ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-lg">
                                Ditawar:
                                <span className="font-medium ml-1">
                                  {item.offer_item_name || "-"}
                                </span>
                              </span>

                              <span
                                className={`text-xs font-semibold px-2 py-1 rounded-lg ${getBarterStatusClass(
                                  item.status
                                )}`}
                              >
                                {getBarterStatusText(item.status)}
                              </span>
                            </div>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-lg font-semibold">
                                Rp {formatRupiah(item.final_amount)}
                              </span>

                              <span
                                className={`text-xs px-2 py-1 rounded-lg font-semibold ${item.status === "completed"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-yellow-100 text-yellow-700"
                                  }`}
                              >
                                {item.status}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isBarter ? (
                          <span className="text-xs text-orange-600 font-semibold">
                            Aktivitas Barter
                          </span>
                        ) : (
                          <span className="text-xs text-blue-600 font-semibold">
                            Transaksi Reguler
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {!loading && latestActivities.length === 0 && (
                  <div className="py-10 text-center">
                    <div className="text-5xl mb-3">📦</div>

                    <p className="text-gray-500 font-medium">
                      Belum ada aktivitas transaksi
                    </p>

                    <p className="text-sm text-gray-400 mt-1">
                      Aktivitas penjualan dan barter akan muncul di sini
                    </p>
                  </div>
                )}
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}