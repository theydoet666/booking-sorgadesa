import React, { useState, useEffect } from 'react';
import { RefreshCw, BarChart3, TrendingUp, Calendar, ShoppingBag, PieChart } from 'lucide-react';
import { db } from '../../utils/db';
import GlassCard from '../../components/GlassCard';
import { getTodayLocalStr, shiftDateStr, calculateDurationHours } from '../../utils/dateHelper';

export default function LaporanKeuangan() {
  const [startDate, setStartDate] = useState(() => {
    return shiftDateStr(getTodayLocalStr(), -7);
  });
  const [endDate, setEndDate] = useState(() => {
    return getTodayLocalStr();
  });

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    bookingRevenue: 0,
    posRevenue: 0,
    totalRevenue: 0,
    posProfit: 0,
    bookedHours: 0,
    occupancyPct: 0
  });

  const [courtPerformance, setCourtPerformance] = useState([]);
  const [posPerformance, setPosPerformance] = useState([]);

  // Paginasi
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Reset halaman jika filter tanggal berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [startDate, endDate]);

  const totalPages = Math.ceil(posPerformance.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPosPerformance = posPerformance.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate]);

  const loadReportData = async () => {
    setLoading(true);
    try {
      // 1. Ambil data mentah
      const courts = await db.getCourts();
      const bookings = await db.getBookings();
      const transactions = await db.getTransactions();
      const products = await db.getProducts();

      // Hitung selisih hari
      const [sy, sm, sd] = startDate.split('-').map(Number);
      const [ey, em, ed] = endDate.split('-').map(Number);
      const startD = new Date(sy, (sm || 1) - 1, sd || 1);
      const endD = new Date(ey, (em || 1) - 1, ed || 1);
      const diffTime = Math.abs(endD - startD);
      const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      const maxHoursPerCourt = totalDays * 14; // 14 jam operasional/hari

      // 2. Filter bookings dalam rentang tanggal
      const filteredBookings = bookings.filter(b => 
        b.status_booking !== 'Dibatalkan' && 
        b.tanggal >= startDate && 
        b.tanggal <= endDate
      );

      // Hitung Omset Booking & Jam Terpakai
      let bookingRevenue = 0;
      let totalBookedHours = 0;
      const courtStats = {};
      
      courts.forEach(c => {
        courtStats[c.id_lapangan] = {
          id_lapangan: c.id_lapangan,
          nama_lapangan: c.nama_lapangan,
          total_booking: 0,
          total_jam: 0,
          revenue: 0,
          okupansi_pct: 0
        };
      });

      filteredBookings.forEach(b => {
        const duration = calculateDurationHours(b.jam_mulai, b.jam_selesai);
        const bookingPrice = Number(b.total_harga || 0);
        
        bookingRevenue += bookingPrice;
        totalBookedHours += duration;

        if (courtStats[b.id_lapangan]) {
          courtStats[b.id_lapangan].total_booking++;
          courtStats[b.id_lapangan].total_jam += duration;
          courtStats[b.id_lapangan].revenue += bookingPrice;
        }
      });

      // Hitung okupansi per lapangan
      const courtPerfArray = Object.keys(courtStats).map(key => {
        const stat = courtStats[key];
        const pct = maxHoursPerCourt > 0 ? (stat.total_jam / maxHoursPerCourt) * 100 : 0;
        stat.okupansi_pct = Math.min(100, Math.round(pct));
        return stat;
      });
      setCourtPerformance(courtPerfArray);

      // 3. Filter transaksi POS dalam rentang tanggal
      const filteredTransactions = transactions.filter(t => {
        const tDate = t.tanggal.split('T')[0];
        return tDate >= startDate && tDate <= endDate;
      });

      let posRevenue = 0;
      let posProfit = 0;
      const posStats = {
        'Bola': { kategori: 'Bola', qty: 0, omset: 0, profit: 0 },
        'Makanan': { kategori: 'Makanan', qty: 0, omset: 0, profit: 0 },
        'Minuman': { kategori: 'Minuman', qty: 0, omset: 0, profit: 0 }
      };

      filteredTransactions.forEach(t => {
        posRevenue += Number(t.total_belanja);
        
        // Iterasi item belanja
        if (t.daftar_item) {
          t.daftar_item.forEach(item => {
            const p = products.find(prod => prod.id_produk === item.id_produk);
            const modal = p ? p.harga_modal : item.harga * 0.7; // Fallback profit margin jika tidak ada data modal
            const itemProfit = (item.harga - modal) * item.qty;
            posProfit += itemProfit;

            const kat = p ? p.kategori : 'Makanan';
            if (posStats[kat]) {
              posStats[kat].qty += item.qty;
              posStats[kat].omset += item.harga * item.qty;
              posStats[kat].profit += itemProfit;
            }
          });
        }
      });

      const posPerfArray = Object.values(posStats);
      setPosPerformance(posPerfArray);

      // 4. Hitung Okupansi Keseluruhan
      const activeCourtsCount = courts.filter(c => c.status === 'Aktif').length;
      const totalMaxCapacityHours = activeCourtsCount * maxHoursPerCourt;
      const overallOccupancy = totalMaxCapacityHours > 0 ? (totalBookedHours / totalMaxCapacityHours) * 100 : 0;

      setSummary({
        bookingRevenue,
        posRevenue,
        totalRevenue: bookingRevenue + posRevenue,
        posProfit,
        bookedHours: totalBookedHours,
        occupancyPct: Math.min(100, Math.round(overallOccupancy))
      });

    } catch (err) {
      console.error("Gagal memproses laporan data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-fraunces font-bold text-2xl sm:text-3xl text-net-charcoal">Laporan Keuangan & Okupansi</h2>
          <p className="text-xs font-sans text-net-charcoal/60 uppercase tracking-wider mt-0.5">Analisis Kinerja Bisnis Bulutangkis & POS</p>
        </div>
        <button 
          onClick={loadReportData}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-court-green/10 text-court-green hover:bg-court-green/20 rounded-xl font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-court-green/15"
        >
          <RefreshCw size={14} />
          Segarkan Laporan
        </button>
      </div>

      {/* Date Filters Widget */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-court-green/5 border border-court-green/10 rounded-2xl p-4 font-sans text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar size={14} className="text-net-charcoal/50" />
          <span className="font-bold text-net-charcoal/70 uppercase">Mulai Tanggal:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="p-1.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/50 font-mono text-xs focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar size={14} className="text-net-charcoal/50" />
          <span className="font-bold text-net-charcoal/70 uppercase">Sampai Tanggal:</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="p-1.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/50 font-mono text-xs focus:outline-none"
          />
        </div>
      </div>

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Omset Lapangan */}
        <GlassCard className="text-left flex flex-col justify-between border border-net-charcoal/10 p-5 relative">
          <span className="text-[10px] uppercase font-sans font-bold text-net-charcoal/50 tracking-wider">Omset Sewa Lapangan</span>
          <span className="font-mono text-lg font-bold text-court-green mt-1">Rp {summary.bookingRevenue.toLocaleString('id-ID')}</span>
        </GlassCard>

        {/* Omset POS */}
        <GlassCard className="text-left flex flex-col justify-between border border-net-charcoal/10 p-5 relative">
          <span className="text-[10px] uppercase font-sans font-bold text-net-charcoal/50 tracking-wider">Omset Penjualan POS</span>
          <span className="font-mono text-lg font-bold text-court-green mt-1">Rp {summary.posRevenue.toLocaleString('id-ID')}</span>
        </GlassCard>

        {/* Omset Gabungan */}
        <GlassCard className="text-left flex flex-col justify-between border border-net-charcoal/10 p-5 relative bg-court-green/5">
          <span className="text-[10px] uppercase font-sans font-bold text-net-charcoal/50 tracking-wider">Omset Gabungan</span>
          <span className="font-mono text-lg font-bold text-court-green mt-1">Rp {summary.totalRevenue.toLocaleString('id-ID')}</span>
        </GlassCard>

        {/* Keuntungan POS */}
        <GlassCard className="text-left flex flex-col justify-between border border-net-charcoal/10 p-5 relative bg-smash-lime/10">
          <span className="text-[10px] uppercase font-sans font-bold text-court-green/70 tracking-wider">Estimasi Laba Kotor POS</span>
          <span className="font-mono text-lg font-bold text-court-green mt-1">Rp {summary.posProfit.toLocaleString('id-ID')}</span>
        </GlassCard>

      </div>

      {/* Detail Laporan Grid (Sewa Lapangan vs POS) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* LAPANGAN OKUPANSI & REVENUE */}
        <GlassCard lPost className="border border-net-charcoal/10 relative p-4 space-y-4">
          <div className="border-b border-rattan-gold/15 pb-3 flex items-center justify-between">
            <h3 className="font-fraunces font-bold text-base text-net-charcoal flex items-center gap-2">
              <TrendingUp size={16} className="text-court-green" />
              Okupansi & Omset Lapangan
            </h3>
            <span className="font-mono text-xs font-bold text-court-green bg-court-green/10 py-0.5 px-2.5 rounded-full border border-court-green/15">
              Rata-rata: {summary.occupancyPct}%
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-net-charcoal/50 py-6 text-center">Menghitung...</p>
          ) : (
            <div className="space-y-4">
              {courtPerformance.map(c => (
                <div key={c.id_lapangan} className="space-y-1.5 text-xs text-net-charcoal">
                  <div className="flex justify-between font-bold">
                    <span>{c.nama_lapangan}</span>
                    <span className="font-mono text-court-green">Rp {c.revenue.toLocaleString('id-ID')} ({c.total_jam} Jam / {c.okupansi_pct}%)</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2.5 bg-court-green/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        c.okupansi_pct > 60 
                          ? 'bg-court-green' 
                          : c.okupansi_pct > 30 
                          ? 'bg-rattan-gold' 
                          : 'bg-status-danger'
                      }`}
                      style={{ width: `${c.okupansi_pct}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* POS PENJUALAN KATEGORI & LABA */}
        <GlassCard lPost className="border border-net-charcoal/10 relative p-4 space-y-4">
          <div className="border-b border-rattan-gold/15 pb-3 flex items-center justify-between">
            <h3 className="font-fraunces font-bold text-base text-net-charcoal flex items-center gap-2">
              <PieChart size={16} className="text-court-green" />
              Kategori Penjualan POS
            </h3>
            <span className="font-mono text-xs font-bold text-court-green bg-court-green/10 py-0.5 px-2.5 rounded-full border border-court-green/15">
              Laba: Rp {summary.posProfit.toLocaleString('id-ID')}
            </span>
          </div>

          {loading ? (
            <p className="text-xs text-net-charcoal/50 py-6 text-center">Menghitung...</p>
          ) : (
             <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left font-sans text-xs border-collapse">
                <thead>
                  <tr className="border-b border-net-charcoal/10 text-net-charcoal/50 font-bold uppercase tracking-wider">
                    <th className="py-2 px-1">Kategori</th>
                    <th className="py-2 px-1 text-center">Qty Terjual</th>
                    <th className="py-2 px-1 text-right">Omset</th>
                    <th className="py-2 px-1 text-right">Estimasi Laba</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-net-charcoal/5 font-medium text-net-charcoal/80">
                  {currentPosPerformance.map(p => (
                    <tr key={p.kategori} className="hover:bg-court-green/5">
                      <td className="py-2.5 px-1 font-bold text-net-charcoal">{p.kategori}</td>
                      <td className="py-2.5 px-1 text-center font-mono">{p.qty} Pcs</td>
                      <td className="py-2.5 px-1 text-right font-mono">Rp {p.omset.toLocaleString('id-ID')}</td>
                      <td className="py-2.5 px-1 text-right font-mono text-court-green font-bold">
                        Rp {p.profit.toLocaleString('id-ID')}
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
                Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, posPerformance.length)} dari {posPerformance.length} data
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

    </div>
  );
}
