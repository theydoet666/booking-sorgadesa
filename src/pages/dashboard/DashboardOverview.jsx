import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, ShoppingBag, Percent, AlertTriangle, 
  Plus, ShoppingCart, BarChart3, CheckCircle2, RefreshCw 
} from 'lucide-react';
import { db } from '../../utils/db';
import GlassCard from '../../components/GlassCard';
import { getTodayLocalStr, calculateDurationHours } from '../../utils/dateHelper';

export default function DashboardOverview() {
  const [stats, setStats] = useState({
    totalBookings: 0,
    omsetHariIni: 0,
    okupansiPct: 0,
    stokMenipis: 0
  });
  const [todayBookings, setTodayBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(todayBookings.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBookings = todayBookings.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    loadOverviewData();
  }, []);

  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const todayStr = getTodayLocalStr();
      
      // Fetch courts
      const courts = await db.getCourts();
      const activeCourtsCount = courts.filter(c => c.status === 'Aktif').length;

      // Fetch bookings for today
      const bookingsToday = await db.getBookings(todayStr);
      setTodayBookings(bookingsToday);

      // Fetch transactions
      const transactions = await db.getTransactions();
      const todayTrx = transactions.filter(t => t.tanggal && (t.tanggal.split('T')[0] === todayStr || t.tanggal === todayStr));

      // Fetch products to count low stock
      const products = await db.getProducts();
      const lowStockCount = products.filter(p => p.status === 'Aktif' && p.stok < 10).length;

      // Calculate Revenues
      const bookingOmset = bookingsToday
        .filter(b => b.status_booking !== 'Dibatalkan')
        .reduce((sum, curr) => sum + Number(curr.total_harga || 0), 0);
      
      const posOmset = todayTrx.reduce((sum, curr) => sum + Number(curr.total_belanja || 0), 0);
      const totalOmset = bookingOmset + posOmset;

      // Calculate Occupancy
      // Max capacity today = active courts * 14 hours (08:00 - 22:00)
      const maxHours = activeCourtsCount * 14;
      const bookedHours = bookingsToday
        .filter(b => b.status_booking !== 'Dibatalkan')
        .reduce((sum, curr) => {
          const duration = calculateDurationHours(curr.jam_mulai, curr.jam_selesai);
          return sum + duration;
        }, 0);
      
      const occupancy = maxHours > 0 ? Math.round((bookedHours / maxHours) * 100) : 0;

      setStats({
        totalBookings: bookingsToday.filter(b => b.status_booking !== 'Dibatalkan').length,
        omsetHariIni: totalOmset,
        okupansiPct: occupancy,
        stokMenipis: lowStockCount
      });

    } catch (err) {
      console.error("Gagal memuat ringkasan overview:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title & Refresh Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-fraunces font-bold text-2xl sm:text-3xl text-net-charcoal">Ringkasan Hari Ini</h2>
          <p className="text-xs font-sans text-net-charcoal/60 uppercase tracking-wider mt-0.5">Status & Aktivitas Lapangan Real-time</p>
        </div>
        <button 
          onClick={loadOverviewData}
          disabled={loading}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-court-green/10 text-court-green hover:bg-court-green/20 rounded-xl font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-court-green/15"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Segarkan Data
        </button>
      </div>

      {/* KPI Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Bookings */}
        <GlassCard className="flex items-center gap-4 border border-net-charcoal/10 relative p-5">
          <div className="w-12 h-12 rounded-2xl bg-court-green/15 text-court-green flex items-center justify-center">
            <Calendar size={22} />
          </div>
          <div className="text-left flex flex-col">
            <span className="text-[10px] uppercase font-sans font-bold text-net-charcoal/50 tracking-wider">Booking Aktif</span>
            <span className="font-fraunces text-2xl font-bold text-net-charcoal mt-0.5">{stats.totalBookings} Slot</span>
          </div>
        </GlassCard>

        {/* Omset Hari Ini */}
        <GlassCard className="flex items-center gap-4 border border-net-charcoal/10 relative p-5">
          <div className="w-12 h-12 rounded-2xl bg-rattan-gold/15 text-rattan-gold flex items-center justify-center">
            <ShoppingBag size={22} />
          </div>
          <div className="text-left flex flex-col">
            <span className="text-[10px] uppercase font-sans font-bold text-net-charcoal/50 tracking-wider">Omset Hari Ini</span>
            <span className="font-mono text-lg font-bold text-court-green mt-0.5">Rp {stats.omsetHariIni.toLocaleString('id-ID')}</span>
          </div>
        </GlassCard>

        {/* Okupansi Lapangan */}
        <GlassCard className="flex items-center gap-4 border border-net-charcoal/10 relative p-5">
          <div className="w-12 h-12 rounded-2xl bg-smash-lime/20 text-court-green flex items-center justify-center">
            <Percent size={22} />
          </div>
          <div className="text-left flex flex-col">
            <span className="text-[10px] uppercase font-sans font-bold text-net-charcoal/50 tracking-wider">Tingkat Okupansi</span>
            <span className="font-fraunces text-2xl font-bold text-net-charcoal mt-0.5">{stats.okupansiPct}% Jam</span>
          </div>
        </GlassCard>

        {/* Low Stock Alert */}
        <GlassCard className={`flex items-center gap-4 border p-5 relative ${
          stats.stokMenipis > 0 
            ? 'bg-status-danger/5 border-status-danger/25 text-status-danger' 
            : 'border-net-charcoal/10 text-net-charcoal'
        }`}>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            stats.stokMenipis > 0 ? 'bg-status-danger/15 text-status-danger' : 'bg-status-inactive/15 text-status-inactive'
          }`}>
            <AlertTriangle size={22} />
          </div>
          <div className="text-left flex flex-col">
            <span className="text-[10px] uppercase font-sans font-bold text-net-charcoal/50 tracking-wider">Stok Produk &lt; 10</span>
            <span className="font-fraunces text-2xl font-bold mt-0.5">{stats.stokMenipis} Item</span>
          </div>
        </GlassCard>

      </div>

      {/* Quick Actions Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
        <button
          onClick={() => navigate('/admin/bookings')}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-court-green/95 shadow cursor-pointer text-center"
        >
          <Plus size={16} />
          <span>Booking Baru</span>
        </button>
        <button
          onClick={() => navigate('/admin/pos')}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-smash-lime text-net-charcoal font-sans font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-smash-lime/95 shadow cursor-pointer text-center"
        >
          <ShoppingCart size={16} />
          <span>Kasir POS</span>
        </button>
        <button
          onClick={() => navigate('/admin/reports')}
          className="flex items-center justify-center gap-2 py-3 px-4 bg-shuttle-cream border border-rattan-gold/45 text-net-charcoal font-sans font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-shuttle-cream/90 shadow cursor-pointer text-center"
        >
          <BarChart3 size={16} />
          <span>Laporan</span>
        </button>
      </div>

      {/* Today's Booking Agenda Scoreboard */}
      <GlassCard lPost className="border border-net-charcoal/10 relative">
        <div className="border-b border-rattan-gold/15 pb-4 mb-4 flex items-center justify-between">
          <h3 className="font-fraunces font-bold text-lg text-net-charcoal">Jadwal Pemesanan Hari Ini</h3>
          <span className="font-mono text-xs font-bold text-court-green bg-court-green/10 py-1 px-3 rounded-full border border-court-green/15">
            {todayBookings.length} Pemesanan
          </span>
        </div>

        {loading ? (
          <p className="text-sm font-sans text-net-charcoal/60 py-6 text-center">Sedang menarik jadwal hari ini...</p>
        ) : todayBookings.length === 0 ? (
          <p className="text-sm font-sans text-net-charcoal/60 py-10 text-center">Belum ada pemesanan untuk hari ini.</p>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-net-charcoal/10 text-net-charcoal/60 uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-3">ID Booking</th>
                  <th className="py-2.5 px-3">Nama Pemesan</th>
                  <th className="py-2.5 px-3">Lapangan</th>
                  <th className="py-2.5 px-3">Jam Sewa</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Pembayaran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-net-charcoal/5 font-medium text-net-charcoal">
                {currentBookings.map(b => (
                  <tr key={b.id_booking} className="hover:bg-court-green/5">
                    <td className="py-3 px-3 font-mono font-bold text-court-green">{b.id_booking}</td>
                    <td className="py-3 px-3">{b.nama_pemesan}</td>
                    <td className="py-3 px-3 font-semibold">{b.id_lapangan}</td>
                    <td className="py-3 px-3 font-mono text-net-charcoal/80">{b.jam_mulai} - {b.jam_selesai}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block py-0.5 px-2.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status_booking === 'Dikonfirmasi' 
                          ? 'bg-status-success/20 text-court-green border border-status-success/30' 
                          : b.status_booking === 'Pending' 
                          ? 'bg-status-pending/20 text-status-pending border border-status-pending/30' 
                          : 'bg-status-danger/10 text-status-danger border border-status-danger/20'
                      }`}>
                        {b.status_booking}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block py-0.5 px-2.5 rounded-full text-[10px] font-bold uppercase ${
                        b.status_pembayaran === 'Lunas' 
                          ? 'bg-status-success/20 text-court-green border border-status-success/30' 
                          : 'bg-status-danger/10 text-status-danger border border-status-danger/20'
                      }`}>
                        {b.status_pembayaran}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Kontrol Paginasi */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-net-charcoal/10 pt-4 mt-4 text-xs font-sans">
            <span className="text-net-charcoal/60">
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, todayBookings.length)} dari {todayBookings.length} booking
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
  );
}
