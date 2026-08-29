import React, { useState, useEffect } from 'react';
import { X, Calendar, User, Phone, Clipboard, AlertCircle, QrCode, CreditCard, Download, Image } from 'lucide-react';
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
  const [paymentMethod, setPaymentMethod] = useState('transfer');

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

  const handleDownloadQris = async () => {
    try {
      const qrisUrl = settings.qris_image_url;
      
      if (qrisUrl) {
        if (qrisUrl.startsWith('data:') || qrisUrl.startsWith('blob:')) {
          const a = document.createElement('a');
          a.href = qrisUrl;
          a.download = 'QRIS-Sorga-Desa-Belega.png';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          showAlert.success("Berhasil Disimpan", "Gambar barcode QRIS telah diunduh.");
          return;
        }

        const response = await fetch(qrisUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = 'QRIS-Sorga-Desa-Belega.png';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        showAlert.success("Berhasil Disimpan", "Gambar barcode QRIS telah diunduh ke galeri perangkat Anda.");
      } else {
        const svgElement = document.getElementById('qris-fallback-svg');
        if (svgElement) {
          const svgData = new XMLSerializer().serializeToString(svgElement);
          const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
          const URLObj = window.URL || window.webkitURL || window;
          const blobURL = URLObj.createObjectURL(svgBlob);
          const image = new Image();
          image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 400;
            const context = canvas.getContext('2d');
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, 400, 400);
            context.drawImage(image, 50, 50, 300, 300);
            const pngUrl = canvas.toDataURL('image/png');
            const downloadLink = document.createElement('a');
            downloadLink.href = pngUrl;
            downloadLink.download = 'QRIS-Sorga-Desa-Belega.png';
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            showAlert.success("Berhasil Disimpan", "Gambar barcode QRIS telah diunduh.");
          };
          image.src = blobURL;
        }
      }
    } catch (err) {
      console.warn("Download QRIS error:", err);
      if (settings.qris_image_url) {
        window.open(settings.qris_image_url, '_blank');
      }
    }
  };

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

  const sanitizeText = (str = '') => {
    return String(str)
      .replace(/[<>'"`]/g, '')
      .trim();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanName = sanitizeText(name).substring(0, 100);
    const cleanPhone = phone.trim().replace(/[^0-9+]/g, '');
    const cleanNotes = sanitizeText(notes).substring(0, 500);

    if (!courtId || !date || !startTime || !endTime || !cleanName || !cleanPhone) {
      showAlert.warning("Kolom Belum Lengkap", "Harap isi semua kolom wajib pemesanan!");
      return;
    }

    if (cleanName.length < 2) {
      showAlert.warning("Nama Tidak Valid", "Nama pemesan minimal 2 karakter.");
      return;
    }

    if (cleanPhone.length < 9 || cleanPhone.length > 15) {
      showAlert.warning("Nomor WhatsApp Tidak Valid", "Harap masukkan nomor WhatsApp yang valid (9 - 15 digit angka).");
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
      nama_pemesan: cleanName,
      no_hp: cleanPhone,
      catatan: cleanNotes,
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
                <span className="font-bold text-xs uppercase tracking-wider">Total Biaya Sewa:</span>
                <span className="font-mono text-lg font-bold text-court-green">
                  Rp {totalPrice.toLocaleString('id-ID')}
                </span>
              </div>
              
              <div className="border-t border-court-green/25 pt-3 space-y-3 text-xs text-net-charcoal/80">
                
                {/* Switcher Metode Pembayaran */}
                <div className="flex rounded-xl bg-shuttle-cream/70 p-1 border border-net-charcoal/10 font-sans text-xs font-bold uppercase tracking-wider">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                      paymentMethod === 'transfer' 
                        ? 'bg-court-green text-shuttle-cream shadow-md font-extrabold' 
                        : 'text-net-charcoal/70 hover:text-net-charcoal'
                    }`}
                  >
                    <CreditCard size={14} />
                    <span>Transfer Bank</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('qris')}
                    className={`flex-1 py-2 px-3 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer text-[11px] ${
                      paymentMethod === 'qris' 
                        ? 'bg-court-green text-shuttle-cream shadow-md font-extrabold' 
                        : 'text-net-charcoal/70 hover:text-net-charcoal'
                    }`}
                  >
                    <QrCode size={14} />
                    <span>QRIS Barcode</span>
                  </button>
                </div>

                {/* TAB 1: TRANSFER BANK */}
                {paymentMethod === 'transfer' && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex items-start gap-1">
                      <AlertCircle size={14} className="text-rattan-gold mt-0.5 shrink-0" />
                      <span><strong>Instruksi Transfer:</strong> Transfer biaya sewa ke rekening berikut:</span>
                    </div>
                    <div className="flex justify-between items-center bg-shuttle-cream/80 p-3 rounded-xl border border-net-charcoal/10 font-mono text-[11px] select-all shadow-xs">
                      <div>
                        <span className="font-sans font-extrabold text-court-green uppercase tracking-wider block text-xs">
                          {settings.nama_bank || 'MANDIRI'}
                        </span>
                        <span className="font-mono font-bold text-net-charcoal text-sm">
                          {settings.nomor_rekening || '145-00-1234567-8'}
                        </span>
                        <span className="text-[10px] text-net-charcoal/70 block font-sans mt-0.5">
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
                        className="flex items-center gap-1 py-1.5 px-3 bg-court-green/10 hover:bg-court-green hover:text-shuttle-cream text-court-green rounded-lg text-[10px] font-sans font-bold transition-all cursor-pointer border border-court-green/20 shrink-0 shadow-xs"
                        title="Salin Nomor Rekening"
                      >
                        <Clipboard size={13} />
                        <span>Salin</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: QRIS BARCODE */}
                {paymentMethod === 'qris' && (
                  <div className="space-y-3 animate-fadeIn text-center">
                    <div className="flex items-center justify-center gap-1.5 text-xs text-net-charcoal font-sans font-bold">
                      <QrCode size={15} className="text-court-green" />
                      <span>Scan Barcode QRIS Resmi</span>
                    </div>

                    <div className="bg-white p-3.5 rounded-2xl border border-rattan-gold/30 shadow-md inline-block mx-auto space-y-2.5 max-w-[240px]">
                      {/* Logo Header QRIS */}
                      <div className="flex items-center justify-between border-b border-net-charcoal/10 pb-1.5">
                        <span className="font-sans font-extrabold text-[10px] tracking-widest text-red-600 uppercase">QRIS</span>
                        <span className="font-sans font-bold text-[8px] text-net-charcoal/60 uppercase">GPN / ALL PAYMENT</span>
                      </div>

                      {/* Barcode Image */}
                      <div className="w-48 h-48 bg-white mx-auto flex items-center justify-center overflow-hidden relative border border-net-charcoal/10 rounded-lg p-1">
                        {settings.qris_image_url ? (
                          <img 
                            src={settings.qris_image_url} 
                            alt="QRIS Barcode" 
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          // Fallback Vector QRIS Barcode
                          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-2 text-center space-y-2">
                            <svg className="w-36 h-36 text-net-charcoal" viewBox="0 0 100 100" fill="currentColor">
                              <path d="M10 10h30v30H10zM15 15v20h20V15zM20 20h10v10H20zM60 10h30v30H60zM65 15v20h20V15zM70 20h10v10H70zM10 60h30v30H10zM15 65v20h20V65zM20 70h10v10H20zM45 10h10v10H45zM45 30h10v20H45zM55 45h10v10H55zM60 60h10v10H60zM75 60h15v10H75zM45 65h10v25H45zM60 75h15v15H60zM80 80h10v10H80z" />
                            </svg>
                            <span className="text-[8px] font-sans font-bold text-net-charcoal/50">Buka Pengaturan Sistem untuk unggah foto QRIS asli</span>
                          </div>
                        )}
                      </div>

                      {/* Merchant Name */}
                      <div className="border-t border-net-charcoal/10 pt-1.5">
                        <span className="font-sans font-extrabold text-[11px] text-net-charcoal block leading-tight truncate">
                          {settings.qris_merchant_name || 'Sorga Desa Belega'}
                        </span>
                        <span className="font-mono text-[8px] text-net-charcoal/60 block mt-0.5">
                          NMID: {settings.qris_merchant_name ? settings.qris_merchant_name.replace(/[^0-9]/g, '') || 'ID1029384756' : 'ID1029384756'}
                        </span>
                      </div>
                    </div>

                    {/* Tombol Unduh / Simpan QRIS */}
                    <div>
                      <button 
                        type="button"
                        onClick={handleDownloadQris}
                        className="inline-flex items-center gap-1.5 py-2 px-4 bg-court-green text-shuttle-cream hover:bg-court-green/95 rounded-xl text-xs font-sans font-bold transition-all cursor-pointer shadow-md active:scale-95 border border-court-green/30"
                      >
                        <Download size={14} />
                        <span>Unduh / Simpan Gambar QRIS</span>
                      </button>
                    </div>

                    <p className="text-[10px] leading-relaxed text-net-charcoal/70 font-sans">
                      Dapat di-scan dengan: <strong>GoPay, OVO, DANA, ShopeePay, LinkAja, BCA, Mandiri, BRI, BNI, Permata</strong>, dan seluruh aplikasi m-Banking/e-Wallet berlogo QRIS.
                    </p>
                  </div>
                )}

                <p className="text-[10px] leading-relaxed text-net-charcoal/75 italic border-t border-court-green/15 pt-2">
                  * Setelah pembayaran selesai, kirim bukti screenshot transfer / bayar QRIS ke WhatsApp Admin agar status pesanan langsung dikonfirmasi.
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
