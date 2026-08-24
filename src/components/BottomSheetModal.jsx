import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Phone, Clipboard, AlertCircle } from 'lucide-react';
import GlassCard from './GlassCard';
import { showAlert } from '../utils/alertHelper';
import { getTodayLocalStr, isValidTimeFormat, calculateDurationHours } from '../utils/dateHelper';

export default function BottomSheetModal({ 
  isOpen, 
  onClose, 
  courts, 
  initialCourt = '', 
  initialDate = '', 
  initialTime = '', 
  settings = {},
  onSubmit 
}) {
  const [courtId, setCourtId] = useState(initialCourt);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState(initialTime);
  const [endTime, setEndTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [totalPrice, setTotalPrice] = useState(0);

  // Sync initial props when modal opens
  useEffect(() => {
    if (isOpen) {
      setCourtId(initialCourt || (courts.length > 0 ? courts[0].id_lapangan : ''));
      setDate(initialDate || getTodayLocalStr());
      
      const validStart = isValidTimeFormat(initialTime) ? initialTime : '08:00';
      setStartTime(validStart);
      
      const [h, m] = validStart.split(':').map(Number);
      let endH = (h || 8) + 1;
      let endM = m || 0;
      if (endH >= 22) {
        endH = 22;
        endM = 0;
      }
      setEndTime(String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0'));
    }
  }, [isOpen, initialCourt, initialDate, initialTime, courts]);

  // Hitung total harga otomatis
  useEffect(() => {
    const court = courts.find(c => c.id_lapangan === courtId);
    if (!court || !startTime || !endTime || !isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      setTotalPrice(0);
      return;
    }

    const duration = calculateDurationHours(startTime, endTime);
    if (duration > 0) {
      setTotalPrice(court.harga_per_jam * duration);
    } else {
      setTotalPrice(0);
    }
  }, [courtId, startTime, endTime, courts]);

  if (!isOpen) return null;

  // Daftar opsi jam mulai (08:00 - 21:30)
  const startTimes = [];
  for (let h = 8; h <= 21; h++) {
    const hourStr = String(h).padStart(2, '0');
    startTimes.push(`${hourStr}:00`);
    startTimes.push(`${hourStr}:30`);
  }

  // Daftar opsi jam selesai (wajib > jam mulai)
  const getEndTimes = () => {
    if (!startTime || !isValidTimeFormat(startTime)) return [];
    const [startH, startM] = startTime.split(':').map(Number);
    const ends = [];
    
    // Mulai dari startTime + 30 menit
    let currentH = startH;
    let currentM = startM + 30;
    if (currentM >= 60) {
      currentH += 1;
      currentM = 0;
    }
    
    while (currentH < 22 || (currentH === 22 && currentM === 0)) {
      ends.push(String(currentH).padStart(2, '0') + ':' + String(currentM).padStart(2, '0'));
      currentM += 30;
      if (currentM >= 60) {
        currentH += 1;
        currentM = 0;
      }
    }
    return ends;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!courtId || !date || !startTime || !endTime || !name || !phone) {
      showAlert.warning("Kolom Belum Lengkap", "Harap isi semua kolom wajib pemesanan!");
      return;
    }

    if (!isValidTimeFormat(startTime) || !isValidTimeFormat(endTime)) {
      showAlert.warning("Format Waktu Salah", "Format jam mulai atau selesai tidak valid.");
      return;
    }

    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startVal = startH * 60 + startM;
    const endVal = endH * 60 + endM;
    if (endVal <= startVal) {
      showAlert.warning("Waktu Sewa Salah", "Jam selesai harus setelah jam mulai!");
      return;
    }

    onSubmit({
      id_lapangan: courtId,
      tanggal: date,
      jam_mulai: startTime,
      jam_selesai: endTime,
      nama_pemesan: name,
      no_hp: phone,
      catatan: notes,
      total_harga: totalPrice,
      sumber_booking: 'Landing Page',
      status_booking: 'Pending',
      status_pembayaran: 'Belum Bayar'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Background Overlay */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-net-charcoal/60 backdrop-blur-sm transition-opacity duration-300"
      ></div>

      {/* Main Container */}
      <div className="w-full sm:max-w-lg z-10 animate-slide-up sm:animate-scale-up">
        <GlassCard 
          lPost
          className="rounded-t-3xl sm:rounded-3xl w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col p-6 shadow-2xl relative border-t border-rattan-gold/30"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-rattan-gold/20 pb-4 mb-4">
            <h2 className="text-xl sm:text-2xl font-fraunces font-bold text-net-charcoal flex items-center gap-2">
              Booking Lapangan
            </h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center border border-net-charcoal/20 text-net-charcoal/70 hover:bg-net-charcoal/10 transition-all cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            
            {/* Pilihan Lapangan */}
            <div>
              <label className="block text-xs font-sans font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">Pilih Lapangan *</label>
              <select
                value={courtId}
                onChange={(e) => setCourtId(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/50 focus:outline-none focus:border-rattan-gold text-net-charcoal font-sans font-medium"
              >
                {courts.filter(c => c.status === 'Aktif').map(c => (
                  <option key={c.id_lapangan} value={c.id_lapangan}>
                    {c.nama_lapangan} (Rp {c.harga_per_jam.toLocaleString('id-ID')}/jam)
                  </option>
                ))}
              </select>
            </div>

            {/* Tanggal & Waktu */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-sans font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">Tanggal *</label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    min={getTodayLocalStr()}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/50 focus:outline-none focus:border-rattan-gold text-net-charcoal font-mono pl-9"
                  />
                  <Calendar size={16} className="absolute left-3 top-3.5 text-net-charcoal/40 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">Jam Mulai *</label>
                <select
                  value={startTime}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStartTime(val);
                    if (isValidTimeFormat(val)) {
                      const [h, m] = val.split(':').map(Number);
                      let endH = (h || 8) + 1;
                      let endM = m || 0;
                      if (endH >= 22) {
                        endH = 22;
                        endM = 0;
                      }
                      setEndTime(String(endH).padStart(2, '0') + ':' + String(endM).padStart(2, '0'));
                    }
                  }}
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/50 focus:outline-none focus:border-rattan-gold text-net-charcoal font-mono"
                >
                  {startTimes.map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-sans font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">Jam Selesai *</label>
                <select
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/50 focus:outline-none focus:border-rattan-gold text-net-charcoal font-mono"
                >
                  {getEndTimes().map(time => (
                    <option key={time} value={time}>{time}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Identitas Pemesan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-sans font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">Nama Pemesan *</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ketut Raka"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/50 focus:outline-none focus:border-rattan-gold text-net-charcoal font-sans pl-9"
                  />
                  <User size={16} className="absolute left-3 top-3.5 text-net-charcoal/40 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-sans font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">No. WhatsApp / HP *</label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 0812345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/50 focus:outline-none focus:border-rattan-gold text-net-charcoal font-mono pl-9"
                  />
                  <Phone size={16} className="absolute left-3 top-3.5 text-net-charcoal/40 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-sans font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">Catatan Tambahan (Opsional)</label>
              <textarea
                placeholder="Contoh: Sewa raket 2 pcs, beli air mineral 1 dus"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/50 focus:outline-none focus:border-rattan-gold text-net-charcoal font-sans resize-none"
              />
            </div>

            {/* Informasi Pembayaran & Biaya */}
            <div className="bg-court-green/10 border border-court-green/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between text-net-charcoal font-sans">
                <span className="font-bold">Total Biaya Sewa:</span>
                <span className="font-mono text-base font-bold text-court-green">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>
              
              <div className="border-t border-court-green/25 pt-2.5 space-y-1.5 text-xs text-net-charcoal/80">
                <div className="flex items-start gap-1">
                  <AlertCircle size={14} className="text-rattan-gold mt-0.5 shrink-0" />
                  <span><strong>Instruksi Transfer:</strong> Transfer biaya sewa ke rekening berikut:</span>
                </div>
                <div className="flex justify-between items-center bg-shuttle-cream/60 p-2.5 rounded-lg border border-net-charcoal/10 font-mono text-[11px] mt-1 select-all">
                  <div>
                    <span className="font-sans font-extrabold text-court-green uppercase tracking-wider block text-xs">
                      {settings.nama_bank || 'MANDIRI'}
                    </span>
                    <span className="font-mono font-bold text-net-charcoal text-xs">
                      {settings.nomor_rekening || '145-00-1234567-8'}
                    </span>
                    <span className="text-[10px] text-net-charcoal/70 block font-sans">
                      a.n {settings.atas_nama_rekening || 'Sorga Desa Belega'}
                    </span>
                  </div>
                  <button 
                    type="button"
                    onClick={() => {
                      const rawNumber = settings.nomor_rekening || '145-00-1234567-8';
                      const cleanNumber = rawNumber.replace(/\s/g, '');
                      navigator.clipboard.writeText(cleanNumber);
                      showAlert.success("Berhasil Disalin", `Nomor rekening ${settings.nama_bank || 'Mandiri'} (${cleanNumber}) berhasil disalin ke papan klip.`);
                    }}
                    className="flex items-center gap-1 py-1.5 px-2.5 bg-court-green/10 hover:bg-court-green hover:text-shuttle-cream text-court-green rounded-lg text-[10px] font-sans font-bold transition-all cursor-pointer border border-court-green/20 shrink-0"
                    title="Salin Nomor Rekening"
                  >
                    <Clipboard size={13} />
                    <span>Salin</span>
                  </button>
                </div>
                <p className="text-[10px] leading-relaxed text-net-charcoal/75 italic">
                  * Setelah melakukan pemesanan, silakan kirim screenshot bukti transfer ke nomor WhatsApp Admin agar pesanan Anda dikonfirmasi.
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3 bg-smash-lime text-net-charcoal font-sans font-bold uppercase tracking-wider rounded-xl hover:bg-smash-lime/90 active:scale-[0.99] transition-all shadow-md cursor-pointer text-center text-sm"
            >
              Pesan Lapangan Sekarang
            </button>

          </form>
        </GlassCard>
      </div>
    </div>
  );
}
