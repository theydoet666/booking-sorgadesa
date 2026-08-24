import React, { useState, useEffect } from 'react';
import { 
  Calendar, Search, Filter, Check, X, 
  DollarSign, Plus, RefreshCw, AlertCircle, Edit
} from 'lucide-react';
import { db } from '../../utils/db';
import GlassCard from '../../components/GlassCard';
import { showAlert } from '../../utils/alertHelper';
import { getTodayLocalStr, calculateDurationHours } from '../../utils/dateHelper';

export default function KelolaBooking() {
  const [bookings, setBookings] = useState([]);
  const [courts, setCourts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua');
  const [paymentFilter, setPaymentFilter] = useState('Semua');
  const [selectedDate, setSelectedDate] = useState('');

  // Paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Reset halaman jika filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, paymentFilter, selectedDate]);

  // New manual booking form modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingBookingId, setEditingBookingId] = useState('');
  const [editingBookingSource, setEditingBookingSource] = useState('Admin');
  const [editingBookingStatus, setEditingBookingStatus] = useState('Dikonfirmasi');
  const [newBooking, setNewBooking] = useState({
    id_lapangan: '',
    tanggal: getTodayLocalStr(),
    jam_mulai: '08:00',
    jam_selesai: '09:00',
    nama_pemesan: '',
    no_hp: '',
    catatan: '',
    status_pembayaran: 'Belum Bayar',
    nominal_dibayar: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allBookings = await db.getBookings();
      setBookings(allBookings);

      const dbCourts = await db.getCourts();
      setCourts(dbCourts.filter(c => c.status === 'Aktif'));
      
      if (dbCourts.length > 0) {
        setNewBooking(prev => ({ ...prev, id_lapangan: dbCourts[0].id_lapangan }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Update status pemesanan
  const handleUpdateStatus = async (id, status) => {
    const activeSession = JSON.parse(sessionStorage.getItem('sorga_session'));
    const adminName = activeSession ? activeSession.user.nama : 'Admin';

    const performUpdate = async () => {
      const updates = { status_booking: status, dibuat_oleh: adminName };
      const res = await db.updateBookingStatus(id, updates);
      
      if (res.success) {
        db.addActivityLog(adminName, 'Update Status Booking', `Mengubah status booking ${id} menjadi ${status}`);
        showAlert.success("Status Diperbarui", `Booking ${id} berhasil diubah menjadi ${status}`);
        loadData();
      } else {
        showAlert.error("Gagal Memperbarui", res.message || 'Koneksi error');
      }
    };

    if (status === 'Dibatalkan') {
      const confirmRes = await showAlert.confirm("Batalkan Booking", `Apakah Anda yakin ingin membatalkan penyewaan ${id}?`);
      if (confirmRes.isConfirmed) {
        await performUpdate();
      }
    } else {
      await performUpdate();
    }
  };

  // Update status pembayaran
  const handleUpdatePayment = async (id, payStatus, total) => {
    const activeSession = JSON.parse(sessionStorage.getItem('sorga_session'));
    const adminName = activeSession ? activeSession.user.nama : 'Admin';

    const performPaymentUpdate = async () => {
      const updates = { 
        status_pembayaran: payStatus, 
        nominal_dibayar: payStatus === 'Lunas' ? total : 0 
      };
      const res = await db.updateBookingStatus(id, updates);
      
      if (res.success) {
        db.addActivityLog(adminName, 'Update Pembayaran Booking', `Mengubah pembayaran booking ${id} menjadi ${payStatus}`);
        showAlert.success("Pembayaran Berhasil", `Status pembayaran booking ${id} diubah menjadi ${payStatus}`);
        loadData();
      } else {
        showAlert.error("Gagal Memperbarui", res.message || 'Koneksi error');
      }
    };

    if (payStatus === 'Lunas') {
      const confirmRes = await showAlert.confirm("Konfirmasi Pembayaran Lunas", `Setujui pembayaran Lunas untuk booking ${id}?`);
      if (confirmRes.isConfirmed) {
        await performPaymentUpdate();
      }
    } else {
      await performPaymentUpdate();
    }
  };

  // Buka Modal Tambah Booking
  const handleOpenAddBooking = () => {
    setNewBooking({
      id_lapangan: courts.length > 0 ? courts[0].id_lapangan : '',
      tanggal: getTodayLocalStr(),
      jam_mulai: '08:00',
      jam_selesai: '09:00',
      nama_pemesan: '',
      no_hp: '',
      catatan: '',
      status_pembayaran: 'Belum Bayar',
      nominal_dibayar: 0
    });
    setModalMode('add');
    setIsModalOpen(true);
  };

  // Buka Modal Edit Booking
  const handleOpenEditBooking = (booking) => {
    setNewBooking({
      id_lapangan: booking.id_lapangan,
      tanggal: booking.tanggal,
      jam_mulai: booking.jam_mulai,
      jam_selesai: booking.jam_selesai,
      nama_pemesan: booking.nama_pemesan,
      no_hp: booking.no_hp || '',
      catatan: booking.catatan || '',
      status_pembayaran: booking.status_pembayaran,
      nominal_dibayar: booking.nominal_dibayar || 0
    });
    setEditingBookingId(booking.id_booking);
    setEditingBookingSource(booking.sumber_booking || 'Admin');
    setEditingBookingStatus(booking.status_booking || 'Dikonfirmasi');
    setModalMode('edit');
    setIsModalOpen(true);
  };

  // Submit manual admin booking / Edit booking
  const handleManualBookingSubmit = async (e) => {
    e.preventDefault();
    const activeSession = JSON.parse(sessionStorage.getItem('sorga_session'));
    const adminName = activeSession ? activeSession.user.nama : 'Admin';

    // Hitung total harga
    const court = courts.find(c => c.id_lapangan === newBooking.id_lapangan);
    const duration = calculateDurationHours(newBooking.jam_mulai, newBooking.jam_selesai);

    if (duration <= 0) {
      showAlert.warning("Waktu Sewa Salah", "Jam selesai harus setelah jam mulai!");
      return;
    }

    const total_harga = court ? (court.harga_per_jam * duration) : (50000 * duration);

    // Validasi bentrok jadwal lokal (abaikan pemesanan itu sendiri jika mode edit)
    const isBentrok = bookings.some(b => {
      if (modalMode === 'edit' && b.id_booking === editingBookingId) return false;
      if (b.id_lapangan !== newBooking.id_lapangan) return false;
      if (b.tanggal !== newBooking.tanggal) return false;
      if (b.status_booking === 'Dibatalkan') return false;
      
      return newBooking.jam_mulai < b.jam_selesai && b.jam_mulai < newBooking.jam_selesai;
    });

    if (isBentrok) {
      showAlert.error("Slot Waktu Bentrok", "Slot waktu sewa bentrok dengan booking yang sudah ada!");
      return;
    }

    if (modalMode === 'edit') {
      const bookingData = {
        id_booking: editingBookingId,
        id_lapangan: newBooking.id_lapangan,
        tanggal: newBooking.tanggal,
        jam_mulai: newBooking.jam_mulai,
        jam_selesai: newBooking.jam_selesai,
        nama_pemesan: newBooking.nama_pemesan,
        no_hp: newBooking.no_hp,
        catatan: newBooking.catatan,
        status_booking: editingBookingStatus,
        status_pembayaran: newBooking.status_pembayaran,
        nominal_dibayar: newBooking.status_pembayaran === 'Lunas' ? total_harga : 0,
        total_harga,
        sumber_booking: editingBookingSource,
        dibuat_oleh: adminName
      };

      const res = await db.updateBookingStatus(editingBookingId, bookingData);
      if (res.success) {
        db.addActivityLog(adminName, 'Ubah Data Booking', `Memperbarui booking ${editingBookingId} untuk ${newBooking.nama_pemesan}`);
        setIsModalOpen(false);
        showAlert.success("Booking Diperbarui", `Pemesanan ${editingBookingId} berhasil diperbarui.`);
        loadData();
      } else {
        showAlert.error("Gagal", res.message || "Gagal memperbarui pemesanan.");
      }
      return;
    }

    // Generate Booking ID (BK-YYYYMMDD-Random)
    const dateCompact = newBooking.tanggal.replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const generatedId = `BK-${dateCompact}-${randomSuffix}`;

    const bookingData = {
      ...newBooking,
      id_booking: generatedId,
      total_harga,
      sumber_booking: 'Admin',
      status_booking: 'Dikonfirmasi', // Admin booking auto dikonfirmasi
      nominal_dibayar: newBooking.status_pembayaran === 'Lunas' ? total_harga : 0,
      dibuat_oleh: adminName
    };

    const res = await db.addBooking(bookingData);
    if (res.success) {
      db.addActivityLog(adminName, 'Tambah Booking Manual', `Membuat booking manual ${generatedId} untuk ${bookingData.nama_pemesan}`);
      setIsModalOpen(false);
      showAlert.success("Booking Berhasil", `Pemesanan manual walk-in ${generatedId} berhasil dicatat.`);
      loadData();
    } else {
      showAlert.error("Gagal", res.message || "Gagal mencatat pemesanan.");
    }
  };

  // Filter Logic
  const filteredBookings = bookings.filter(b => {
    const matchSearch = b.nama_pemesan.toLowerCase().includes(search.toLowerCase()) || 
                        b.no_hp.includes(search) || 
                        b.id_booking.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'Semua' || b.status_booking === statusFilter;
    const matchPayment = paymentFilter === 'Semua' || b.status_pembayaran === paymentFilter;
    const matchDate = !selectedDate || b.tanggal === selectedDate;
    
    return matchSearch && matchStatus && matchPayment && matchDate;
  });

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = filteredBookings.slice(indexOfFirstItem, indexOfLastItem);

  // Opsi jam
  const times = [];
  for (let h = 8; h <= 22; h++) {
    const hourStr = String(h).padStart(2, '0');
    times.push(`${hourStr}:00`);
    if (h < 22) {
      times.push(`${hourStr}:30`);
    }
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-fraunces font-bold text-2xl sm:text-3xl text-net-charcoal">Kelola Booking</h2>
          <p className="text-xs font-sans text-net-charcoal/60 uppercase tracking-wider mt-0.5">Daftar Transaksi Penyewaan Lapangan</p>
        </div>
        
        <div className="flex gap-2">
          <button 
            onClick={loadData}
            className="flex items-center justify-center w-10 h-10 border border-net-charcoal/20 text-net-charcoal/70 bg-shuttle-cream hover:bg-net-charcoal/10 rounded-xl transition-all cursor-pointer"
          >
            <RefreshCw size={16} />
          </button>
          
          <button
            onClick={handleOpenAddBooking}
            className="flex items-center justify-center gap-2 py-2.5 px-4 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow hover:bg-court-green/95 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Booking Manual</span>
          </button>
        </div>
      </div>

      {/* Filter Options Widget */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-court-green/5 border border-court-green/10 rounded-2xl p-4">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Cari ID/Nama/WA..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full p-2 pl-8 text-xs rounded-lg border border-net-charcoal/25 bg-shuttle-cream/40 focus:outline-none focus:border-rattan-gold font-sans"
          />
          <Search size={14} className="absolute left-2.5 top-3 text-net-charcoal/40" />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="p-2 text-xs rounded-lg border border-net-charcoal/25 bg-shuttle-cream/40 focus:outline-none focus:border-rattan-gold font-sans"
        >
          <option value="Semua">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Dikonfirmasi">Dikonfirmasi</option>
          <option value="Dibatalkan">Dibatalkan</option>
          <option value="Selesai">Selesai</option>
        </select>

        {/* Payment Filter */}
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="p-2 text-xs rounded-lg border border-net-charcoal/25 bg-shuttle-cream/40 focus:outline-none focus:border-rattan-gold font-sans"
        >
          <option value="Semua">Semua Pembayaran</option>
          <option value="Belum Bayar">Belum Bayar</option>
          <option value="DP">DP</option>
          <option value="Lunas">Lunas</option>
        </select>

        {/* Date Filter */}
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="p-2 text-xs rounded-lg border border-net-charcoal/25 bg-shuttle-cream/40 focus:outline-none focus:border-rattan-gold font-mono"
        />
      </div>

      {/* Main Table */}
      <GlassCard lPost className="border border-net-charcoal/10 relative p-4">
        {loading ? (
          <p className="text-sm font-sans text-net-charcoal/60 py-10 text-center">Menarik database booking...</p>
        ) : filteredBookings.length === 0 ? (
          <p className="text-sm font-sans text-net-charcoal/60 py-10 text-center">Pemesanan tidak ditemukan.</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-net-charcoal/10 text-net-charcoal/60 uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-3">ID & Sumber</th>
                  <th className="py-2.5 px-3">Pemesan & Kontak</th>
                  <th className="py-2.5 px-3">Lapangan & Tanggal</th>
                  <th className="py-2.5 px-3">Jam Sewa</th>
                  <th className="py-2.5 px-3">Biaya</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Bayar</th>
                  <th className="py-2.5 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-net-charcoal/5 font-medium text-net-charcoal">
                {currentBookings.map(b => (
                  <tr key={b.id_booking} className="hover:bg-court-green/5">
                    {/* ID & Sumber */}
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold text-court-green block">{b.id_booking}</span>
                      <span className="text-[10px] text-net-charcoal/50">{b.sumber_booking}</span>
                    </td>
                    {/* Pemesan & Kontak */}
                    <td className="py-3 px-3">
                      <span className="block font-bold">{b.nama_pemesan}</span>
                      <span className="font-mono text-net-charcoal/60">{b.no_hp}</span>
                    </td>
                    {/* Lapangan & Tanggal */}
                    <td className="py-3 px-3">
                      <span className="block font-bold">{b.id_lapangan}</span>
                      <span className="font-mono text-net-charcoal/70">{b.tanggal}</span>
                    </td>
                    {/* Jam Sewa */}
                    <td className="py-3 px-3 font-mono text-net-charcoal/80">
                      {b.jam_mulai} - {b.jam_selesai}
                    </td>
                    {/* Biaya */}
                    <td className="py-3 px-3 font-mono">
                      <span className="block font-bold">Rp {(b.total_harga || 0).toLocaleString('id-ID')}</span>
                      <span className="text-[10px] text-net-charcoal/50">Lunas: Rp {(b.nominal_dibayar || 0).toLocaleString('id-ID')}</span>
                    </td>
                    {/* Status */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block py-0.5 px-2 rounded text-[10px] font-bold uppercase ${
                        b.status_booking === 'Dikonfirmasi' 
                          ? 'bg-status-success/20 text-court-green border border-status-success/30' 
                          : b.status_booking === 'Pending' 
                          ? 'bg-status-pending/20 text-status-pending border border-status-pending/30' 
                          : b.status_booking === 'Selesai' 
                          ? 'bg-court-green/20 text-court-green' 
                          : 'bg-status-danger/10 text-status-danger border border-status-danger/20'
                      }`}>
                        {b.status_booking}
                      </span>
                    </td>
                    {/* Bayar */}
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block py-0.5 px-2 rounded text-[10px] font-bold uppercase ${
                        b.status_pembayaran === 'Lunas' 
                          ? 'bg-status-success/20 text-court-green border border-status-success/30' 
                          : 'bg-status-danger/10 text-status-danger border border-status-danger/20'
                      }`}>
                        {b.status_pembayaran}
                      </span>
                    </td>
                    {/* Aksi */}
                    <td className="py-3 px-3 text-right space-y-1">
                      {/* Konfirmasi Status */}
                      {b.status_booking === 'Pending' && (
                        <button
                          onClick={() => handleUpdateStatus(b.id_booking, 'Dikonfirmasi')}
                          className="inline-flex items-center gap-1 py-1 px-2.5 bg-status-success text-net-charcoal hover:bg-status-success/90 rounded text-[10px] font-bold uppercase cursor-pointer mr-1"
                        >
                          <Check size={10} /> Konfirmasi
                        </button>
                      )}

                      {/* Edit Booking */}
                      {b.status_booking !== 'Dibatalkan' && b.status_booking !== 'Selesai' && (
                        <button
                          onClick={() => handleOpenEditBooking(b)}
                          className="inline-flex items-center gap-1 py-1 px-2.5 bg-court-green/10 text-court-green hover:bg-court-green/20 rounded text-[10px] font-bold uppercase cursor-pointer mr-1"
                        >
                          <Edit size={10} /> Edit
                        </button>
                      )}
                      
                      {/* Batal */}
                      {b.status_booking !== 'Dibatalkan' && b.status_booking !== 'Selesai' && (
                        <button
                          onClick={() => handleUpdateStatus(b.id_booking, 'Dibatalkan')}
                          className="inline-flex items-center gap-1 py-1 px-2.5 bg-status-danger/15 text-status-danger hover:bg-status-danger/25 rounded text-[10px] font-bold uppercase cursor-pointer"
                        >
                          <X size={10} /> Batalkan
                        </button>
                      )}

                      {/* Lunas */}
                      {b.status_pembayaran !== 'Lunas' && b.status_booking !== 'Dibatalkan' && (
                        <button
                          onClick={() => handleUpdatePayment(b.id_booking, 'Lunas', b.total_harga)}
                          className="inline-flex items-center gap-1 py-1 px-2.5 bg-court-green text-shuttle-cream hover:bg-court-green/95 rounded text-[10px] font-bold uppercase cursor-pointer ml-1"
                        >
                          <DollarSign size={10} /> Set Lunas
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Kontrol Paginasi */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-net-charcoal/10 pt-4 mt-4 text-xs font-sans">
            <span className="text-net-charcoal/60">
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredBookings.length)} dari {filteredBookings.length} booking
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

      {/* Manual Admin Booking Form Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-net-charcoal/60 backdrop-blur-sm"></div>
          
          <div className="w-full max-w-md z-10">
            <GlassCard lPost className="p-6 relative max-h-[85vh] overflow-y-auto custom-scrollbar border border-rattan-gold/30">
              <div className="flex items-center justify-between border-b border-rattan-gold/25 pb-3 mb-4">
                <h3 className="font-fraunces font-bold text-xl text-net-charcoal">
                  {modalMode === 'add' ? 'Booking Manual Staf' : 'Edit Data Booking'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-net-charcoal/50 hover:text-net-charcoal">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleManualBookingSubmit} className="space-y-4 text-xs">
                
                {/* Court */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Lapangan</label>
                  <select
                    value={newBooking.id_lapangan}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, id_lapangan: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs font-sans font-medium"
                  >
                    {courts.map(c => (
                      <option key={c.id_lapangan} value={c.id_lapangan}>{c.nama_lapangan}</option>
                    ))}
                  </select>
                </div>

                {/* Date */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Tanggal</label>
                  <input
                    type="date"
                    required
                    value={newBooking.tanggal}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, tanggal: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono text-xs"
                  />
                </div>

                {/* Waktu */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Mulai</label>
                    <select
                      value={newBooking.jam_mulai}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewBooking(prev => {
                          let newEnd = prev.jam_selesai;
                          if (newEnd <= val) {
                            const [h, m] = val.split(':').map(Number);
                            let endH = (h || 8) + 1;
                            let endM = m || 0;
                            if (endH >= 22) {
                              endH = 22;
                              endM = 0;
                            }
                            newEnd = String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0');
                          }
                          return { ...prev, jam_mulai: val, jam_selesai: newEnd };
                        });
                      }}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono text-xs"
                    >
                      {times.filter(t => t !== '22:00').map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Selesai</label>
                    <select
                      value={newBooking.jam_selesai}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, jam_selesai: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono text-xs"
                    >
                      {times.filter(t => t > newBooking.jam_mulai).map(t => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Customer Info */}
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nama Pemesan</label>
                    <input
                      type="text"
                      required
                      placeholder="Nama pelanggan walk-in"
                      value={newBooking.nama_pemesan}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, nama_pemesan: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">No. WhatsApp</label>
                    <input
                      type="tel"
                      required
                      placeholder="0812345678"
                      value={newBooking.no_hp}
                      onChange={(e) => setNewBooking(prev => ({ ...prev, no_hp: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Catatan</label>
                  <textarea
                    placeholder="Sewa alat/opsional"
                    value={newBooking.catatan}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, catatan: e.target.value }))}
                    rows={1}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs resize-none"
                  />
                </div>

                {/* Pembayaran */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Status Pembayaran</label>
                  <select
                    value={newBooking.status_pembayaran}
                    onChange={(e) => setNewBooking(prev => ({ ...prev, status_pembayaran: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs"
                  >
                    <option value="Belum Bayar">Belum Bayar</option>
                    <option value="Lunas">Lunas (Sewa Langsung)</option>
                  </select>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  className="w-full py-3 bg-court-green text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-court-green/95 transition-all text-xs pt-3.5 cursor-pointer shadow-md"
                >
                  {modalMode === 'add' ? 'Simpan Booking Baru' : 'Perbarui Booking'}
                </button>

              </form>
            </GlassCard>
          </div>
        </div>
      )}

    </div>
  );
}
