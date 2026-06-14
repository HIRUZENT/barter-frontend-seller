import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import SidebarProfile from "../components/SidebarProfile";

const BASE_URL = "http://127.0.0.1:8000/api/v1";

export default function Products() {
  const pathname = useLocation().pathname;

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [user, setUser] = useState(null);

  // TAMBAHAN FITUR
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [viewMode, setViewMode] = useState("grid");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    stock: "",
    condition: "new",
    transaction_type: "cod",
    location: "",
    location_id: "",
    latitude: "",
    longitude: "",
    category_id: "",
    images: [],
    tags: [],
  });

  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [existingImages, setExistingImages] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [originalImages, setOriginalImages] = useState([]);

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

  const getAuthHeader = () => {
    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("auth_token");

    return {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  };

  useEffect(() => {
    const userStr = localStorage.getItem("current_user");

    if (userStr) {
      try {
        setUser(JSON.parse(userStr));
      } catch { }
    }

    fetchData();
  }, []);

  useEffect(() => {
    const query = formData.location.trim();

    if (!query || query.length < 2) {
      setLocationSuggestions([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setLocationLoading(true);

        const res = await fetch(
          `${BASE_URL}/locations/suggestions?q=${encodeURIComponent(
            query
          )}`,
          { headers: getAuthHeader() }
        );

        const json = await res.json();

        if (res.ok && json.success) {
          setLocationSuggestions(json.suggestions || []);
        } else {
          setLocationSuggestions([]);
        }
      } catch (error) {
        console.error("Location fetch error:", error);
        setLocationSuggestions([]);
      } finally {
        setLocationLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [formData.location]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [prodRes, catRes] = await Promise.all([
        fetch(`${BASE_URL}/my/products`, {
          headers: getAuthHeader(),
        }),
        fetch(`${BASE_URL}/categories`, {
          headers: getAuthHeader(),
        }),
      ]);

      const prodJson = await prodRes.json();
      const catJson = await catRes.json();

      if (prodJson.success) {
        setProducts(prodJson.data?.data || prodJson.data || []);
      }

      if (catJson.success) {
        setCategories(catJson.data || []);
      }
    } catch (error) {
      console.error("Error fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  // ANALYTICS TAMBAHAN
  const totalStock = useMemo(() => {
    return products.reduce(
      (acc, item) => acc + Number(item.stock || 0),
      0
    );
  }, [products]);

  const totalInventoryValue = useMemo(() => {
    return products.reduce((acc, item) => {
      return (
        acc +
        Number(item.price || 0) *
        Number(item.stock || 0)
      );
    }, 0);
  }, [products]);

  const lowStockProducts = useMemo(() => {
    return products.filter(
      (item) => Number(item.stock || 0) <= 5
    ).length;
  }, [products]);

  const activeProducts = useMemo(() => {
    return products.filter(
      (item) =>
        (item.status || "active") === "active"
    ).length;
  }, [products]);

  // FILTER + SEARCH
  const filteredProducts = useMemo(() => {
    return [...products]
      .filter((product) => {
        const matchSearch =
          product.title
            ?.toLowerCase()
            .includes(search.toLowerCase()) ||
          product.description
            ?.toLowerCase()
            .includes(search.toLowerCase());

        const matchStatus =
          filterStatus === "all"
            ? true
            : (product.status || "active") ===
            filterStatus;

        return matchSearch && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "price_low") {
          return (
            Number(a.price) - Number(b.price)
          );
        }

        if (sortBy === "price_high") {
          return (
            Number(b.price) - Number(a.price)
          );
        }

        if (sortBy === "stock") {
          return (
            Number(b.stock) - Number(a.stock)
          );
        }

        return b.id - a.id;
      });
  }, [products, search, filterStatus, sortBy]);

  const handleImageChange = (files) => {
    const newFiles = Array.from(files);
    const existingCount =
      existingImages.length + formData.images.length;

    const remainingSlots = Math.max(
      0,
      5 - existingCount
    );

    const nextFiles = newFiles.slice(
      0,
      remainingSlots
    );

    if (nextFiles.length === 0) return;

    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...nextFiles],
    }));
  };

  const handleImageInput = (e) => {
    if (!e.target.files) return;
    handleImageChange(e.target.files);
    e.target.value = "";
  };

  const handleImageDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (
      e.dataTransfer.files &&
      e.dataTransfer.files.length > 0
    ) {
      handleImageChange(e.dataTransfer.files);
      e.dataTransfer.clearData();
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      e.type === "dragenter" ||
      e.type === "dragover"
    ) {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const removeImage = (index) => {
    setFormData((prev) => {
      const nextImages = [...prev.images];
      nextImages.splice(index, 1);

      return {
        ...prev,
        images: nextImages,
      };
    });
  };

  const removeExistingImage = (index) => {
    setExistingImages((prev) => {
      const nextImages = [...prev];
      nextImages.splice(index, 1);
      return nextImages;
    });
  };

  const handleAddProduct = () => {
    setEditingProduct(null);
    setExistingImages([]);

    setFormData({
      title: "",
      description: "",
      price: "",
      stock: "",
      condition: "new",
      transaction_type: "cod",
      location: "",
      location_id: "",
      latitude: "",
      longitude: "",
      category_id: "",
      images: [],
      tags: [],
    });

    setLocationSuggestions([]);
    setModalOpen(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setExistingImages(product.images || []);
    setOriginalImages(product.images || []);

    const fallbackLocation =
      product.location ||
      [
        product.location_city,
        product.location_province,
      ]
        .filter(Boolean)
        .join(", ");

    setFormData({
      title: product.title || "",
      description: product.description || "",
      price: String(product.price || ""),
      stock: String(product.stock || ""),
      condition: product.condition || "new",
      transaction_type:
        product.transaction_type || "cod",
      location: fallbackLocation || "",
      location_id: product.location_id || "",
      latitude: product.latitude
        ? String(product.latitude)
        : "",
      longitude: product.longitude
        ? String(product.longitude)
        : "",
      category_id: String(
        product.category_id || ""
      ),
      images: [],
      tags: product.tags || [],
    });

    setLocationSuggestions([]);
    setModalOpen(true);
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm("Yakin hapus produk ini?"))
      return;

    try {
      const res = await fetch(
        `${BASE_URL}/products/${id}`,
        {
          method: "DELETE",
          headers: getAuthHeader(),
        }
      );

      const json = await res.json();

      if (res.ok && json.success) {
        setProducts(
          products.filter((p) => p.id !== id)
        );

        alert("Produk berhasil dihapus");
      } else {
        alert(
          "Error: " +
          (json.message ||
            JSON.stringify(json.errors))
        );
      }
    } catch (error) {
      console.error("Delete error:", error);

      alert(
        "Gagal menghapus produk: " +
        error.message
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);

    if (
      !formData.title ||
      !formData.description ||
      !formData.price ||
      !formData.stock ||
      !formData.category_id ||
      !formData.location
    ) {
      alert("Semua field harus diisi!");
      setSubmitLoading(false);
      return;
    }

    if (
      !editingProduct &&
      formData.images.length === 0
    ) {
      alert(
        "Minimal 1 gambar harus diupload untuk produk baru!"
      );

      setSubmitLoading(false);
      return;
    }

    const data = new FormData();

    if (editingProduct) {
      data.append("_method", "PUT");
    }

    data.append("title", formData.title);
    data.append(
      "description",
      formData.description
    );
    data.append("price", formData.price);
    data.append("stock", formData.stock);
    data.append(
      "condition",
      formData.condition
    );

    data.append(
      "transaction_type",
      formData.transaction_type
    );

    data.append(
      "location",
      formData.location
    );

    data.append(
      "category_id",
      formData.category_id
    );

    const locationParts = formData.location
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    data.append(
      "location_city",
      locationParts[0] || formData.location
    );

    data.append(
      "location_province",
      locationParts.length > 1
        ? locationParts[
        locationParts.length - 1
        ]
        : formData.location
    );

    if (formData.location_id) {
      data.append(
        "location_id",
        formData.location_id
      );
    }

    if (formData.latitude) {
      data.append(
        "latitude",
        formData.latitude
      );
    }

    if (formData.longitude) {
      data.append(
        "longitude",
        formData.longitude
      );
    }

    if (editingProduct) {
      const existingIds = new Set(
        existingImages.map((img) => img.id)
      );

      const deletedImageIds = originalImages
        .filter(
          (img) => !existingIds.has(img.id)
        )
        .map((img) => img.id);

      deletedImageIds.forEach(
        (id, index) => {
          data.append(
            `delete_image_ids[${index}]`,
            id
          );
        }
      );
    }

    formData.images.forEach(
      (file, index) => {
        data.append(
          `images[${index}]`,
          file
        );
      }
    );

    formData.tags.forEach((tag, index) => {
      data.append(`tags[${index}]`, tag);
    });

    try {
      const url = editingProduct
        ? `${BASE_URL}/products/${editingProduct.id}`
        : `${BASE_URL}/products`;

      const res = await fetch(url, {
        method: "POST",
        body: data,
        headers: getAuthHeader(),
      });

      const json = await res.json();

      if (res.ok && json.success) {
        if (editingProduct) {
          setProducts(
            products.map((p) =>
              p.id === editingProduct.id
                ? json.data
                : p
            )
          );
        } else {
          setProducts([
            json.data,
            ...products,
          ]);
        }

        setModalOpen(false);

        alert(
          json.message ||
          "Produk berhasil disimpan"
        );
      } else {
        alert(
          "Error: " +
          (json.message ||
            JSON.stringify(
              json.errors || json
            ))
        );
      }
    } catch (error) {
      console.error("Fetch error:", error);

      alert(
        "Gagal menyimpan produk: " +
        error.message
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  const resolveImageUrl = (path) => {
    if (!path) return "/no-image.png";

    if (
      path.startsWith("http://") ||
      path.startsWith("https://")
    ) {
      return path;
    }

    const normalizedPath =
      path.replace(/^\//, "");

    if (
      normalizedPath.startsWith("storage/")
    ) {
      return `http://127.0.0.1:8000/${normalizedPath}`;
    }

    return `http://127.0.0.1:8000/storage/${normalizedPath}`;
  };

  const getImage = (product) => {
    if (
      product.images &&
      product.images.length > 0
    ) {
      return resolveImageUrl(
        product.images[0].image_path
      );
    }

    return "/no-image.png";
  };

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-white">
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
              const external =
                item.href.startsWith("http");

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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${pathname === item.href
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
      <div className="ml-0 md:ml-64 flex-1 p-4 md:p-6 overflow-y-auto bg-gray-50">
        {/* HEADER */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-primary">
              Kelola Produk
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Kelola seluruh produk tokomu
              dengan mudah.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={fetchData}
              className="bg-white border px-4 py-2 rounded-xl text-sm hover:bg-gray-100"
            >
              Refresh
            </button>

            <button
              onClick={handleAddProduct}
              className="bg-blue-500 text-white px-4 py-2 rounded-xl hover:bg-blue-600"
            >
              Tambah Produk
            </button>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">
              Total Produk
            </p>

            <h2 className="text-3xl font-bold text-blue-600 mt-2">
              {products.length}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">
              Produk Aktif
            </p>

            <h2 className="text-3xl font-bold text-green-600 mt-2">
              {activeProducts}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">
              Total Stock
            </p>

            <h2 className="text-3xl font-bold text-orange-600 mt-2">
              {totalStock}
            </h2>
          </div>

          <div className="bg-white rounded-2xl p-5 shadow-sm border">
            <p className="text-sm text-gray-500">
              Nilai Inventory
            </p>

            <h2 className="text-lg font-bold text-purple-600 mt-2 break-all">
              Rp{" "}
              {totalInventoryValue.toLocaleString(
                "id-ID"
              )}
            </h2>
          </div>
        </div>

        {/* FILTER */}
        <div className="bg-white rounded-2xl border shadow-sm p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="Cari produk..."
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              className="w-full border rounded-xl px-4 py-3 text-sm"
            />

            <select
              value={filterStatus}
              onChange={(e) =>
                setFilterStatus(
                  e.target.value
                )
              }
              className="border rounded-xl px-4 py-3 text-sm"
            >
              <option value="all">
                Semua Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>

            <select
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value)
              }
              className="border rounded-xl px-4 py-3 text-sm"
            >
              <option value="newest">
                Produk Terbaru
              </option>

              <option value="price_low">
                Harga Termurah
              </option>

              <option value="price_high">
                Harga Termahal
              </option>

              <option value="stock">
                Stock Terbanyak
              </option>
            </select>

            <button
              onClick={() =>
                setViewMode(
                  viewMode === "grid"
                    ? "list"
                    : "grid"
                )
              }
              className="border rounded-xl px-4 py-3 text-sm bg-gray-50 hover:bg-gray-100"
            >
              Mode:{" "}
              {viewMode === "grid"
                ? "Grid"
                : "List"}
            </button>
          </div>
        </div>

        {/* LOW STOCK WARNING */}
        {lowStockProducts > 0 && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-700">
              ⚠ Perhatian Stock
            </h3>

            <p className="text-sm text-red-600 mt-1">
              Ada {lowStockProducts} produk
              dengan stock menipis.
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="h-32 w-full rounded-lg bg-slate-200" />
                <div className="mt-4 h-4 w-3/4 rounded-full bg-slate-200" />
                <div className="mt-3 h-4 w-1/2 rounded-full bg-slate-200" />
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div className="h-9 w-24 rounded-full bg-slate-200" />
                  <div className="h-9 w-24 rounded-full bg-slate-200" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
            <h2 className="text-2xl font-bold text-primary">
              Produk Tidak Ditemukan
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Coba gunakan keyword lain atau
              tambahkan produk baru.
            </p>
<button
            onClick={handleAddProduct}
            className="mt-5 bg-blue-500 text-white px-5 py-2 rounded-xl hover:bg-blue-600"
          >
            Tambah Produk
          </button>
        </div>
      ) : (
        <div
          className={`w-full max-w-6xl grid gap-5 ${
            viewMode === "grid"
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              : "grid-cols-1"
          }`}
        >
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              className={`group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
                viewMode === "list"
                  ? "flex flex-col md:flex-row w-full"
                  : "flex flex-col h-full min-h-[350px]" 
              }`}
            >
              {/* IMAGE CONTAINER - DIUBAH MENJADI RAMPING (16:9) */}
              <div
                className={`relative overflow-hidden bg-slate-100 shrink-0 ${
                  viewMode === "list"
                    ? "w-full md:w-60 aspect-[4/3] md:aspect-auto md:h-full min-h-[180px]"
                    : "w-full aspect-video" 
                }`}
              >
                <img
                  src={getImage(p)}
                  alt={p.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />

                <div className="absolute top-2.5 right-2.5 bg-black/70 text-white text-[10px] font-medium px-2 py-0.5 rounded-full backdrop-blur-sm z-10">
                  {p.images?.length || 0} Foto
                </div>
              </div>

              {/* CONTENT CONTAINER - LEBIH PADAT */}
              <div className="flex flex-1 flex-col p-4 gap-2">
                {/* Title and Price */}
                <div>
                  <h3 className="text-sm font-bold text-slate-800 line-clamp-2 min-h-[40px] leading-snug">
                    {p.title}
                  </h3>
                  <p className="mt-1 text-blue-600 text-base font-extrabold tracking-tight">
                    Rp {Number(p.price).toLocaleString("id-ID")}
                  </p>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                      p.condition === "new"
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {p.condition === "new" ? "Baru" : "Bekas"}
                  </span>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 capitalize">
                    {p.transaction_type}
                  </span>

                  {Number(p.stock) <= 5 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-red-50 text-red-600">
                      Stok Menipis
                    </span>
                  )}
                </div>

                {/* Product Metadata */}
                <div className="mt-2 space-y-0.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span>Stok:</span>
                    <span className="font-semibold text-slate-700">{p.stock}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <span className="font-semibold text-emerald-600 capitalize">
                      {p.status || "active"}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-auto pt-3 flex gap-2">
                  <button
                    onClick={() => handleEditProduct(p)}
                    className="flex-1 rounded-lg bg-amber-500 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-amber-600"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="flex-1 rounded-lg bg-rose-500 py-2 text-xs font-bold text-white transition-colors duration-200 hover:bg-rose-600"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        {modalOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setModalOpen(false)}
          >
            <div
              className="relative bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                ×
              </button>

              <h2 className="text-xl font-bold text-blue-500 mb-4">
                {editingProduct ? "Edit Produk" : "Tambah Produk"}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full p-2 border rounded text-primary"
                  placeholder="Judul"
                  required
                />

                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full p-2 border rounded text-primary"
                  rows={3}
                  placeholder="Deskripsi"
                  required
                />

                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    className="w-full p-2 border rounded text-primary"
                    placeholder="Harga"
                    required
                  />

                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    className="w-full p-2 border rounded text-primary"
                    placeholder="Stock"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({ ...formData, condition: e.target.value })
                    }
                    className="w-full p-2 border rounded text-primary"
                  >
                    <option value="new">Baru</option>
                    <option value="used">Bekas</option>
                  </select>

                  <select
                    value={formData.transaction_type}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        transaction_type: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded text-primary"
                  >
                    <option value="cod">COD</option>
                    <option value="rekber">Rekber</option>
                    <option value="both">Keduanya</option>
                  </select>
                </div>

                <select
                  value={formData.category_id}
                  onChange={(e) =>
                    setFormData({ ...formData, category_id: e.target.value })
                  }
                  className="w-full p-2 border rounded text-primary"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      location: e.target.value,
                      location_id: "",
                      latitude: "",
                      longitude: "",
                    })
                  }
                  className="w-full p-2 border rounded text-primary"
                  placeholder="Cari lokasi..."
                  required
                />

                {locationLoading && (
                  <p className="text-sm text-slate-500">Mencari lokasi...</p>
                )}

                {locationSuggestions.length > 0 && (
                  <div className="max-h-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                    {locationSuggestions.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setFormData((prev) => ({
                            ...prev,
                            location: item.label,
                            location_id: item.id,
                            latitude: String(item.latitude),
                            longitude: String(item.longitude),
                          }));
                          setLocationSuggestions([]);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                      >
                        <span className="block font-medium">{item.label}</span>
                        <span className="block text-xs text-slate-500">
                          {item.description}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                <div
                  className={`mt-2 flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white text-center transition ${dragActive
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-300 hover:border-blue-300"
                    }`}
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleImageDrop}
                  onClick={() =>
                    document.getElementById("product-image-input")?.click()
                  }
                >
                  <input
                    id="product-image-input"
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handleImageInput}
                    className="hidden"
                  />

                  <div className="pointer-events-none">
                    <p className="text-sm font-medium text-primary">
                      Tarik atau pilih gambar di sini
                    </p>
                    <p className="text-xs text-slate-500">
                      Bisa tambah satu per satu, maksimal 5 gambar
                    </p>
                    <p className="text-xs text-slate-400">
                      {formData.images.length} / 5
                    </p>
                  </div>
                </div>

                {(existingImages.length > 0 || formData.images.length > 0) && (
                  <div className="grid grid-cols-3 gap-3 mt-4">
                    {existingImages.map((image, index) => (
                      <div
                        key={`existing-${index}`}
                        className="relative overflow-hidden rounded-xl border bg-white shadow-sm"
                      >
                        <img
                          src={resolveImageUrl(image.image_path)}
                          alt={`existing-preview-${index}`}
                          className="h-24 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => removeExistingImage(index)}
                          className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm text-red-600 shadow-sm hover:bg-red-50"
                        >
                          ×
                        </button>
                      </div>
                    ))}

                    {formData.images.map((file, index) => (
                      <div
                        key={`new-${index}`}
                        className="relative overflow-hidden rounded-xl border bg-white shadow-sm"
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`preview-${index}`}
                          className="h-24 w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute right-1 top-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white text-sm text-red-600 shadow-sm hover:bg-red-50"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  type="text"
                  value={formData.tags.join(", ")}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      tags: e.target.value.split(",").map((t) => t.trim()),
                    })
                  }
                  className="w-full p-2 border rounded text-primary"
                  placeholder="Tags, pisahkan dengan koma"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {submitLoading ? "Menyimpan..." : "Simpan"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}