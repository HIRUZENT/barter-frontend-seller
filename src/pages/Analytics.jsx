import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import SidebarProfile from "../components/SidebarProfile";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";

const BASE_URL = "http://127.0.0.1:8000/api/v1";
const STORAGE_URL = "http://127.0.0.1:8000";
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

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

// ── helpers ────────────────────────────────────────────────────────────────
function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

function resolveImg(path) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const p = path.replace(/^\//, "");
  return p.startsWith("storage/")
    ? `${STORAGE_URL}/${p}`
    : `${STORAGE_URL}/storage/${p}`;
}

// ── sub-components ─────────────────────────────────────────────────────────
function StatCard({ label, value, sub, color = "blue", icon }) {
  const colors = {
    blue: "from-blue-500 to-blue-700",
    green: "from-emerald-500 to-emerald-700",
    amber: "from-amber-400 to-amber-600",
    purple: "from-purple-500 to-purple-700",
  };
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${colors[color]} p-5 text-white shadow-lg`}>
      <div className="text-4xl mb-1 opacity-20 absolute right-4 top-3">{icon}</div>
      <p className="text-sm font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="mt-1 text-xs opacity-75">{sub}</p>}
    </div>
  );
}

function Skeleton({ h = "h-40" }) {
  return <div className={`${h} w-full animate-pulse rounded-xl bg-slate-100`} />;
}

const RADIAN = Math.PI / 180;
function renderCustomLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }) {
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  if (percent < 0.05) return null;
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl bg-slate-900 text-white px-3 py-2 shadow-xl text-xs">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <h2 className="mt-8 mb-4 text-lg font-bold text-slate-800 flex items-center gap-2">
      <span className="inline-block w-1 h-5 rounded bg-blue-500" />
      {children}
    </h2>
  );
}

// ── main page ──────────────────────────────────────────────────────────────
export default function Analytics() {
  const location = useLocation();
  const pathname = location.pathname;

  const user = JSON.parse(localStorage.getItem("current_user") || "null");

  const [overview, setOverview] = useState(null);
  const [dailyViews, setDailyViews] = useState([]);
  const [hourlyViews, setHourlyViews] = useState([]);
  const [monthlyViews, setMonthlyViews] = useState([]);
  const [revenueDaily, setRevenueDaily] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [devices, setDevices] = useState([]);
  const [days, setDays] = useState(14);
  const [year, setYear] = useState(new Date().getFullYear());
  const [selectedProductId, setSelectedProductId] = useState("");
  const [productViews, setProductViews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ovRes, dailyRes, hourlyRes, monthlyRes, topRes, devRes, revRes] = await Promise.all([
        fetch(`${BASE_URL}/seller/analytics/overview`, { headers: getAuthHeaders() }),
        fetch(`${BASE_URL}/seller/analytics/views/daily?days=${days}`, { headers: getAuthHeaders() }),
        fetch(`${BASE_URL}/seller/analytics/views/hourly?days=${days}`, { headers: getAuthHeaders() }),
        fetch(`${BASE_URL}/seller/analytics/views/monthly?year=${year}`, { headers: getAuthHeaders() }),
        fetch(`${BASE_URL}/seller/analytics/products/top?days=${days}&limit=5`, { headers: getAuthHeaders() }),
        fetch(`${BASE_URL}/seller/analytics/devices?days=${days}`, { headers: getAuthHeaders() }),
        fetch(`${BASE_URL}/seller/analytics/revenue/daily?days=${days}`, { headers: getAuthHeaders() }),
      ]);

      const [ovJson, dailyJson, hourlyJson, monthlyJson, topJson, devJson, revJson] = await Promise.all([
        ovRes.json(), dailyRes.json(), hourlyRes.json(), monthlyRes.json(), topRes.json(), devRes.json(), revRes.json(),
      ]);

      if (ovJson.success) setOverview(ovJson.data);
      if (dailyJson.success) setDailyViews(dailyJson.data?.chart || []);
      if (hourlyJson.data) setHourlyViews(hourlyJson.data?.chart || []);
      if (monthlyJson.data) setMonthlyViews(monthlyJson.data?.chart || []);
      if (topJson.data) {
        const products = topJson.data?.products || [];
        setTopProducts(products);
        if (products.length > 0 && !selectedProductId) setSelectedProductId(String(products[0].product_id));
      }
      if (devJson.data) setDevices(devJson.data?.devices || []);
      if (revJson.data) setRevenueDaily(revJson.data?.chart || []);
    } catch (err) {
      console.error("Analytics fetch error:", err);
      setError("Gagal memuat data analitik. Pastikan server berjalan.");
    } finally {
      setLoading(false);
    }
  }, [days, year]);

  // Fetch views per produk ketika selectedProductId berubah
  useEffect(() => {
    if (!selectedProductId) return;
    fetch(`${BASE_URL}/seller/analytics/products/${selectedProductId}/views?days=${days}`, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((j) => { if (j.data) setProductViews(j.data?.chart || []); })
      .catch(console.error);
  }, [selectedProductId, days]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  return (
    <div className="flex min-h-screen w-full bg-white">
      {/* ── Sidebar (SAMA persis dengan Dashboard) ── */}
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

      {/* ── Konten Analitik ── */}
      <div className="ml-64 flex-1 overflow-y-auto bg-gray-50">
        {/* Sub-header */}
        <div className="bg-white border-b px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Analitik Penjual</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Pantau performa produk, views, dan pendapatan secara real-time.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {[7, 14, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-all border ${
                  days === d
                    ? "bg-blue-500 text-white border-blue-500 shadow"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {d} Hari
              </button>
            ))}
            <button
              onClick={fetchAll}
              className="rounded-full border border-gray-200 bg-white px-4 py-1.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="px-6 pb-12">
          {/* Error */}
          {error && (
            <div className="mt-6 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
              ⚠️ {error}
            </div>
          )}

          {/* ── Stat Cards ── */}
          <SectionTitle>Ringkasan Performa</SectionTitle>
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} h="h-24" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Total Views"
                value={fmt(overview?.views?.total)}
                sub={`Hari ini: ${fmt(overview?.views?.today)}`}
                color="blue"
                icon="👁️"
              />
              <StatCard
                label="Total Pesanan"
                value={fmt(overview?.orders?.total)}
                sub={`Selesai: ${overview?.orders?.completed ?? 0}`}
                color="green"
                icon="🛒"
              />
              <StatCard
                label="Pendapatan Bulan Ini"
                value={`Rp ${fmt(overview?.revenue?.this_month)}`}
                sub={`+${overview?.revenue?.growth ?? 0}% vs bulan lalu`}
                color="amber"
                icon="💰"
              />
              <StatCard
                label="Produk Aktif"
                value={`${overview?.products?.active ?? 0} / ${overview?.products?.total ?? 0}`}
                sub={`Saldo: Rp ${fmt(overview?.revenue?.balance)}`}
                color="purple"
                icon="📦"
              />
            </div>
          )}

          {/* ── Views Harian ── */}
          <SectionTitle>Views Harian</SectionTitle>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Jumlah views per hari ({days} hari terakhir)
            </p>
            {loading ? (
              <Skeleton h="h-52" />
            ) : dailyViews.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-14">Belum ada data views.</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={dailyViews} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="views" name="Views" stroke="#3b82f6" strokeWidth={2.5}
                    dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Hourly & Device ── */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Hourly */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <p className="mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Distribusi Views per Jam
              </p>
              {loading ? (
                <Skeleton h="h-52" />
              ) : hourlyViews.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-14">Belum ada data.</p>
              ) : (
                <>
                  {(() => {
                    const peak = [...hourlyViews].sort((a, b) => b.views - a.views)[0];
                    return peak ? (
                      <p className="mb-3 text-xs text-slate-500">
                        Jam paling ramai:{" "}
                        <span className="font-semibold text-blue-600">{peak.label}</span>{" "}
                        ({fmt(peak.views)} views)
                      </p>
                    ) : null;
                  })()}
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={hourlyViews} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} interval={3} />
                      <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="views" name="Views" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* Device */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
              <p className="mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Device Buyer
              </p>
              {loading ? (
                <Skeleton h="h-52" />
              ) : devices.length === 0 ? (
                <p className="text-center text-sm text-slate-400 py-14">Belum ada data.</p>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={devices} dataKey="views" nameKey="device" cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90} paddingAngle={3}
                      labelLine={false} label={renderCustomLabel}>
                      {devices.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [`${fmt(v)} views`, n]}
                      contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                    <Legend formatter={(value, entry) =>
                      `${value} (${entry.payload.percentage ?? 0}%)`}
                      iconType="circle" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* ── Top Products ── */}
          <SectionTitle>Top Produk (berdasarkan views)</SectionTitle>
          {loading ? (
            <div className="space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} h="h-16" />)}</div>
          ) : topProducts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">Belum ada data produk.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((product, idx) => {
                const max = topProducts[0]?.views || 1;
                const pct = Math.round(((product.views || 0) / max) * 100);
                const imgSrc = resolveImg(product.image);
                return (
                  <div key={product.product_id ?? idx}
                    className="flex items-center gap-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition">
                    <div className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold ${
                      idx === 0 ? "bg-amber-400 text-white" :
                      idx === 1 ? "bg-slate-300 text-white" :
                      idx === 2 ? "bg-orange-400 text-white" : "bg-slate-100 text-slate-500"
                    }`}>{idx + 1}</div>

                    {imgSrc ? (
                      <img src={imgSrc} alt={product.title}
                        className="w-12 h-12 rounded-xl object-cover flex-shrink-0 border border-slate-100" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 text-xl">📦</div>
                    )}

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{product.title}</p>
                      <p className="text-xs text-slate-400">{product.category} · Rp {fmt(Number(product.price))}</p>
                      <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full bg-blue-500 transition-all duration-700"
                          style={{ width: `${pct}%` }} />
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-base font-extrabold text-blue-600">{fmt(product.views)}</p>
                      <p className="text-xs text-slate-400">views {days}h</p>
                      <p className="text-xs text-slate-400">total: {fmt(product.total_views)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Mini stats views ── */}
          {!loading && overview?.views && (
            <>
              <SectionTitle>Ringkasan Views</SectionTitle>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Hari Ini", value: overview.views.today },
                  { label: "Minggu Ini", value: overview.views.this_week },
                  { label: "Bulan Ini", value: overview.views.this_month },
                  { label: "Bulan Lalu", value: overview.views.last_month },
                ].map((item) => (
                  <div key={item.label} className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 text-center">
                    <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                    <p className="text-2xl font-extrabold text-slate-800 mt-1">{fmt(item.value)}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Views Bulanan ── */}
          <SectionTitle>Views Bulanan</SectionTitle>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Views per bulan (tahun {year})</p>
              <div className="flex gap-2">
                {[new Date().getFullYear() - 1, new Date().getFullYear()].map((y) => (
                  <button key={y} onClick={() => setYear(y)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold border transition ${
                      year === y ? "bg-blue-500 text-white border-blue-500" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                    }`}>{y}</button>
                ))}
              </div>
            </div>
            {loading ? <Skeleton h="h-52" /> : monthlyViews.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-14">Belum ada data bulanan.</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={monthlyViews} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="views" name="Views" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Pendapatan Harian ── */}
          <SectionTitle>Pendapatan Harian</SectionTitle>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <p className="mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grafik pendapatan per hari ({days} hari terakhir)</p>
            {loading ? <Skeleton h="h-52" /> : revenueDaily.length === 0 ? (
              <p className="text-center text-sm text-slate-400 py-14">Belum ada data pendapatan.</p>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={revenueDaily} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false}
                    tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} formatter={(v) => [`Rp ${fmt(v)}`, "Pendapatan"]} />
                  <Line type="monotone" dataKey="revenue" name="Pendapatan" stroke="#f59e0b" strokeWidth={2.5}
                    dot={{ r: 3, fill: "#f59e0b", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Views Per Produk ── */}
          {topProducts.length > 0 && (
            <>
              <SectionTitle>Views per Produk</SectionTitle>
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pilih produk:</p>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {topProducts.map((p) => (
                      <option key={p.product_id} value={String(p.product_id)}>{p.title}</option>
                    ))}
                  </select>
                </div>
                {productViews.length === 0 ? (
                  <p className="text-center text-sm text-slate-400 py-10">Belum ada data views untuk produk ini.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={210}>
                    <LineChart data={productViews} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} tickLine={false} axisLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Line type="monotone" dataKey="views" name="Views" stroke="#8b5cf6" strokeWidth={2.5}
                        dot={{ r: 3, fill: "#8b5cf6", strokeWidth: 0 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
