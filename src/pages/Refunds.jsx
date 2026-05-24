import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import SidebarProfile from "../components/SidebarProfile";

const BASE_URL = "http://127.0.0.1:8000/api/v1";

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

const STATUS_FILTER = [
  { label: "Semua", value: "" },
  { label: "Pending", value: "pending" },
  { label: "Sedang Ditinjau", value: "seller_reviewing" },
  { label: "Disetujui", value: "seller_approved" },
  { label: "Ditolak", value: "seller_rejected" },
];

function getAuthHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatRupiah(amount) {
  const numericAmount = typeof amount === "string" ? parseFloat(amount.replace(/[^\d.-]/g, "")) : amount;
  const safeAmount = isNaN(numericAmount) || numericAmount === null || numericAmount === undefined ? 0 : numericAmount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStorageUrl(path) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `http://127.0.0.1:8000/storage/${path}`;
}

async function getSellerRefunds(status) {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  const res = await fetch(`${BASE_URL}/seller/refunds${query}`, {
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal memuat data refund.");
  }

  return json;
}

async function reviewSellerRefund(refundId) {
  const res = await fetch(`${BASE_URL}/seller/refunds/${refundId}/review`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal memulai review.");
  }

  return json;
}

async function approveSellerRefund(refundId) {
  const res = await fetch(`${BASE_URL}/seller/refunds/${refundId}/approve`, {
    method: "POST",
    headers: getAuthHeaders(),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal menyetujui refund.");
  }

  return json;
}

async function rejectSellerRefund(refundId, note) {
  const res = await fetch(`${BASE_URL}/seller/refunds/${refundId}/reject`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      seller_note: note,
    }),
  });

  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal menolak refund.");
  }

  return json;
}

function StatusBadge({ status }) {
  const map = {
    pending: {
      label: "Menunggu Tindakan",
      className: "bg-amber-100 text-amber-800",
    },
    seller_reviewing: {
      label: "Sedang Ditinjau",
      className: "bg-blue-100 text-blue-800",
    },
    seller_approved: {
      label: "Disetujui",
      className: "bg-green-100 text-green-800",
    },
    seller_rejected: {
      label: "Ditolak",
      className: "bg-red-100 text-red-700",
    },
    admin_reviewing: {
      label: "Review Admin",
      className: "bg-purple-100 text-purple-800",
    },
    rejected: {
      label: "Ditolak Admin",
      className: "bg-red-100 text-red-700",
    },
    processed: {
      label: "Selesai",
      className: "bg-gray-100 text-gray-700",
    },
  };

  const item = map[status] || {
    label: status,
    className: "bg-gray-100 text-gray-700",
  };

  return (
    <span className={`px-2.5 py-1 font-bold text-xs rounded-lg ${item.className}`}>
      {item.label}
    </span>
  );
}

export default function Refunds() {
  const pathname = useLocation().pathname;

  const [user, setUser] = useState(null);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  const [rejectModal, setRejectModal] = useState({
    open: false,
    refundId: null,
  });
  const [rejectNote, setRejectNote] = useState("");
  const [rejectNoteError, setRejectNoteError] = useState("");

  useEffect(() => {
    const userStr = localStorage.getItem("current_user");

    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }
  }, []);

  const showToast = (msg, type) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchRefunds = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await getSellerRefunds(activeFilter || undefined);
      setRefunds(res.data?.data || []);
    } catch (err) {
      setError(err.message || "Gagal memuat data refund.");
    } finally {
      setLoading(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchRefunds();
  }, [fetchRefunds]);

  const handleReview = async (refundId) => {
    if (!confirm("Mulai proses review refund ini?")) return;

    setActionLoading(refundId);

    try {
      const res = await reviewSellerRefund(refundId);
      showToast(res.message, "success");
      setRefunds((prev) => prev.map((r) => (r.id === refundId ? res.data : r)));
    } catch (err) {
      showToast(err.message || "Gagal memulai review.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprove = async (refundId) => {
    if (
      !confirm(
        "Apakah Anda yakin ingin MENYETUJUI refund ini? Dana akan dikurangi dari saldo Anda."
      )
    ) {
      return;
    }

    setActionLoading(refundId);

    try {
      const res = await approveSellerRefund(refundId);
      showToast(res.message, "success");
      setRefunds((prev) => prev.map((r) => (r.id === refundId ? res.data : r)));
    } catch (err) {
      showToast(err.message || "Gagal menyetujui refund.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectModal = (refundId) => {
    setRejectNote("");
    setRejectNoteError("");
    setRejectModal({ open: true, refundId });
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      setRejectNoteError("Alasan penolakan wajib diisi.");
      return;
    }

    const refundId = rejectModal.refundId;

    setActionLoading(refundId);
    setRejectModal({ open: false, refundId: null });

    try {
      const res = await rejectSellerRefund(refundId, rejectNote.trim());
      showToast(res.message, "success");
      setRefunds((prev) => prev.map((r) => (r.id === refundId ? res.data : r)));
    } catch (err) {
      showToast(err.message || "Gagal menolak refund.", "error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex min-h-screen w-screen bg-white">
      {toast && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-xl shadow-lg text-white text-sm font-semibold ${
            toast.type === "success" ? "bg-green-500" : "bg-red-500"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {rejectModal.open && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              Tolak Refund
            </h2>

            <p className="text-sm text-gray-500 mb-4">
              Jelaskan alasan penolakan kepada pembeli. Pembeli bisa
              mengeskalasi ke admin jika tidak setuju.
            </p>

            <textarea
              rows={4}
              value={rejectNote}
              onChange={(e) => {
                setRejectNote(e.target.value);
                setRejectNoteError("");
              }}
              placeholder="Contoh: Barang sudah diterima dalam kondisi baik sesuai foto packing..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
            />

            {rejectNoteError && (
              <p className="text-xs text-red-500 mt-1">{rejectNoteError}</p>
            )}

            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => setRejectModal({ open: false, refundId: null })}
                className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                onClick={handleReject}
                className="px-5 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600"
              >
                Kirim Penolakan
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="w-64 bg-white border-r p-4 hidden md:flex flex-col justify-between fixed h-screen overflow-y-auto z-10">
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
              const external = item.href.startsWith("http");

              if (external) {
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
                    pathname === item.href
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

        <div className="space-y-2">
          <SidebarProfile user={user} />
        </div>
      </div>

      <div className="ml-64 flex-1 p-4 md:p-6 overflow-y-auto bg-gray-50">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Manajemen Refund
            </h1>
            <p className="text-slate-500 mt-1">
              Tinjau dan proses keluhan dari pembeli untuk menjaga rating toko
              Anda.
            </p>
          </div>

          <button
            onClick={fetchRefunds}
            disabled={loading}
            className="text-sm font-semibold text-blue-600 border border-blue-200 rounded-xl px-4 py-2 hover:bg-blue-50 disabled:opacity-50 transition"
          >
            {loading ? "Memuat…" : "↻ Refresh"}
          </button>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_FILTER.map((f) => (
            <button
              key={f.value}
              onClick={() => setActiveFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
                activeFilter === f.value
                  ? "bg-blue-500 text-white shadow"
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
          </div>
        ) : error ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-red-100 shadow-sm">
            <p className="text-red-500 font-semibold">{error}</p>
            <button
              onClick={fetchRefunds}
              className="mt-4 text-sm text-blue-500 underline"
            >
              Coba lagi
            </button>
          </div>
        ) : refunds.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">
              Tidak ada pengajuan refund
            </h3>
            <p className="text-gray-500 mt-2">
              Semua pembeli puas dengan produk Anda!
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {refunds.map((r) => {
              const isActing = actionLoading === r.id;
              const productImg = r.transaction?.product?.images?.[0]?.image_url;

              return (
                <div
                  key={r.id}
                  className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm"
                >
                  <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-mono font-bold text-sm text-gray-500">
                        #{r.id}
                      </span>

                      <StatusBadge status={r.status} />

                      {r.is_escalated && (
                        <span className="px-2.5 py-1 bg-purple-100 text-purple-800 font-bold text-xs rounded-lg">
                          Dieskalasi ke Admin
                        </span>
                      )}
                    </div>

                    <span className="font-medium text-sm text-gray-400">
                      {formatDate(r.created_at)}
                    </span>
                  </div>

                  <div className="p-6 md:flex gap-8">
                    <div className="flex-1 space-y-4">
                      {productImg && (
                        <img
                          src={getStorageUrl(productImg)}
                          alt="Produk"
                          className="w-20 h-20 rounded-2xl object-cover border border-gray-100 shadow-sm"
                        />
                      )}

                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Pembeli
                        </p>
                        <p className="font-bold text-gray-900 mt-0.5">
                          {r.buyer?.name ?? `User #${r.buyer_id}`}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Produk
                        </p>
                        <p className="font-bold text-blue-600 mt-0.5">
                          {r.transaction?.product?.name ??
                            `Transaksi #${r.transaction_id}`}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Dana Ditahan
                        </p>
                        <p className="font-black text-lg text-gray-900 mt-0.5">
                          {formatRupiah(r.refund_amount)}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                          Rekening Tujuan
                        </p>
                        <p className="text-sm text-gray-700 mt-0.5">
                          {r.refund_bank} · {r.refund_account}
                        </p>
                        <p className="text-xs text-gray-500">
                          {r.refund_holder}
                        </p>
                      </div>
                    </div>

                    <div className="flex-[2] bg-orange-50 rounded-2xl border border-orange-100 p-5 mt-6 md:mt-0">
                      <span className="inline-block bg-orange-200 text-orange-800 text-xs font-bold px-2 py-1 rounded-md mb-2">
                        {r.reason}
                      </span>

                      {r.description && (
                        <p className="text-sm font-medium text-gray-800 leading-relaxed">
                          &ldquo;{r.description}&rdquo;
                        </p>
                      )}

                      {r.evidence_images?.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-orange-200/50">
                          <p className="text-xs font-bold text-gray-500 mb-2">
                            Foto Bukti:
                          </p>

                          <div className="flex gap-2 flex-wrap">
                            {r.evidence_images.map((img, i) => (
                              <a
                                key={i}
                                href={getStorageUrl(img)}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <img
                                  src={getStorageUrl(img)}
                                  alt={`Bukti ${i + 1}`}
                                  className="w-16 h-16 rounded-xl object-cover border-2 border-white shadow-sm hover:scale-105 transition-transform"
                                />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {r.seller_note && (
                        <div className="mt-4 pt-4 border-t border-orange-200/50">
                          <p className="text-xs font-bold text-gray-500 mb-1">
                            Catatan Anda:
                          </p>
                          <p className="text-sm text-gray-700">
                            {r.seller_note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 px-6 py-4 bg-white flex justify-end gap-3 flex-wrap">
                    {isActing ? (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500" />
                        Memproses…
                      </div>
                    ) : r.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleReview(r.id)}
                          className="px-5 py-2.5 rounded-xl border-2 border-blue-200 text-blue-600 font-bold text-sm bg-white hover:bg-blue-50"
                        >
                          Mulai Review
                        </button>

                        <button
                          onClick={() => openRejectModal(r.id)}
                          className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm bg-white hover:bg-gray-50"
                        >
                          Tolak Refund
                        </button>

                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm hover:bg-orange-600"
                        >
                          Setujui & Kembalikan Dana
                        </button>
                      </>
                    ) : r.status === "seller_reviewing" ? (
                      <>
                        <button
                          onClick={() => openRejectModal(r.id)}
                          className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-gray-600 font-bold text-sm bg-white hover:bg-gray-50"
                        >
                          Tolak Refund
                        </button>

                        <button
                          onClick={() => handleApprove(r.id)}
                          className="px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-sm shadow-sm hover:bg-orange-600"
                        >
                          Setujui & Kembalikan Dana
                        </button>
                      </>
                    ) : r.status === "seller_approved" ? (
                      <span className="px-4 py-2 bg-green-50 text-green-700 font-bold text-sm rounded-xl">
                        ✓ Dana telah dikembalikan
                      </span>
                    ) : r.status === "seller_rejected" ? (
                      <span className="px-4 py-2 bg-red-50 text-red-700 font-bold text-sm rounded-xl">
                        ✗ Refund ditolak
                        {r.is_escalated && " · Dieskalasi ke Admin"}
                      </span>
                    ) : r.status === "admin_reviewing" ? (
                      <span className="px-4 py-2 bg-purple-50 text-purple-700 font-bold text-sm rounded-xl">
                        Admin sedang meninjau
                      </span>
                    ) : (
                      <span className="px-4 py-2 bg-gray-50 text-gray-700 font-bold text-sm rounded-xl capitalize">
                        {r.status}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}