import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SidebarProfile from "../components/SidebarProfile";

const BASE_URL = "http://127.0.0.1:8000/api/v1";

function formatRupiah(amount) {
  const numericAmount = typeof amount === "string" ? parseFloat(amount.replace(/[^\d.-]/g, "")) : amount;
  const safeAmount = isNaN(numericAmount) || numericAmount === null || numericAmount === undefined ? 0 : numericAmount;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(safeAmount);
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getAuthHeaders() {
  const token = localStorage.getItem("token") || localStorage.getItem("auth_token");

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

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

export default function Wallet() {
  const pathname = useLocation().pathname;

  const [walletData, setWalletData] = useState({ balance: 0, balance_formatted: "Rp 0" });
  const [incomes, setIncomes] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const [activeTab, setActiveTab] = useState("pemasukan");
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Bank accounts dari database
  const [bankAccounts, setBankAccounts] = useState([]);
  const [bankLoading, setBankLoading] = useState(false);
  const [addBankForm, setAddBankForm] = useState({ bank_name: "", account_number: "", account_holder: "" });
  const [showAddBank, setShowAddBank] = useState(false);
  const [addBankLoading, setAddBankLoading] = useState(false);

  const [withdrawForm, setWithdrawForm] = useState({ amount: "", bank_name: "", bank_account: "", bank_holder: "" });
  const [selectedBankId, setSelectedBankId] = useState(null);

  // Rekening default untuk tampil di dashboard
  const defaultBank = bankAccounts.find((b) => b.is_default) || bankAccounts[0] || null;

  useEffect(() => {
    const userStr = localStorage.getItem("current_user");
    if (userStr) {
      try { setUser(JSON.parse(userStr)); } catch {}
    }
    fetchBankAccounts();
    fetchWalletData();
  }, []);

  const fetchBankAccounts = async () => {
    setBankLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/bank-accounts/my`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) {
        setBankAccounts(json.data || []);
        const def = (json.data || []).find((b) => b.is_default) || (json.data || [])[0];
        if (def) setSelectedBankId(def.id);
      }
    } catch (err) {
      console.error("Error fetching bank accounts:", err);
    } finally {
      setBankLoading(false);
    }
  };

  const fetchWalletData = async () => {
    setLoading(true);
    try {
      const [balanceRes, historyRes] = await Promise.all([
        fetch(`${BASE_URL}/wallet/balance`, { headers: getAuthHeaders() }),
        fetch(`${BASE_URL}/wallet/history`, { headers: getAuthHeaders() }),
      ]);
      const balanceJson = await balanceRes.json();
      const historyJson = await historyRes.json();
      if (balanceJson.success) setWalletData(balanceJson.data);
      if (historyJson.success) {
        setIncomes(historyJson.data.incomes || []);
        setWithdrawals(historyJson.data.withdrawals?.data || historyJson.data.withdrawals || []);
      }
    } catch (err) {
      console.error("Error fetching wallet data:", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const openWithdrawModal = () => {
    const def = bankAccounts.find((b) => b.is_default) || bankAccounts[0];
    setSelectedBankId(def?.id || null);
    setWithdrawForm({
      amount: "",
      bank_name: def?.bank_name || "",
      bank_account: def?.account_number || "",
      bank_holder: def?.account_holder || "",
    });
    setShowWithdrawModal(true);
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = Number(withdrawForm.amount);
    if (amount < 10000) { showToast("error", "Minimum penarikan adalah Rp 10.000"); return; }
    if (amount > walletData.balance) { showToast("error", "Saldo tidak mencukupi."); return; }
    setSubmitLoading(true);
    try {
      const body = selectedBankId
        ? { amount, bank_account_id: selectedBankId }
        : { amount, bank_name: withdrawForm.bank_name, bank_account: withdrawForm.bank_account, bank_holder: withdrawForm.bank_holder };

      const res = await fetch(`${BASE_URL}/wallet/withdraw`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        setShowWithdrawModal(false);
        showToast("success", json.message || "Penarikan berhasil! Akan diproses 1×24 jam kerja.");
        fetchWalletData();
      } else {
        const errMsg = json.message || Object.values(json.errors || {}).flat().join(", ");
        showToast("error", errMsg || "Gagal melakukan penarikan.");
      }
    } catch { showToast("error", "Terjadi kesalahan jaringan. Coba lagi."); }
    finally { setSubmitLoading(false); }
  };

  const handleAddBank = async (e) => {
    e.preventDefault();
    setAddBankLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/bank-accounts/my`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ ...addBankForm, is_default: bankAccounts.length === 0 }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Rekening berhasil ditambahkan!");
        setAddBankForm({ bank_name: "", account_number: "", account_holder: "" });
        setShowAddBank(false);
        fetchBankAccounts();
      } else {
        showToast("error", json.message || "Gagal menambah rekening.");
      }
    } catch { showToast("error", "Terjadi kesalahan jaringan."); }
    finally { setAddBankLoading(false); }
  };

  const handleSetDefault = async (bankId) => {
    try {
      const res = await fetch(`${BASE_URL}/bank-accounts/my/${bankId}/set-default`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Rekening default berhasil diubah!");
        setSelectedBankId(bankId);
        fetchBankAccounts();
      } else {
        showToast("error", json.message || "Gagal mengubah default.");
      }
    } catch { showToast("error", "Terjadi kesalahan jaringan."); }
  };

  const handleDeleteBank = async (bankId) => {
    if (!confirm("Yakin hapus rekening ini?")) return;
    try {
      const res = await fetch(`${BASE_URL}/bank-accounts/my/${bankId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        showToast("success", "Rekening berhasil dihapus.");
        fetchBankAccounts();
      } else {
        showToast("error", json.message || "Gagal menghapus rekening.");
      }
    } catch { showToast("error", "Terjadi kesalahan jaringan."); }
  };

  const openSettingsModal = () => {
    setShowAddBank(false);
    setAddBankForm({ bank_name: "", account_number: "", account_holder: "" });
    setShowSettingsModal(true);
  };

  const withdrawalStatusBadge = (status) => {
    const map = {
      pending: "bg-yellow-100 text-yellow-700 border border-yellow-200",
      processing: "bg-blue-100 text-blue-700 border border-blue-200",
      completed: "bg-green-100 text-green-700 border border-green-200",
      rejected: "bg-red-100 text-red-700 border border-red-200",
    };

    return map[status] || "bg-gray-100 text-gray-700 border border-gray-200";
  };

  const withdrawalStatusLabel = (status) => {
    const map = {
      pending: "Menunggu",
      processing: "Diproses",
      completed: "Withdrawn",
      rejected: "Ditolak",
    };

    return map[status] || "Withdrawn";
  };

  return (
    <div className="flex min-h-screen w-screen bg-white">
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

      <div className="ml-64 flex-1 p-6 overflow-y-auto bg-gray-50">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Wallet Saya</h1>

          <button
            onClick={openSettingsModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition"
          >
            ⚙️ Atur Metode Pembayaran
          </button>
        </div>

        <div className="bg-blue-500 rounded-2xl p-6 mb-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-white opacity-5 -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 right-12 w-32 h-32 rounded-full bg-white opacity-5 translate-y-12" />

          <p className="text-blue-100 text-sm mb-1">
            Total saldo yang siap dicairkan
          </p>

          {loading ? (
            <div className="h-10 w-48 bg-blue-400 animate-pulse rounded-lg mb-4" />
          ) : (
            <p className="text-4xl font-bold text-white mb-4 tracking-tight">
              {walletData.balance_formatted || formatRupiah(walletData.balance)}
            </p>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={openWithdrawModal}
              disabled={walletData.balance < 10000 || loading}
              className="px-6 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:bg-yellow-200 disabled:cursor-not-allowed text-yellow-900 font-semibold rounded-xl transition text-sm shadow-md"
            >
              Cairkan
            </button>

            {walletData.balance < 10000 && !loading && (
              <p className="text-blue-200 text-xs">
                Minimum saldo untuk cairkan: Rp 10.000
              </p>
            )}
          </div>
        </div>

        {bankLoading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 animate-pulse h-16 shadow-sm" />
        ) : defaultBank ? (
          <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                💳
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {defaultBank.bank_name}
                </p>
                <p className="text-xs text-gray-500">
                  {defaultBank.account_number} · a.n {defaultBank.account_holder}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2 py-1 bg-green-50 text-green-600 rounded-md font-medium border border-green-100">
                Default
              </span>
              <button
                onClick={openSettingsModal}
                className="text-xs px-2 py-1 bg-gray-50 text-gray-600 rounded-md border border-gray-200 hover:bg-gray-100 transition"
              >
                Kelola
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <p className="text-sm text-orange-700">
              Belum ada rekening bank tersimpan.{" "}
              <button onClick={openSettingsModal} className="underline font-semibold">
                Tambah sekarang
              </button>
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setActiveTab("pemasukan")}
              className={`flex-1 py-4 text-sm font-semibold transition ${
                activeTab === "pemasukan"
                  ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Pemasukan
            </button>

            <button
              onClick={() => setActiveTab("penarikan")}
              className={`flex-1 py-4 text-sm font-semibold transition ${
                activeTab === "penarikan"
                  ? "text-blue-600 border-b-2 border-blue-500 bg-blue-50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              Riwayat Penarikan
            </button>
          </div>

          <div className="divide-y divide-gray-50">
            {loading ? (
              <div className="p-8 flex flex-col items-center gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="w-full h-14 bg-gray-100 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : activeTab === "pemasukan" ? (
              incomes.length === 0 ? (
                <EmptyState text="Belum ada pemasukan dari transaksi" />
              ) : (
                incomes.map((income, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
                        ↑
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {income.transaction_code || "Transaksi Selesai"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(income.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">
                        +{formatRupiah(income.amount)}
                      </p>
                      <span className="text-xs px-2 py-0.5 bg-green-50 text-green-600 rounded font-medium border border-green-100">
                        Masuk
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : withdrawals.length === 0 ? (
              <EmptyState text="Belum ada riwayat penarikan dana" />
            ) : (
              withdrawals.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                      ↓
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-800">
                        {w.bank_name} · {w.bank_account}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(w.created_at)}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-sm font-bold text-red-500">
                      −{formatRupiah(w.amount)}
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium ${withdrawalStatusBadge(
                        w.status
                      )}`}
                    >
                      {withdrawalStatusLabel(w.status)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showWithdrawModal && (
        <ModalOverlay onClose={() => setShowWithdrawModal(false)}>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Cairkan Dana</h2>
          <p className="text-sm text-gray-500 mb-4">
            Saldo tersedia:{" "}
            <span className="font-semibold text-blue-600">
              {walletData.balance_formatted || formatRupiah(walletData.balance)}
            </span>
          </p>

          <form onSubmit={handleWithdraw} className="space-y-4">
            <InputField
              label="Jumlah Penarikan (Rp)"
              type="number"
              min={10000}
              max={walletData.balance}
              placeholder="Minimum Rp 10.000"
              value={withdrawForm.amount}
              onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
            />

            {bankAccounts.length > 0 ? (
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-2">
                  Pilih Rekening Tujuan
                </label>
                <div className="space-y-2 max-h-44 overflow-y-auto">
                  {bankAccounts.map((bank) => (
                    <label
                      key={bank.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        selectedBankId === bank.id
                          ? "border-blue-400 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="bank_select"
                        checked={selectedBankId === bank.id}
                        onChange={() => setSelectedBankId(bank.id)}
                        className="accent-blue-500"
                      />
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{bank.bank_name}</p>
                        <p className="text-xs text-gray-500">
                          {bank.account_number} · a.n {bank.account_holder}
                          {bank.is_default && (
                            <span className="ml-1 text-green-600 font-medium">(Default)</span>
                          )}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-700">
                  Belum ada rekening tersimpan.{" "}
                  <button
                    type="button"
                    onClick={() => { setShowWithdrawModal(false); openSettingsModal(); }}
                    className="underline font-semibold"
                  >
                    Tambah rekening dulu
                  </button>
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2">
              ⏱ Proses pencairan membutuhkan 1×24 jam kerja.
            </p>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={submitLoading || (!selectedBankId && bankAccounts.length > 0)}
                className="flex-1 py-2.5 bg-yellow-400 hover:bg-yellow-300 disabled:opacity-60 text-yellow-900 text-sm font-bold rounded-xl transition shadow"
              >
                {submitLoading ? "Memproses..." : "Cairkan Sekarang"}
              </button>
            </div>
          </form>
        </ModalOverlay>
      )}

      {showSettingsModal && (
        <ModalOverlay onClose={() => setShowSettingsModal(false)}>
          <h2 className="text-lg font-bold text-gray-800 mb-1">Kelola Rekening Bank</h2>
          <p className="text-sm text-gray-500 mb-4">
            Rekening ini digunakan untuk pencairan dana wallet.
          </p>

          {/* Daftar rekening dari database */}
          {bankLoading ? (
            <div className="space-y-2 mb-4">
              {[1,2].map(i => <div key={i} className="h-14 bg-gray-100 animate-pulse rounded-lg" />)}
            </div>
          ) : bankAccounts.length > 0 ? (
            <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
              {bankAccounts.map((bank) => (
                <div
                  key={bank.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    bank.is_default ? "border-blue-300 bg-blue-50" : "border-gray-200"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{bank.bank_name}</p>
                    <p className="text-xs text-gray-500">
                      {bank.account_number} · a.n {bank.account_holder}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {bank.is_default ? (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded font-medium">Default</span>
                    ) : (
                      <button
                        onClick={() => handleSetDefault(bank.id)}
                        className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded hover:bg-blue-100 hover:text-blue-700 transition"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteBank(bank.id)}
                      className="text-xs px-2 py-0.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-400 text-sm mb-4">
              Belum ada rekening tersimpan.
            </div>
          )}

          {/* Tambah rekening baru */}
          {!showAddBank ? (
            <button
              onClick={() => setShowAddBank(true)}
              className="w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-500 text-sm font-medium rounded-xl hover:border-blue-400 hover:text-blue-500 transition"
            >
              + Tambah Rekening Baru
            </button>
          ) : (
            <form onSubmit={handleAddBank} className="space-y-3 mt-2 border border-gray-200 rounded-xl p-4 bg-gray-50">
              <p className="text-xs font-semibold text-gray-700">Tambah Rekening Baru</p>
              <div>
                <label className="block text-xs font-semibold text-gray-900 mb-1">Nama Bank / E-Wallet</label>
                <select
                  value={addBankForm.bank_name}
                  onChange={(e) => setAddBankForm({ ...addBankForm, bank_name: e.target.value })}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="">-- Pilih --</option>
                  <optgroup label="M-Banking">
                    <option value="BCA">BCA</option>
                    <option value="BRI">BRI</option>
                    <option value="BNI">BNI</option>
                    <option value="Mandiri">Mandiri</option>
                    <option value="BSI">BSI</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Permata Bank">Permata Bank</option>
                  </optgroup>
                  <optgroup label="E-Wallet">
                    <option value="GoPay">GoPay</option>
                    <option value="OVO">OVO</option>
                    <option value="Dana">Dana</option>
                    <option value="ShopeePay">ShopeePay</option>
                    <option value="LinkAja">LinkAja</option>
                  </optgroup>
                </select>
              </div>
              <InputField
                label="Nomor Rekening / No. HP"
                placeholder="cth: 081234567890"
                value={addBankForm.account_number}
                onChange={(e) => setAddBankForm({ ...addBankForm, account_number: e.target.value })}
              />
              <InputField
                label="Atas Nama"
                placeholder="Nama sesuai rekening"
                value={addBankForm.account_holder}
                onChange={(e) => setAddBankForm({ ...addBankForm, account_holder: e.target.value })}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddBank(false)}
                  className="flex-1 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={addBankLoading}
                  className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold rounded-lg transition disabled:opacity-60"
                >
                  {addBankLoading ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="py-2 px-4 border border-gray-200 text-gray-600 text-sm font-medium rounded-xl hover:bg-gray-50 transition"
            >
              Tutup
            </button>
          </div>
        </ModalOverlay>
      )}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-4 rounded-2xl shadow-xl text-sm font-medium transition-all ${
            toast.type === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <span>
            {toast.type === "success" ? "✅" : "❌"} {toast.message}
          </span>
        </div>
      )}
    </div>
  );
}

function ModalOverlay({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition"
          aria-label="Tutup"
        >
          ✕
        </button>

        {children}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <div className="w-12 h-12 mb-3 opacity-30 flex items-center justify-center text-4xl">
        💳
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}

function InputField({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-900 mb-1">
        {label}
      </label>
      <input
        required
        {...props}
        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
      />
    </div>
  );
}