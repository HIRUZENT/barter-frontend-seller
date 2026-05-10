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
  { name: "Pindah ke halaman pembeli", href: "http://localhost:3000/" },
];

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
}

function getStatusColor(status) {
  switch (status) {
    case "cod_waiting":
    case "pending":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "payment_confirmed":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "processing":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "shipped":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "delivered":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "cod_completed":
    case "completed":
      return "bg-green-100 text-green-800 border-green-200";
    case "refund_requested":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "cancelled":
      return "bg-red-100 text-red-800 border-red-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

function getStatusText(status) {
  switch (status) {
    case "cod_waiting":
      return "Menunggu COD";
    case "cod_completed":
      return "COD Selesai";
    case "pending":
      return "Menunggu Pembayaran";
    case "payment_confirmed":
      return "Pembayaran Dikonfirmasi";
    case "processing":
      return "Sedang Diproses";
    case "shipped":
      return "Sedang Dikirim";
    case "delivered":
      return "Terkirim";
    case "completed":
      return "Selesai";
    case "refund_requested":
      return "Refund Diajukan";
    case "cancelled":
      return "Dibatalkan";
    default:
      return status;
  }
}

function getProductImage(transaction) {
  if (transaction.product?.images?.length > 0) {
    return `http://127.0.0.1:8000/storage/${transaction.product.images[0].image_path}`;
  }
  return null;
}

function TrackingModal({ onConfirm, onClose }) {
  const [tracking, setTracking] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="font-bold text-gray-800 mb-1">Masukkan Nomor Resi</h3>
        <p className="text-sm text-gray-500 mb-4">
          Nomor resi pengiriman untuk pembeli.
        </p>

        <input
          type="text"
          placeholder="cth: JNE123456789"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 mb-4"
        />

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-xl hover:bg-gray-50 transition"
          >
            Batal
          </button>

          <button
            onClick={() => tracking.trim() && onConfirm(tracking.trim())}
            disabled={!tracking.trim()}
            className="flex-1 py-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-bold rounded-xl transition"
          >
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
}

function StarInput({ value, onChange }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(star)}
          className="transition-transform hover:scale-110 focus:outline-none"
        >
          <svg
            className={`w-10 h-10 transition-colors ${
              star <= (hover || value) ? "text-yellow-400" : "text-gray-200"
            }`}
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
    </div>
  );
}

const STAR_LABELS = {
  1: "Sangat Buruk 😞",
  2: "Kurang Baik 😕",
  3: "Cukup 😐",
  4: "Baik 😊",
  5: "Sangat Baik 🤩",
};

function SellerRatingModal({ transaction, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (rating === 0) {
      setError("Pilih rating bintang terlebih dahulu.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const res = await fetch(`${BASE_URL}/ratings`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          transaction_id: transaction.id,
          type: "seller_to_buyer",
          rating,
          review: review.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (json.success) {
        onSuccess(transaction.id);
      } else {
        setError(json.message || "Gagal mengirim rating.");
      }
    } catch {
      setError("Terjadi kesalahan. Coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Beri Rating Pembeli ⭐
            </h2>
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">
              {transaction.product?.title ??
                `Transaksi #${transaction.transaction_code}`}
            </p>

            {transaction.buyer && (
              <p className="text-xs text-gray-400 mt-0.5">
                Pembeli:{" "}
                <span className="font-semibold text-gray-600">
                  {transaction.buyer.name}
                </span>
              </p>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition ml-2 flex-shrink-0"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="text-center py-2">
            <p className="text-sm font-semibold text-gray-700 mb-4">
              Bagaimana pengalaman transaksi dengan pembeli ini?
            </p>

            <div className="flex justify-center">
              <StarInput value={rating} onChange={setRating} />
            </div>

            <div className="h-7 mt-3">
              {rating > 0 && (
                <p className="text-base font-bold text-yellow-500">
                  {STAR_LABELS[rating]}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Ulasan{" "}
              <span className="text-gray-400 font-normal">(opsional)</span>
            </label>

            <textarea
              rows={3}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Ceritakan pengalaman transaksi dengan pembeli ini..."
              maxLength={1000}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
            />

            <p className="text-xs text-gray-400 mt-1 text-right">
              {review.length}/1000
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border-2 border-gray-200 text-gray-600 font-bold text-sm rounded-2xl hover:bg-gray-50 transition"
          >
            Nanti Saja
          </button>

          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 py-3 bg-yellow-400 hover:bg-yellow-500 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition flex items-center justify-center gap-2"
          >
            {submitting && (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            {submitting ? "Mengirim..." : "⭐ Kirim Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}

function BarterSellerList() {
  const [barters, setBarters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [actionModal, setActionModal] = useState(null);
  const [sellerNote, setSellerNote] = useState("");
  const [additionalPrice, setAdditionalPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchBarters = useCallback(async () => {
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/seller/barter`, {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (json.success) {
        setBarters(json.data?.data || json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBarters();
  }, [fetchBarters]);

  const handleAction = async () => {
    if (!actionModal) return;

    setSubmitting(true);

    try {
      const url = `${BASE_URL}/seller/barter/${actionModal.id}/${actionModal.type}`;
      const body = { seller_note: sellerNote };

      if (actionModal.type === "accept" && additionalPrice) {
        body.offer_additional_price = parseInt(additionalPrice, 10);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success) {
        setActionModal(null);
        setSellerNote("");
        setAdditionalPrice("");
        fetchBarters();
      } else {
        alert(json.message || "Gagal memproses barter.");
      }
    } catch {
      alert("Kesalahan jaringan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id) => {
    if (!confirm("Konfirmasi bahwa pertemuan COD telah selesai dan barang ditukar?")) {
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/seller/barter/${id}/complete`, {
        method: "POST",
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (json.success) {
        fetchBarters();
      } else {
        alert("Gagal menyelesaikan barter.");
      }
    } catch {
      alert("Kesalahan jaringan.");
    }
  };

  const barterFilters = [
    { label: "Semua", value: "all" },
    { label: "Menunggu", value: "pending" },
    { label: "Menunggu Bayar Pembeli", value: "payment_pending" },
    { label: "Selesai / Setuju COD", value: "completed" },
    { label: "Ditolak / Batal", value: "cancelled" },
  ];

  const filtered =
    filter === "all"
      ? barters
      : barters.filter((b) => {
          if (filter === "pending") {
            return ["pending", "seller_reviewing"].includes(b.status);
          }

          if (filter === "completed") {
            return ["payment_confirmed", "accepted", "completed"].includes(
              b.status
            );
          }

          if (filter === "cancelled") {
            return ["cancelled", "rejected"].includes(b.status);
          }

          return b.status === filter;
        });

  const getStatusInfo = (status) => {
    switch (status) {
      case "pending":
      case "seller_reviewing":
        return { text: "Perlu Direview", color: "bg-yellow-100 text-yellow-800" };
      case "accepted":
        return { text: "Disetujui", color: "bg-blue-100 text-blue-800" };
      case "payment_pending":
        return { text: "Menunggu Bayar Selisih", color: "bg-orange-100 text-orange-800" };
      case "payment_confirmed":
        return { text: "Pembayaran Dikonfirmasi", color: "bg-blue-100 text-blue-800" };
      case "completed":
        return { text: "Selesai", color: "bg-green-100 text-green-800" };
      case "cancelled":
        return { text: "Dibatalkan Pembeli", color: "bg-red-100 text-red-800" };
      case "rejected":
        return { text: "Anda Tolak", color: "bg-red-100 text-red-800" };
      default:
        return { text: status, color: "bg-gray-100 text-gray-800" };
    }
  };

  return (
    <div className="mt-4">
      <div className="flex gap-2 mb-6 flex-wrap">
        {barterFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition ${
              filter === f.value
                ? "bg-blue-500 text-white shadow"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin h-8 w-8 border-b-2 border-blue-600 rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
          <h3 className="text-gray-500">
            Belum ada pengajuan barter dari pembeli.
          </h3>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((b) => {
            const statusInfo = getStatusInfo(b.status);

            let images = [];
            try {
              if (b.offer_images) images = JSON.parse(b.offer_images);
            } catch {}

            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-5"
              >
                <div className="flex-shrink-0 flex justify-center md:justify-start">
                  {b.product?.images?.length > 0 ? (
                    <img
                      src={`http://127.0.0.1:8000/storage/${b.product.images[0].image_path}`}
                      alt={b.product?.title || "Produk"}
                      className="rounded-xl object-cover border border-gray-100 h-28 w-28 md:h-24 md:w-24"
                    />
                  ) : (
                    <div className="rounded-xl bg-gray-100 border border-gray-200 h-28 w-28 md:h-24 md:w-24 flex items-center justify-center">
                      <span className="text-gray-300 text-4xl">▧</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-1 rounded-md text-xs font-bold ${statusInfo.color}`}
                    >
                      {statusInfo.text}
                    </span>
                    <p className="text-xs text-gray-400 font-mono">
                      ID: {b.id} • Dibuat:{" "}
                      {new Date(b.created_at).toLocaleDateString("id-ID")}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-500">
                      Barang Anda yang diincar:
                    </p>
                    <p className="font-bold text-gray-800">
                      {b.product?.title}
                    </p>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Tawaran Pembeli
                    </p>
                    <h3 className="font-bold text-lg text-gray-800">
                      {b.offer_item_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      Tawaran Selisih:{" "}
                      <strong className="text-orange-600">
                        {b.offer_additional_price > 0
                          ? formatRupiah(b.offer_additional_price)
                          : "Tidak ada bayaran"}
                      </strong>
                    </p>

                    {images.length > 0 && (
                      <div className="flex gap-2">
                        {images.map((img, i) => (
                          <img
                            key={i}
                            src={`http://127.0.0.1:8000/storage/${img}`}
                            alt=""
                            className="w-16 h-16 object-cover rounded-lg border bg-white"
                          />
                        ))}
                      </div>
                    )}

                    <p className="text-sm italic mt-2 text-gray-500">
                      "{b.offer_description}"
                    </p>
                  </div>

                  <p className="text-xs text-gray-500 mt-2">
                    <span className="font-semibold text-gray-700">Oleh:</span>{" "}
                    {b.buyer?.name} ({b.buyer?.email})
                  </p>
                </div>

                <div className="md:w-56 flex flex-col justify-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-5">
                  {["pending", "seller_reviewing"].includes(b.status) && (
                    <>
                      <button
                        onClick={() =>
                          setActionModal({ id: b.id, type: "accept" })
                        }
                        className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-sm transition"
                      >
                        Terima Tawaran
                      </button>

                      <button
                        onClick={() =>
                          setActionModal({ id: b.id, type: "reject" })
                        }
                        className="w-full bg-red-50 text-red-600 font-bold py-3 rounded-xl hover:bg-red-100 border border-red-200 transition"
                      >
                        Tolak
                      </button>
                    </>
                  )}

                  {["accepted", "payment_confirmed"].includes(b.status) && (
                    <button
                      onClick={() => handleComplete(b.id)}
                      className="w-full bg-green-500 text-white font-bold py-3 rounded-xl hover:bg-green-600 shadow-sm transition"
                    >
                      Sudah Selesai COD
                    </button>
                  )}

                  {b.seller_note && (
                    <div className="text-xs bg-orange-50 border border-orange-100 p-3 rounded-xl text-orange-800">
                      <b>Balasan Anda:</b>
                      <br />
                      {b.seller_note}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {actionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl text-gray-900">
            <h2 className="font-bold text-xl text-gray-900 mb-1">
              {actionModal.type === "accept"
                ? "Terima Tawaran Barter"
                : "Tolak Tawaran Barter"}
            </h2>

            <p className="text-sm text-gray-900 mb-5">
              {actionModal.type === "accept"
                ? "Lakukan penyesuaian akhir pembayaran dan catatan COD."
                : "Berikan alasan menolak pengajuan ini agar pembeli tahu."}
            </p>

            {actionModal.type === "accept" && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Set Nominal Selisih Akhir (Rp)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  className="w-full border border-gray-200 p-3 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
                  value={additionalPrice}
                  onChange={(e) => setAdditionalPrice(e.target.value)}
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Pesan Balasan *
              </label>

              <textarea
                className="w-full border border-gray-200 p-3 bg-gray-50 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-400 focus:outline-none"
                rows={3}
                value={sellerNote}
                onChange={(e) => setSellerNote(e.target.value)}
              />

              <p className="text-xs text-red-400 mt-1">
                {!sellerNote.trim() && "Pesan tidak boleh kosong."}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActionModal(null)}
                className="flex-1 py-3 border border-gray-200 font-bold text-gray-600 rounded-2xl hover:bg-gray-50"
              >
                Batal
              </button>

              <button
                onClick={handleAction}
                disabled={submitting || !sellerNote.trim()}
                className={`flex-1 py-3 text-white font-bold rounded-2xl flex justify-center items-center gap-2 ${
                  actionModal.type === "accept"
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-red-600 hover:bg-red-700"
                } disabled:opacity-50`}
              >
                {submitting ? "Tunggu..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Transactions() {
  const pathname = useLocation().pathname;

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("purchases");
  const [user, setUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);
  const [trackingModal, setTrackingModal] = useState(null);
  const [ratingModal, setRatingModal] = useState(null);
  const [ratedTxIds, setRatedTxIds] = useState(new Set());

  useEffect(() => {
    const userStr = localStorage.getItem("current_user");
    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch {}
    }

    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/transactions?role=seller`, {
        headers: getAuthHeaders(),
      });

      const json = await res.json();

      if (json.success) {
        setTransactions(json.data?.data || json.data || []);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      showToast("error", "Gagal memuat data transaksi.");
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const updateStatus = async (transactionId, newStatus, trackingNumber) => {
    setActionLoading(transactionId);

    try {
      const body = { status: newStatus };
      if (trackingNumber) body.tracking_number = trackingNumber;

      const res = await fetch(`${BASE_URL}/transactions/${transactionId}/status`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (json.success) {
        showToast("success", "Status transaksi berhasil diperbarui.");
        setTransactions((prev) =>
          prev.map((t) =>
            t.id === transactionId ? { ...t, status: newStatus } : t
          )
        );
      } else {
        showToast("error", json.message || "Gagal memperbarui status.");
      }
    } catch {
      showToast("error", "Terjadi kesalahan jaringan.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleShip = (transactionId) => {
    setTrackingModal({ transactionId });
  };

  const confirmShip = async (tracking) => {
    if (!trackingModal) return;

    setTrackingModal(null);
    await updateStatus(trackingModal.transactionId, "shipped", tracking);
  };

  const totalPendapatan = transactions
    .filter((t) => t.status === "completed" || t.status === "cod_completed")
    .reduce((sum, t) => sum + (t.total_price ?? 0), 0);

  const filteredTransactions = transactions.filter((t) => {
    if (filter === "all") return true;
    if (filter === "completed") {
      return t.status === "completed" || t.status === "cod_completed";
    }
    if (filter === "processing") {
      return t.status === "processing" || t.status === "cod_waiting";
    }
    return t.status === filter;
  });

  return (
    <div className="flex min-h-screen w-screen bg-white">
      <div className="w-64 bg-white border-r p-4 hidden md:flex flex-col justify-between">
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

        <SidebarProfile user={user} />
      </div>

      <div className="flex-1 p-4 md:p-6 overflow-y-auto bg-gray-50">
        <div className="mb-6 md:mb-8">
          <div className="flex justify-between items-end mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Manajemen Penjualan
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Kelola semua transaksi produk yang Anda jual
              </p>
            </div>

            <button
              onClick={fetchTransactions}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              Refresh
            </button>
          </div>

          <div className="flex gap-6 border-b border-gray-200">
            <button
              onClick={() => setActiveTab("purchases")}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                activeTab === "purchases"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Penjualan Reguler
            </button>

            <button
              onClick={() => setActiveTab("barters")}
              className={`pb-3 text-sm font-bold border-b-2 transition ${
                activeTab === "barters"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              Tukar Tambah (Barter)
            </button>
          </div>
        </div>

        {activeTab === "purchases" ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6 md:mb-8">
              <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-600">
                  Total Transaksi
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-2">
                  {transactions.length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-600">
                  Perlu Diproses
                </p>
                <p className="text-2xl font-bold text-gray-800 mt-2">
                  {
                    transactions.filter((t) => t.status === "payment_confirmed")
                      .length
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100">
                <p className="text-sm font-medium text-gray-600">Selesai</p>
                <p className="text-2xl font-bold text-gray-800 mt-2">
                  {
                    transactions.filter(
                      (t) =>
                        t.status === "completed" ||
                        t.status === "cod_completed"
                    ).length
                  }
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm border border-gray-100 relative">
                <p className="text-sm font-medium text-gray-600">
                  Total Pendapatan
                </p>
                <p className="text-xl sm:text-2xl font-bold text-indigo-600 mt-2">
                  {formatRupiah(totalPendapatan)}
                </p>
              </div>
            </div>

            <div className="mb-6 bg-white p-2 rounded-xl shadow-sm border border-gray-100 inline-block overflow-x-auto max-w-full">
              <div className="flex gap-1 flex-nowrap md:flex-wrap">
                {[
                  { value: "all", label: "Semua" },
                  { value: "payment_confirmed", label: "Perlu Diproses" },
                  { value: "processing", label: "Diproses" },
                  { value: "shipped", label: "Dikirim" },
                  { value: "completed", label: "Selesai" },
                  { value: "refund_requested", label: "Refund" },
                  { value: "cancelled", label: "Batal" },
                ].map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setFilter(option.value)}
                    className={`rounded-lg px-3 py-2 whitespace-nowrap text-sm font-medium transition ${
                      filter === option.value
                        ? "bg-blue-50 text-blue-600"
                        : "bg-transparent text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="rounded-2xl bg-white p-12 text-center shadow-sm border border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Belum ada transaksi
                  </h3>
                  <p className="text-gray-500 text-sm">
                    Transaksi akan muncul di sini setelah ada pembelian produk
                    Anda
                  </p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => {
                  const productImage = getProductImage(transaction);
                  const isProcessing = actionLoading === transaction.id;

                  return (
                    <div
                      key={transaction.id}
                      className="rounded-2xl bg-white p-5 md:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex flex-col md:flex-row items-start gap-4 md:gap-5">
                        <div className="w-full md:w-auto flex-shrink-0 flex justify-center md:justify-start">
                          {productImage ? (
                            <img
                              src={productImage}
                              alt={transaction.product?.title || "Produk"}
                              className="rounded-xl object-cover border border-gray-100 h-28 w-28 md:h-24 md:w-24"
                            />
                          ) : (
                            <div className="rounded-xl bg-gray-100 border border-gray-200 h-28 w-28 md:h-24 md:w-24 flex items-center justify-center text-gray-300 text-4xl">
                              ▧
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0 w-full">
                          <div className="flex flex-col md:flex-row md:items-start justify-between mb-4 gap-2 md:gap-0">
                            <div>
                              <h3 className="font-bold text-gray-800 text-lg mb-1">
                                {transaction.product?.title || "Produk"}
                              </h3>

                              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 inline-block px-2 py-1 rounded font-mono">
                                {transaction.transaction_code}
                              </p>
                            </div>

                            <div className="md:text-right">
                              <p className="text-lg font-bold text-blue-600">
                                {formatRupiah(
                                  transaction.final_amount ??
                                    transaction.total_price ??
                                    0
                                )}
                              </p>

                              <p className="text-xs text-gray-500 mt-1">
                                {new Date(
                                  transaction.created_at
                                ).toLocaleDateString("id-ID", {
                                  day: "numeric",
                                  month: "long",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                            <div>
                              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                Pembeli
                              </p>
                              <p className="text-sm font-bold text-gray-700">
                                {transaction.buyer?.name || "-"}
                              </p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                {transaction.buyer?.email || "-"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                Metode
                              </p>
                              <p className="text-sm font-medium text-gray-700">
                                {transaction.type === "cod"
                                  ? "Cash on Delivery"
                                  : "Rekening Bersama"}
                              </p>
                            </div>

                            <div>
                              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                Status
                              </p>
                              <span
                                className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-md border ${getStatusColor(
                                  transaction.status
                                )}`}
                              >
                                {getStatusText(transaction.status)}
                              </span>
                            </div>

                            {(transaction.shipping_address ||
                              transaction.shipping_city) && (
                              <div className="sm:col-span-2 lg:col-span-1">
                                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                                  Tujuan
                                </p>
                                <p className="text-xs font-medium text-gray-600 line-clamp-2 leading-relaxed">
                                  {[
                                    transaction.shipping_address,
                                    transaction.shipping_city,
                                  ]
                                    .filter(Boolean)
                                    .join(", ")}
                                </p>
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 flex-wrap items-center mt-2 border-t border-gray-50 pt-4">
                            {transaction.status === "payment_confirmed" && (
                              <button
                                onClick={() =>
                                  updateStatus(transaction.id, "processing")
                                }
                                disabled={isProcessing}
                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 transition shadow-sm disabled:opacity-60"
                              >
                                {isProcessing
                                  ? "Memproses..."
                                  : "Proses Pesanan"}
                              </button>
                            )}

                            {transaction.status === "processing" && (
                              <button
                                onClick={() => handleShip(transaction.id)}
                                disabled={isProcessing}
                                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 transition shadow-sm disabled:opacity-60"
                              >
                                {isProcessing
                                  ? "Memproses..."
                                  : "Kirim Barang"}
                              </button>
                            )}

                            {transaction.status === "cod_waiting" && (
                              <button
                                onClick={() =>
                                  updateStatus(transaction.id, "cod_completed")
                                }
                                disabled={isProcessing}
                                className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-bold text-white hover:bg-orange-600 transition shadow-sm disabled:opacity-60"
                              >
                                {isProcessing
                                  ? "Memproses..."
                                  : "Selesaikan COD"}
                              </button>
                            )}

                            {transaction.status === "completed" &&
                              !ratedTxIds.has(transaction.id) && (
                                <button
                                  onClick={() => setRatingModal(transaction)}
                                  className="rounded-lg bg-yellow-50 border border-yellow-300 px-4 py-2 text-sm font-bold text-yellow-700 hover:bg-yellow-100 transition"
                                >
                                  ⭐ Beri Rating Pembeli
                                </button>
                              )}

                            {transaction.status === "completed" &&
                              ratedTxIds.has(transaction.id) && (
                                <span className="text-sm text-green-600 font-semibold">
                                  Pembeli Sudah Dirating
                                </span>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </>
        ) : (
          <BarterSellerList />
        )}
      </div>

      {trackingModal && (
        <TrackingModal
          onConfirm={confirmShip}
          onClose={() => setTrackingModal(null)}
        />
      )}

      {ratingModal && (
        <SellerRatingModal
          transaction={ratingModal}
          onClose={() => setRatingModal(null)}
          onSuccess={(txId) => {
            setRatingModal(null);
            setRatedTxIds((prev) => new Set([...prev, txId]));
            showToast("success", "Rating pembeli berhasil dikirim! ⭐");
          }}
        />
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          {toast.type === "success" ? "✅" : "❌"} {toast.message}
        </div>
      )}
    </div>
  );
}