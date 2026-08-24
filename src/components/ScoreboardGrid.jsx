import React from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { getOperationalHours } from '../utils/mockData';
import { getTodayLocalStr, shiftDateStr, timeToMinutes, isValidTimeFormat } from '../utils/dateHelper';

export default function ScoreboardGrid({ 
  selectedDate, 
  setSelectedDate, 
  courts, 
  bookings, 
  onSlotClick 
}) {
  const hours = getOperationalHours();
  const activeCourts = courts.filter(c => c.status !== 'Non-Aktif');

  // Format tanggal lengkap Bahasa Indonesia
  const formatDateFull = (dateStr) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, (m || 1) - 1, d || 1);
    return dateObj.toLocaleDateString('id-ID', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Navigasi Tanggal (Aman dari UTC timezone shift)
  const handlePrevDay = () => {
    setSelectedDate(shiftDateStr(selectedDate, -1));
  };

  const handleNextDay = () => {
    setSelectedDate(shiftDateStr(selectedDate, 1));
  };

  const isPastSlot = (dateStr, timeStr) => {
    const localToday = getTodayLocalStr();
    if (dateStr < localToday) return true;
    if (dateStr > localToday) return false;
    
    if (!isValidTimeFormat(timeStr)) return false;
    const today = new Date();
    const currH = today.getHours();
    const currM = today.getMinutes();
    
    const slotMinutes = timeToMinutes(timeStr);
    const currMinutes = currH * 60 + currM;
    
    return slotMinutes < currMinutes;
  };

  // Helper untuk mencari booking di slot lapangan & jam tertentu
  const checkSlotStatus = (court, hour) => {
    // Jika Lapangan berstatus Maintenance secara permanen atau temporer
    if (court.status === 'Maintenance') {
      return { type: 'maintenance', label: 'Tutup' };
    }

    // Cari booking aktif
    const booking = bookings.find(b => {
      if (b.id_lapangan !== court.id_lapangan) return false;
      if (b.status_booking === 'Dibatalkan') return false;
      
      const slotTime = timeToMinutes(hour);
      const startTime = timeToMinutes(b.jam_mulai);
      const endTime = timeToMinutes(b.jam_selesai);
      
      return slotTime >= startTime && slotTime < endTime;
    });

    if (booking) {
      if (booking.status_booking === 'Pending') {
        return { type: 'pending', label: 'Pending', booking };
      }
      return { type: 'booked', label: 'Terisi', booking };
    }

    return { type: 'available', label: 'Tersedia' };
  };

  return (
    <div className="flex flex-col w-full bg-court-green/30 rounded-3xl border border-rattan-gold/25 p-4 sm:p-6 backdrop-blur-md">
      
      {/* Pengontrol Tanggal */}
      <div className="flex items-center justify-between mb-6">
        <button 
          onClick={handlePrevDay}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-rattan-gold/30 text-rattan-gold hover:bg-court-green/50 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>
        
        <h3 className="text-sm sm:text-base md:text-lg font-sans font-bold text-shuttle-cream text-center">
          {formatDateFull(selectedDate)}
        </h3>

        <button 
          onClick={handleNextDay}
          className="flex items-center justify-center w-10 h-10 rounded-full border border-rattan-gold/30 text-rattan-gold hover:bg-court-green/50 active:scale-95 transition-all cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Grid Scoreboard */}
      <div className="w-full overflow-x-auto custom-scrollbar border border-net-charcoal/50 rounded-2xl">
        <table className="w-full min-w-[500px] border-collapse bg-net-charcoal/40 text-center font-mono">
          
          {/* Header */}
          <thead>
            <tr className="border-b border-net-charcoal bg-court-green/80 text-shuttle-cream">
              <th className="py-4 px-3 text-xs uppercase font-sans font-bold border-r border-net-charcoal w-24">Jam</th>
              {activeCourts.map(court => (
                <th key={court.id_lapangan} className="py-4 px-3 text-xs uppercase font-sans font-bold border-r border-net-charcoal last:border-r-0">
                  {court.nama_lapangan}
                  {court.status === 'Maintenance' && (
                    <span className="block text-[9px] font-sans font-normal text-status-danger mt-0.5">(Perbaikan)</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {hours.map(hour => {
              const startHour = hour;
              const [h, m] = hour.split(':').map(Number);
              let nextH = h;
              let nextM = m + 30;
              if (nextM >= 60) {
                nextH += 1;
                nextM = 0;
              }
              const endHour = String(nextH).padStart(2, '0') + ':' + String(nextM).padStart(2, '0');

              return (
                <tr key={hour} className="border-b border-net-charcoal/50 last:border-b-0 hover:bg-court-green/10">
                  {/* Jam Column */}
                  <td className="py-3 px-2 font-mono text-sm font-bold text-shuttle-cream border-r border-net-charcoal/50 w-24 bg-court-green/20">
                    {startHour} - {endHour}
                  </td>
                  
                  {/* Court Columns */}
                  {activeCourts.map(court => {
                    const status = checkSlotStatus(court, hour);

                    if (status.type === 'maintenance') {
                      return (
                        <td 
                          key={court.id_lapangan} 
                          className="py-2 px-1 border-r border-net-charcoal/50 last:border-r-0 bg-status-inactive/10 text-xs font-sans font-semibold select-none"
                        >
                          <span className="inline-block py-0.5 px-2 rounded bg-net-charcoal/30 text-chalk-line/50 border border-chalk-line/10 font-medium">
                            Tutup
                          </span>
                        </td>
                      );
                    }

                    if (status.type === 'pending') {
                      return (
                        <td 
                          key={court.id_lapangan} 
                          className="py-2 px-1 border-r border-net-charcoal/50 last:border-r-0 bg-status-pending/10 text-xs font-sans font-bold select-none"
                          title={`Dipesan oleh: ${status.booking.nama_pemesan}`}
                        >
                          <span className="inline-block py-1 px-2.5 rounded bg-status-pending text-net-charcoal border border-status-pending/40 font-bold">
                            Menunggu
                          </span>
                        </td>
                      );
                    }

                    if (status.type === 'booked') {
                      return (
                        <td 
                          key={court.id_lapangan} 
                          className="py-2 px-1 border-r border-net-charcoal/50 last:border-r-0 bg-status-danger/10 text-xs font-sans font-bold select-none"
                          title="Slot Lapangan Terisi"
                        >
                          <span className="inline-block py-1 px-3 rounded bg-status-danger text-shuttle-cream border border-status-danger/40 font-bold text-shadow-sm">
                            Terisi
                          </span>
                        </td>
                      );
                    }

                    // Past slot check
                    if (isPastSlot(selectedDate, hour)) {
                      return (
                        <td 
                          key={court.id_lapangan} 
                          className="py-2 px-1 border-r border-net-charcoal/50 last:border-r-0 bg-net-charcoal/25 text-shuttle-cream/30 text-xs font-sans font-medium select-none"
                        >
                          Selesai
                        </td>
                      );
                    }

                    // Available cell
                    return (
                      <td 
                        key={court.id_lapangan} 
                        className="py-2 px-1 border-r border-net-charcoal/50 last:border-r-0 bg-transparent text-xs font-sans font-medium transition-all duration-200"
                      >
                        <button
                          onClick={() => onSlotClick(court.id_lapangan, selectedDate, startHour)}
                          className="group w-full py-1.5 px-1 rounded-md text-status-success bg-status-success/5 hover:bg-status-success hover:text-net-charcoal border border-status-success/20 hover:border-transparent flex items-center justify-center gap-1 transition-all cursor-pointer font-sans font-bold"
                        >
                          <Plus size={14} className="group-hover:scale-110 transition-all" />
                          <span className="text-[11px] uppercase tracking-wider group-hover:block hidden">Pesan</span>
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

        </table>
      </div>

      {/* Legend / Keterangan Status */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-6 text-xs text-shuttle-cream font-sans font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-status-success border border-status-success/35"></span>
          <span>Tersedia</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-status-pending border border-status-pending/40"></span>
          <span>Menunggu Konfirmasi</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-status-danger border border-status-danger/45"></span>
          <span>Terisi / Sewa Aktif</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-status-inactive border border-status-inactive/35"></span>
          <span>Tutup Lapangan</span>
        </div>
      </div>

    </div>
  );
}
