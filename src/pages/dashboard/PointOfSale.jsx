import React, { useState, useEffect } from 'react';
import { 
  Search, Plus, Minus, Trash2, ShoppingBag, 
  User, CheckCircle, RefreshCw, Layers, Edit3, X 
} from 'lucide-react';
import { db } from '../../utils/db';
import GlassCard from '../../components/GlassCard';
import { showAlert } from '../../utils/alertHelper';
import { getTodayLocalStr } from '../../utils/dateHelper';

export default function PointOfSale() {
  const [products, setProducts] = useState([]);
  const [todayBookings, setTodayBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Tab/Mode State
  const [posMode, setPosMode] = useState('kasir'); // 'kasir' | 'inventaris'
  
  // Cart State
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState('Semua');
  const [search, setSearch] = useState('');
  
  // Checkout Form State
  const [consumerName, setConsumerName] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Tunai');

  // Paginasi Inventaris
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset halaman jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, category, posMode]);

  // Product CRUD Form States
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null = tambah, object = edit
  const [productForm, setProductForm] = useState({
    id_produk: '',
    nama_produk: '',
    kategori: 'Makanan',
    harga_modal: 0,
    harga_jual: 0,
    stok: 0,
    satuan: 'Pcs',
    status: 'Aktif'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allProducts = await db.getProducts();
      setProducts(allProducts);

      const todayStr = getTodayLocalStr();
      const bookings = await db.getBookings(todayStr);
      setTodayBookings(bookings.filter(b => b.status_booking !== 'Dibatalkan'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Tambah item ke keranjang
  const addToCart = (product) => {
    if (product.stok <= 0) {
      showAlert.warning("Stok Habis", "Produk yang Anda pilih sudah tidak memiliki sisa stok!");
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id_produk === product.id_produk);
      
      if (existing) {
        if (existing.qty >= product.stok) {
          showAlert.warning("Stok Terbatas", `Tidak bisa menambah qty lebih dari stok tersedia (${product.stok} Pcs).`);
          return prevCart;
        }
        return prevCart.map(item => 
          item.id_produk === product.id_produk 
            ? { ...item, qty: item.qty + 1 } 
            : item
        );
      }
      
      return [...prevCart, {
        id_produk: product.id_produk,
        nama_produk: product.nama_produk,
        harga: product.harga_jual,
        qty: 1,
        maxStok: product.stok
      }];
    });
  };

  // Kurangi qty
  const decreaseQty = (id) => {
    setCart(prevCart => {
      const item = prevCart.find(i => i.id_produk === id);
      if (item.qty === 1) {
        return prevCart.filter(i => i.id_produk !== id);
      }
      return prevCart.map(i => 
        i.id_produk === id ? { ...i, qty: i.qty - 1 } : i
      );
    });
  };

  // Hapus item dari keranjang
  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(i => i.id_produk !== id));
  };

  // Hitung total belanja
  const cartTotal = cart.reduce((sum, item) => sum + (item.harga * item.qty), 0);

  // Proses Checkout
  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      showAlert.warning("Keranjang Kosong", "Keranjang belanja kasir masih kosong!");
      return;
    }

    const sessionStr = sessionStorage.getItem('sorga_session');
    const cashierName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Kasir Belega';

    const transactionData = {
      daftar_item: cart,
      total_belanja: cartTotal,
      metode_bayar: paymentMethod,
      kasir: cashierName,
      id_booking: selectedBookingId || null,
      nama_konsumen: consumerName || null
    };

    const confirmCheckout = await showAlert.confirm("Konfirmasi Transaksi", `Selesaikan transaksi belanja senilai Rp ${cartTotal.toLocaleString('id-ID')}?`);
    if (!confirmCheckout.isConfirmed) return;

    const res = await db.submitPosTransaction(transactionData);
    if (res.success) {
      db.addActivityLog(cashierName, 'Transaksi POS Baru', `Membuat transaksi kasir senilai Rp ${cartTotal.toLocaleString('id-ID')}`);
      setCart([]);
      setConsumerName('');
      setSelectedBookingId('');
      showAlert.success("Transaksi Berhasil!", "Data transaksi belanja POS berhasil dicatat dan stok inventaris telah dikurangi.");
      loadData();
    } else {
      showAlert.error("Checkout Gagal", res.message || 'Gagal menyimpan transaksi.');
    }
  };

  // --- PRODUCT CRUD HANDLERS ---
  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      id_produk: `PRD-${Date.now()}`,
      nama_produk: '',
      kategori: 'Makanan',
      harga_modal: 0,
      harga_jual: 0,
      stok: 0,
      satuan: 'Pcs',
      status: 'Aktif'
    });
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (product) => {
    setEditingProduct(product);
    setProductForm({ ...product });
    setIsProductModalOpen(true);
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    if (!productForm.nama_produk || productForm.harga_jual <= 0 || productForm.stok < 0) {
      showAlert.warning("Input Tidak Valid", "Harap lengkapi semua kolom dengan nilai yang benar.");
      return;
    }

    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const res = await db.saveProduct(productForm);
    if (res.success) {
      db.addActivityLog(adminName, editingProduct ? 'Edit Produk POS' : 'Tambah Produk POS', `${editingProduct ? 'Memperbarui' : 'Menambahkan'} produk: ${productForm.nama_produk}`);
      showAlert.success("Berhasil Disimpan", `Produk "${productForm.nama_produk}" berhasil disimpan.`);
      setIsProductModalOpen(false);
      loadData();
    } else {
      showAlert.error("Gagal Menyimpan", res.message || "Terjadi kesalahan.");
    }
  };

  const handleDeleteProduct = async (product) => {
    const confirmRes = await showAlert.confirm("Hapus Produk", `Apakah Anda yakin ingin menghapus produk "${product.nama_produk}" dari inventaris?`);
    if (!confirmRes.isConfirmed) return;

    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const res = await db.deleteProduct(product.id_produk);
    if (res.success) {
      db.addActivityLog(adminName, 'Hapus Produk POS', `Menghapus produk: ${product.nama_produk}`);
      showAlert.success("Terhapus", "Produk berhasil dihapus dari inventaris.");
      loadData();
    } else {
      showAlert.error("Gagal Menghapus", res.message || "Terjadi kesalahan.");
    }
  };

  // Filter Produk
  const filteredProducts = products.filter(p => {
    const matchCat = category === 'Semua' || p.kategori === category;
    const matchSearch = p.nama_produk.toLowerCase().includes(search.toLowerCase()) || 
                        p.kategori.toLowerCase().includes(search.toLowerCase()) ||
                        p.id_produk.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentFilteredProducts = filteredProducts.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-fraunces font-bold text-2xl sm:text-3xl text-net-charcoal">Point of Sale (POS)</h2>
          <p className="text-xs font-sans text-net-charcoal/60 uppercase tracking-wider mt-0.5">Penjualan Perlengkapan Badminton, Makanan, & Minuman</p>
        </div>
        <button 
          onClick={loadData}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-court-green/10 text-court-green hover:bg-court-green/20 rounded-xl font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-court-green/15"
        >
          <RefreshCw size={14} />
          Segarkan Data
        </button>
      </div>

      {/* Sub-Tab Bar Navigasi */}
      <div className="flex border-b border-rattan-gold/25 font-sans text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => { setPosMode('kasir'); setSearch(''); setCategory('Semua'); }}
          className={`py-2.5 px-5 border-b-2 transition-all cursor-pointer ${
            posMode === 'kasir' ? 'border-court-green text-court-green font-extrabold' : 'border-transparent text-net-charcoal/50 hover:text-net-charcoal'
          }`}
        >
          Kasir Penjualan
        </button>
        <button
          onClick={() => { setPosMode('inventaris'); setSearch(''); setCategory('Semua'); }}
          className={`py-2.5 px-5 border-b-2 transition-all cursor-pointer ${
            posMode === 'inventaris' ? 'border-court-green text-court-green font-extrabold' : 'border-transparent text-net-charcoal/50 hover:text-net-charcoal'
          }`}
        >
          Kelola Inventaris (CRUD)
        </button>
      </div>

      {/* 1. LAYOUT TAB PENJUALAN KASIR */}
      {posMode === 'kasir' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
          
          {/* PANEL KIRI: Katalog Produk */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="Cari produk jualan..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full p-2.5 pl-8 text-xs rounded-xl border border-net-charcoal/20 bg-shuttle-cream/40 focus:outline-none focus:border-rattan-gold font-sans"
                />
                <Search size={14} className="absolute left-2.5 top-3.5 text-net-charcoal/40" />
              </div>

              <div className="flex gap-1 bg-court-green/10 p-1 rounded-xl border border-court-green/10 overflow-x-auto custom-scrollbar shrink-0 max-w-full">
                {['Semua', 'Bola', 'Makanan', 'Minuman'].map(cat => (
                  <button
                    key={cat}
                    onClick={() => setCategory(cat)}
                    className={`py-1 px-3 rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider cursor-pointer transition-all shrink-0 ${
                      category === cat 
                        ? 'bg-court-green text-shuttle-cream shadow' 
                        : 'text-court-green/65 hover:text-court-green'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Grid */}
            {loading ? (
              <p className="text-sm font-sans text-net-charcoal/60 py-10 text-center">Menarik katalog produk...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm font-sans text-net-charcoal/60 py-10 text-center">Produk jualan tidak ditemukan.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredProducts.filter(p => p.status === 'Aktif').map(p => (
                  <div 
                    key={p.id_produk}
                    onClick={() => addToCart(p)}
                    className={`
                      glass-surface-light rounded-xl p-4 border border-net-charcoal/10 flex flex-col justify-between text-left cursor-pointer transition-all duration-200 hover:scale-[1.02] active:scale-[0.99] select-none l-post-corner relative
                      ${p.stok <= 0 ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                    `}
                  >
                    <div>
                      <span className="inline-block py-0.5 px-2 rounded-full bg-court-green/10 text-[9px] font-sans font-bold uppercase text-court-green tracking-wider mb-2">
                        {p.kategori}
                      </span>
                      <h4 className="font-sans font-bold text-xs text-net-charcoal line-clamp-2 leading-snug">
                        {p.nama_produk}
                      </h4>
                    </div>

                    <div className="border-t border-net-charcoal/5 pt-3 mt-3 flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-court-green">
                        Rp {p.harga_jual.toLocaleString('id-ID')}
                      </span>
                      <span className={`text-[10px] font-mono font-semibold ${p.stok < 10 ? 'text-status-danger font-bold' : 'text-net-charcoal/50'}`}>
                        Stok: {p.stok}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

          {/* PANEL KANAN: Keranjang & Checkout */}
          <div className="lg:col-span-5">
            <GlassCard dark lPost className="border border-chalk-line/10 shadow-2xl space-y-4">
              
              <div className="border-b border-chalk-line/15 pb-3 flex items-center justify-between">
                <h3 className="font-fraunces font-bold text-lg text-shuttle-cream flex items-center gap-2">
                  Keranjang Belanja
                </h3>
                <span className="font-mono text-xs font-bold text-court-green bg-smash-lime/20 text-smash-lime py-1 px-3 rounded-full border border-smash-lime/20">
                  {cart.reduce((sum, item) => sum + item.qty, 0)} Pcs
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center text-chalk-line/50 text-xs font-sans space-y-2">
                  <ShoppingBag size={32} className="mx-auto text-chalk-line/30" />
                  <p>Keranjang kasir kosong. <br/>Klik produk di katalog untuk menambahkan.</p>
                </div>
              ) : (
                <div className="divide-y divide-chalk-line/10 max-h-56 overflow-y-auto pr-1 custom-scrollbar text-xs">
                  {cart.map(item => (
                    <div key={item.id_produk} className="py-2.5 flex items-center justify-between gap-3 text-left">
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-shuttle-cream block truncate leading-snug">{item.nama_produk}</span>
                        <span className="font-mono text-[10px] text-chalk-line/60">
                          {item.qty} x Rp {item.harga.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => decreaseQty(item.id_produk)}
                          className="w-6 h-6 rounded bg-chalk-line/10 hover:bg-chalk-line/20 flex items-center justify-center text-shuttle-cream cursor-pointer"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="font-mono font-bold text-sm text-smash-lime w-4 text-center">{item.qty}</span>
                        <button 
                          onClick={() => addToCart({ id_produk: item.id_produk, stok: item.maxStok, nama_produk: item.nama_produk, harga_jual: item.harga })}
                          className="w-6 h-6 rounded bg-chalk-line/10 hover:bg-chalk-line/20 flex items-center justify-center text-shuttle-cream cursor-pointer"
                        >
                          <Plus size={12} />
                        </button>
                        
                        <button 
                          onClick={() => removeFromCart(item.id_produk)}
                          className="text-status-danger/70 hover:text-status-danger p-1 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={handleCheckout} className="border-t border-chalk-line/15 pt-4 space-y-4 text-left text-xs text-shuttle-cream">
                <div className="flex justify-between items-center text-shuttle-cream font-sans border-b border-chalk-line/10 pb-3">
                  <span className="font-bold">Total Pembayaran:</span>
                  <span className="font-mono text-xl font-bold text-smash-lime">
                    Rp {cartTotal.toLocaleString('id-ID')}
                  </span>
                </div>

                {cart.length > 0 && (
                  <div className="space-y-3">
                    <div>
                      <label className="block font-bold text-chalk-line/60 uppercase tracking-wider mb-1">Nama Konsumen (Opsional)</label>
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Umum / Walk-in"
                          value={consumerName}
                          onChange={(e) => setConsumerName(e.target.value)}
                          className="w-full p-2.5 rounded-lg border border-chalk-line/15 bg-court-green/45 text-shuttle-cream pl-8"
                        />
                        <User size={13} className="absolute left-2.5 top-3.5 text-chalk-line/45" />
                      </div>
                    </div>

                    <div>
                      <label className="block font-bold text-chalk-line/60 uppercase tracking-wider mb-1">Hubungkan ke Booking (Opsional)</label>
                      <select
                        value={selectedBookingId}
                        onChange={(e) => setSelectedBookingId(e.target.value)}
                        className="w-full p-2.5 rounded-lg border border-chalk-line/15 bg-court-green/45 text-shuttle-cream"
                      >
                        <option value="">-- Pembelian Lepas (Bukan penyewa lapangan) --</option>
                        {todayBookings.map(b => (
                          <option key={b.id_booking} value={b.id_booking}>
                            {b.id_booking} - {b.nama_pemesan} ({b.id_lapangan})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-chalk-line/60 uppercase tracking-wider mb-1">Metode Pembayaran</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Tunai', 'QRIS', 'Transfer'].map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setPaymentMethod(method)}
                            className={`py-2 border rounded-lg text-[10px] font-sans font-bold uppercase tracking-wider cursor-pointer text-center transition-all ${
                              paymentMethod === method
                                ? 'bg-smash-lime text-net-charcoal border-smash-lime shadow'
                                : 'border-chalk-line/15 text-chalk-line/60 hover:text-shuttle-cream'
                            }`}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-smash-lime text-net-charcoal font-sans font-bold uppercase tracking-widest rounded-xl hover:bg-smash-lime/90 active:scale-[0.98] transition-all shadow-lg text-center cursor-pointer pt-4"
                    >
                      Bayar & Selesaikan Transaksi
                    </button>
                  </div>
                )}
              </form>

            </GlassCard>
          </div>

        </div>
      )}

      {/* 2. LAYOUT TAB KELOLA INVENTARIS PRODUK */}
      {posMode === 'inventaris' && (
        <div className="space-y-4 animate-fade-in text-left">
          {/* Action Row */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:max-w-xs">
              <input
                type="text"
                placeholder="Cari kode/nama produk..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full p-2.5 pl-8 text-xs rounded-xl border border-net-charcoal/20 bg-shuttle-cream/40 focus:outline-none focus:border-rattan-gold font-sans"
              />
              <Search size={14} className="absolute left-2.5 top-3.5 text-net-charcoal/40" />
            </div>

            <button
              onClick={handleOpenAddProduct}
              className="flex items-center justify-center gap-2 py-2.5 px-4 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-court-green/95 active:scale-95 transition-all cursor-pointer w-full sm:w-auto"
            >
              <Plus size={16} />
              <span>Tambah Produk Baru</span>
            </button>
          </div>

          {/* Table list */}
          <GlassCard lPost className="border border-net-charcoal/10 relative p-4">
            {loading ? (
              <p className="text-sm font-sans text-net-charcoal/60 py-10 text-center">Menarik database stok produk...</p>
            ) : filteredProducts.length === 0 ? (
              <p className="text-sm font-sans text-net-charcoal/60 py-10 text-center">Produk jualan kosong.</p>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-net-charcoal/10 text-net-charcoal/50 font-bold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Kode</th>
                      <th className="py-2.5 px-3">Nama Produk</th>
                      <th className="py-2.5 px-3">Kategori</th>
                      <th className="py-2.5 px-3 text-right">Harga Modal</th>
                      <th className="py-2.5 px-3 text-right">Harga Jual</th>
                      <th className="py-2.5 px-3 text-center">Stok Gudang</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                      <th className="py-2.5 px-3 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-net-charcoal/5 font-medium text-net-charcoal/80">
                    {currentFilteredProducts.map(p => (
                      <tr key={p.id_produk} className="hover:bg-court-green/5">
                        <td className="py-3 px-3 font-mono text-[10px] text-net-charcoal/50">{p.id_produk}</td>
                        <td className="py-3 px-3 font-bold text-net-charcoal">{p.nama_produk}</td>
                        <td className="py-3 px-3 uppercase font-semibold text-court-green text-[10px]">{p.kategori}</td>
                        <td className="py-3 px-3 text-right font-mono">Rp {(p.harga_modal || 0).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-court-green">Rp {(p.harga_jual || 0).toLocaleString('id-ID')}</td>
                        <td className="py-3 px-3 text-center font-mono">
                          <span className={`font-bold ${p.stok < 10 ? 'text-status-danger' : 'text-net-charcoal'}`}>{p.stok}</span> {p.satuan}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`inline-block py-0.5 px-2.5 rounded-full text-[9px] font-bold uppercase ${
                            p.status === 'Aktif' 
                              ? 'bg-status-success/20 text-court-green' 
                              : 'bg-status-danger/10 text-status-danger'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right space-x-1.5">
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="inline-flex items-center gap-1 py-1 px-2.5 bg-court-green text-shuttle-cream hover:bg-court-green/90 rounded text-[10px] font-bold uppercase cursor-pointer"
                          >
                            <Edit3 size={10} /> Ubah
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="inline-flex items-center gap-1 py-1 px-2.5 bg-status-danger/15 text-status-danger hover:bg-status-danger/25 rounded text-[10px] font-bold uppercase cursor-pointer"
                          >
                            <Trash2 size={10} /> Hapus
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Kontrol Paginasi POS Inventaris */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-net-charcoal/10 pt-4 mt-4 text-xs font-sans">
                <span className="text-net-charcoal/60">
                  Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredProducts.length)} dari {filteredProducts.length} produk
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="py-1 px-3 border border-net-charcoal/20 bg-shuttle-cream/50 text-net-charcoal hover:bg-net-charcoal/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-all cursor-pointer"
                  >
                    Sebelumnya
                  </button>
                  <span className="font-mono font-bold px-2">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="py-1 px-3 border border-net-charcoal/20 bg-shuttle-cream/50 text-net-charcoal hover:bg-net-charcoal/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-all cursor-pointer"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* PRODUCT ADD/EDIT MODAL OVERLAY */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsProductModalOpen(false)} className="absolute inset-0 bg-net-charcoal/60 backdrop-blur-sm"></div>
          
          <div className="w-full max-w-sm z-10">
            <GlassCard lPost className="p-6 relative border border-rattan-gold/30 text-left">
              <div className="flex items-center justify-between border-b border-rattan-gold/25 pb-3 mb-4">
                <h3 className="font-fraunces font-bold text-xl text-net-charcoal">
                  {editingProduct ? 'Ubah Data Produk' : 'Tambah Produk Baru'}
                </h3>
                <button onClick={() => setIsProductModalOpen(false)} className="text-net-charcoal/50 hover:text-net-charcoal">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleProductSubmit} className="space-y-4 text-xs">
                {/* Nama Produk */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nama Produk</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Pocari Sweat 500ml"
                    value={productForm.nama_produk}
                    onChange={(e) => setProductForm(prev => ({ ...prev, nama_produk: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs"
                  />
                </div>

                {/* Kategori & Satuan */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Kategori</label>
                    <select
                      value={productForm.kategori}
                      onChange={(e) => setProductForm(prev => ({ ...prev, kategori: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans text-xs font-medium"
                    >
                      <option value="Makanan">Makanan</option>
                      <option value="Minuman">Minuman</option>
                      <option value="Bola">Bola (Kok)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Satuan</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Botol / Pcs"
                      value={productForm.satuan}
                      onChange={(e) => setProductForm(prev => ({ ...prev, satuan: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs"
                    />
                  </div>
                </div>

                {/* Harga Modal & Jual */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Harga Modal</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={productForm.harga_modal}
                      onChange={(e) => setProductForm(prev => ({ ...prev, harga_modal: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Harga Jual</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={productForm.harga_jual}
                      onChange={(e) => setProductForm(prev => ({ ...prev, harga_jual: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Stok & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Stok Barang</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={productForm.stok}
                      onChange={(e) => setProductForm(prev => ({ ...prev, stok: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Status</label>
                    <select
                      value={productForm.status}
                      onChange={(e) => setProductForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-court-green text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-court-green/95 transition-all text-xs pt-4 cursor-pointer shadow-md font-sans"
                >
                  Simpan Data Produk
                </button>

              </form>
            </GlassCard>
          </div>
        </div>
      )}

    </div>
  );
}
