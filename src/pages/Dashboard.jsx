import { useEffect, useState } from "react";
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
    return Number(value || 0).toLocaleString("id-ID");
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

  return (
    <div className="flex min-h-screen w-screen bg-white">
      <div className="w-64 bg-white border-r p-4 flex flex-col justify-between">
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                    isActive
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

      <div className="flex-1 p-6 overflow-y-auto bg-gray-50">
        <h1 className="text-2xl font-bold text-primary mb-6">
          Dashboard Penjual
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-primary">Total Produk</h3>
            <p className="text-2xl font-bold text-blue-600">
              {myProducts.length}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-primary">Transaksi</h3>
            <p className="text-2xl font-bold text-green-600">
              {transactions.length}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-primary">Saldo Wallet</h3>
            <p className="text-2xl font-bold text-orange-600">
              Rp {formatRupiah(wallet.balance)}
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-primary">Iklan Aktif</h3>
            <p className="text-2xl font-bold text-purple-600">
              {ads.filter((ad) => ad.status === "active").length}
            </p>
          </div>
        </div>

        {loading && <p className="text-primary pb-4">Loading...</p>}

        <h2 className="font-semibold mb-3 text-primary">Produk Terbaru</h2>

        <div className="flex gap-4 overflow-x-auto pb-2 mb-8">
          {myProducts.slice(0, 5).map((product) => (
            <Link
              key={product.id}
              to={`/product/${product.id}`}
              className="min-w-[240px] max-w-[240px] flex flex-col bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg hover:-translate-y-1 transition"
            >
              <div className="w-full h-[140px] bg-gray-100 overflow-hidden">
                <img
                  src={getImage(product)}
                  alt={product.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="p-3 flex flex-col gap-1 flex-1">
                <p className="text-sm font-semibold text-primary line-clamp-2">
                  {product.title}
                </p>

                <p className="text-blue-600 font-bold text-sm">
                  Rp {formatRupiah(product.price)}
                </p>

                <p className="text-xs text-gray-500 mt-auto">
                  Status:{" "}
                  <span className="font-medium text-gray-700">
                    {product.status || "Active"}
                  </span>
                </p>
              </div>
            </Link>
          ))}
        </div>

        <h2 className="font-semibold mb-3 text-primary">Transaksi Terbaru</h2>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="space-y-2">
            {transactions.slice(0, 5).map((transaction) => (
              <div
                key={`tx-${transaction.id}`}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {transaction.product?.title || "Product"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(transaction.created_at)}
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-sm font-semibold">
                    Rp {formatRupiah(transaction.final_amount)}
                  </p>
                  <p
                    className={`text-xs ${
                      transaction.status === "completed"
                        ? "text-green-600"
                        : "text-yellow-600"
                    }`}
                  >
                    {transaction.status}
                  </p>
                </div>
              </div>
            ))}

            {barters.slice(0, 3).map((barter) => (
              <div
                key={`barter-${barter.id}`}
                className="flex justify-between items-center border-b pb-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    <span className="inline-block bg-orange-100 text-orange-700 text-xs font-bold px-1.5 py-0.5 rounded mr-1">
                      Barter
                    </span>
                    {barter.product?.title || "Produk"}
                  </p>

                  <p className="text-xs text-gray-500">
                    Ditawar:{" "}
                    <span className="font-medium text-gray-700">
                      {barter.offer_item_name}
                    </span>{" "}
                    • {formatDate(barter.created_at)}
                  </p>
                </div>

                <div className="text-right">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${getBarterStatusClass(
                      barter.status
                    )}`}
                  >
                    {getBarterStatusText(barter.status)}
                  </span>
                </div>
              </div>
            ))}

            {!loading && transactions.length === 0 && barters.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                Belum ada transaksi
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}