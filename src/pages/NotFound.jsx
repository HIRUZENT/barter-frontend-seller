import { Link, useNavigate } from "react-router-dom";
import { Search, Home, ArrowLeft, Store } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6">
      <div className="w-full max-w-3xl text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-blue-50 border border-blue-100 shadow-sm">
          <Store className="h-12 w-12 text-blue-600" />
        </div>

        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600">
          <Search className="h-4 w-4" />
          Route seller tidak ditemukan
        </div>

        <h1 className="text-7xl font-black tracking-tight text-blue-600 mb-4">
          404
        </h1>

        <h2 className="text-2xl md:text-4xl font-bold text-slate-900 mb-4">
          Halaman seller belum tersedia
        </h2>

        <p className="mx-auto max-w-xl text-slate-500 mb-8">
          Menu atau halaman yang kamu buka belum ada di dashboard seller.
          Silakan kembali ke dashboard utama.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md shadow-blue-200 transition hover:bg-blue-700 hover:scale-105"
          >
            <Home className="h-5 w-5" />
            Ke Dashboard
          </Link>

          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50 hover:scale-105"
          >
            <ArrowLeft className="h-5 w-5" />
            Kembali Sebelumnya
          </button>
        </div>
      </div>
    </main>
  );
}