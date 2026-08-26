import React, { useState, useMemo } from 'react';
import { Calendar, Clock, ArrowRight, Star, Sparkles, ChevronRight, CheckCircle2 } from 'lucide-react';
import { getTodayLocalStr } from '../utils/dateHelper';

export default function ModernHero({
  settings = {},
  courts = [],
  bookings = [],
  selectedDate,
  onSelectDate,
  onOpenBooking,
  testimonials = []
}) {
  const todayStr = useMemo(() => getTodayLocalStr(), []);
  
  // State form quick booking
  const [quickDate, setQuickDate] = useState(selectedDate || todayStr);
  const [quickTime, setQuickTime] = useState("19:00");
  const [quickDuration, setQuickDuration] = useState("2");

  // Fallback image jika belum diatur di dashboard
  const heroBgImage = settings.hero_bg_image || "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=2070&auto=format&fit=crop";

  // Hitung jumlah lapangan aktif
  const activeCourts = useMemo(() => {
    return courts.filter(c => c.status === 'Aktif');
  }, [courts]);

  const activeCourtsCount = activeCourts.length > 0 ? activeCourts.length : 3;

  // Hitung rating rata-rata dari testimoni (atau fallback 4.9)
  const averageRating = useMemo(() => {
    if (testimonials && testimonials.length > 0) {
      const sum = testimonials.reduce((acc, curr) => acc + (Number(curr.rating) || 5), 0);
      return (sum / testimonials.length).toFixed(1);
    }
    return "4.9";
  }, [testimonials]);

  // List opsi jam operasional (dari 08:00 sampai 22:00)
  const timeSlots = [
    "08:00", "09:00", "10:00", "11:00", "12:00",
    "13:00", "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00", "22:00"
  ];

  // Handler saat klik tombol Cari Lapangan Kosong di Widget
  const handleQuickSearch = (e) => {
    if (e) e.preventDefault();
    if (onSelectDate && quickDate) {
      onSelectDate(quickDate);
    }
    // Buka booking modal dengan jam yang dipilih
    if (onOpenBooking) {
      onOpenBooking(null, quickTime);
    }
  };

  // Handler untuk scroll mulus ke jadwal
  const scrollToSection = (e, sectionId) => {
    e.preventDefault();
    const elem = document.getElementById(sectionId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-rattan-gold/30 shadow-2xl bg-court-green/90 text-shuttle-cream l-post-corner">
      {/* Background Image & Harmonious Brand Overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-all duration-700 transform scale-105"
        style={{ 
          backgroundImage: `url('${heroBgImage}')`,
          backgroundAttachment: 'scroll'
        }}
      >
        {/* Multi-layer Brand Gradient Overlay (Court Green #1B4A3F & Net Charcoal #1F2421) */}
        <div className="absolute inset-0 bg-gradient-to-r from-court-green/95 via-net-charcoal/90 to-court-green/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-net-charcoal/95 via-transparent to-court-green/60" />
        
        {/* Ambient Warm Court Glow */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-court-green/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-rattan-gold/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Decorative Floating Shuttlecocks (Animated SVG) */}
      <div className="absolute top-16 right-[7%] opacity-20 hidden md:block animate-float-slow pointer-events-none z-10">
        <svg className="w-24 h-24 text-rattan-gold" viewBox="0 0 24 24" fill="currentColor" transform="rotate(35)">
          <path d="M12 2C8.69 2 6 4.69 6 8C6 10.37 7.37 12.42 9.39 13.38L8.14 17.15L10.5 19H13.5L15.86 17.15L14.61 13.38C16.63 12.42 18 10.37 18 8C18 4.69 15.31 2 12 2ZM12 4C14.21 4 16 5.79 16 8C16 9.87 14.71 11.43 13 11.87V9H11V11.87C9.29 11.43 8 9.87 8 8C8 5.79 9.79 4 12 4ZM10 20L11 22H13L14 20H10Z" />
        </svg>
      </div>
      <div className="absolute bottom-20 left-[4%] opacity-20 hidden lg:block animate-float-fast pointer-events-none z-10">
        <svg className="w-28 h-28 text-smash-lime" viewBox="0 0 24 24" fill="currentColor" transform="rotate(-25)">
          <path d="M12 2C8.69 2 6 4.69 6 8C6 10.37 7.37 12.42 9.39 13.38L8.14 17.15L10.5 19H13.5L15.86 17.15L14.61 13.38C16.63 12.42 18 10.37 18 8C18 4.69 15.31 2 12 2ZM12 4C14.21 4 16 5.79 16 8C16 9.87 14.71 11.43 13 11.87V9H11V11.87C9.29 11.43 8 9.87 8 8C8 5.79 9.79 4 12 4ZM10 20L11 22H13L14 20H10Z" />
        </svg>
      </div>

      {/* Main Container Content */}
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10 pt-16 sm:pt-20 pb-16 sm:pb-20 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          
          {/* Kolom Kiri: Teks & Aksi Utama (7 Cols) */}
          <div className="lg:col-span-7 text-center lg:text-left">
            
            {/* Badge Tag */}
            <div className="inline-flex items-center gap-2 py-1.5 px-4 rounded-full bg-court-green/60 border border-rattan-gold/40 text-rattan-gold text-xs font-bold font-sans tracking-wider mb-6 animate-on-load-1 shadow-lg shadow-black/20 backdrop-blur-md">
              <svg className="w-3.5 h-3.5 text-rattan-gold" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C8.69 2 6 4.69 6 8C6 10.37 7.37 12.42 9.39 13.38L8.14 17.15L10.5 19H13.5L15.86 17.15L14.61 13.38C16.63 12.42 18 10.37 18 8C18 4.69 15.31 2 12 2ZM12 4C14.21 4 16 5.79 16 8C16 9.87 14.71 11.43 13 11.87V9H11V11.87C9.29 11.43 8 9.87 8 8C8 5.79 9.79 4 12 4ZM10 20L11 22H13L14 20H10Z" />
              </svg>
              <span className="uppercase tracking-widest text-[11px]">{settings.hero_badge || "Gianyar Bali Badminton Community"}</span>
            </div>

            {/* Headline Title */}
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-shuttle-cream leading-tight tracking-tight mb-6 animate-on-load-2 font-fraunces">
              {settings.hero_title ? (
                <span>{settings.hero_title}</span>
              ) : (
                <>
                  Siap Untuk <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-smash-lime via-yellow-200 to-rattan-gold">
                    Smash Keras?
                  </span>
                </>
              )}
            </h1>

            {/* Description */}
            <p className="text-sm sm:text-base md:text-lg text-shuttle-cream/80 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed animate-on-load-3 font-sans font-normal">
              {settings.hero_desc || "Pesan lapangan badminton standar internasional sekarang. Lantai karpet premium, pencahayaan optimal, dan sirkulasi udara terbaik untuk pengalaman bermain maksimal."}
            </p>

            {/* CTA Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-4 animate-on-load-4">
              <button
                onClick={() => onOpenBooking && onOpenBooking()}
                className="px-8 py-3.5 bg-smash-lime hover:bg-smash-lime/90 text-net-charcoal font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-smash-lime/25 btn-pulse active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer l-post-corner"
              >
                <span>Booking Lapangan</span>
                <ArrowRight size={16} className="stroke-[2.5]" />
              </button>

              <a
                href="#jadwal"
                onClick={(e) => scrollToSection(e, 'jadwal')}
                className="px-7 py-3.5 bg-court-green/80 hover:bg-court-green text-shuttle-cream font-sans font-semibold text-xs uppercase tracking-wider rounded-xl border border-rattan-gold/40 hover:border-rattan-gold transition-all flex items-center justify-center gap-2 shadow-md backdrop-blur-sm cursor-pointer"
              >
                <Calendar size={16} className="text-rattan-gold" />
                <span>Cek Jadwal Live</span>
              </a>
            </div>

            {/* Highlight Stats */}
            <div className="mt-10 sm:mt-12 grid grid-cols-3 gap-3 sm:gap-4 border-t border-rattan-gold/20 pt-6 sm:pt-8 animate-on-load-4 text-left">
              <div className="bg-net-charcoal/40 p-3 sm:p-4 rounded-xl border border-rattan-gold/20 backdrop-blur-md">
                <div className="text-2xl sm:text-3xl font-extrabold text-smash-lime font-fraunces">
                  {activeCourtsCount}
                </div>
                <div className="text-[10px] sm:text-xs text-shuttle-cream/70 mt-0.5 font-medium uppercase tracking-wider font-sans">
                  Lapangan BWF
                </div>
              </div>

              <div className="bg-net-charcoal/40 p-3 sm:p-4 rounded-xl border border-rattan-gold/20 backdrop-blur-md">
                <div className="text-lg sm:text-2xl font-extrabold text-rattan-gold font-fraunces">
                  {settings.jam_operasional || '08:00 - 22:00'}
                </div>
                <div className="text-[10px] sm:text-xs text-shuttle-cream/70 mt-0.5 font-medium uppercase tracking-wider font-sans">
                  Buka Setiap Hari
                </div>
              </div>

              <div className="bg-net-charcoal/40 p-3 sm:p-4 rounded-xl border border-rattan-gold/20 backdrop-blur-md">
                <div className="text-2xl sm:text-3xl font-extrabold text-smash-lime font-fraunces flex items-center gap-1">
                  <Star size={18} className="fill-rattan-gold text-rattan-gold inline" />
                  {averageRating}
                </div>
                <div className="text-[10px] sm:text-xs text-shuttle-cream/70 mt-0.5 font-medium uppercase tracking-wider font-sans">
                  Rating Member
                </div>
              </div>
            </div>

          </div>

          {/* Kolom Kanan: Card Cek Ketersediaan Cepat (5 Cols) */}
          <div className="lg:col-span-5 animate-on-load-3">
            <div className="glass-surface-dark border border-rattan-gold/30 p-6 sm:p-8 rounded-3xl shadow-2xl relative overflow-hidden text-left l-post-corner">
              
              {/* Top Accent Gradient Bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rattan-gold via-smash-lime to-court-green" />
              
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl sm:text-2xl font-bold text-shuttle-cream font-fraunces">
                  Cek Ketersediaan
                </h3>
                <span className="text-[10px] bg-smash-lime/15 text-smash-lime font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border border-smash-lime/30 flex items-center gap-1.5 font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-smash-lime animate-ping" />
                  Live Slot
                </span>
              </div>

              <form onSubmit={handleQuickSearch} className="space-y-4 text-xs font-sans">
                
                {/* Tanggal Main */}
                <div>
                  <label className="block text-xs font-bold text-shuttle-cream/80 uppercase tracking-wider mb-1.5">
                    Tanggal Main
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-rattan-gold">
                      <Calendar size={15} />
                    </div>
                    <input 
                      type="date"
                      value={quickDate}
                      min={todayStr}
                      onChange={(e) => {
                        setQuickDate(e.target.value);
                        if (onSelectDate) onSelectDate(e.target.value);
                      }}
                      className="bg-net-charcoal/70 border border-rattan-gold/30 text-shuttle-cream rounded-xl focus:ring-1 focus:ring-smash-lime focus:border-smash-lime block w-full pl-9 p-3 text-xs outline-none transition font-mono"
                    />
                  </div>
                </div>

                {/* Jam Mulai & Durasi */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-shuttle-cream/80 uppercase tracking-wider mb-1.5">
                      Jam Mulai
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-rattan-gold">
                        <Clock size={15} />
                      </div>
                      <select 
                        value={quickTime}
                        onChange={(e) => setQuickTime(e.target.value)}
                        className="bg-net-charcoal/70 border border-rattan-gold/30 text-shuttle-cream rounded-xl focus:ring-1 focus:ring-smash-lime focus:border-smash-lime block w-full pl-9 p-3 text-xs outline-none transition font-sans"
                      >
                        {timeSlots.map(slot => (
                          <option key={slot} value={slot} className="bg-net-charcoal text-shuttle-cream">{slot}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-shuttle-cream/80 uppercase tracking-wider mb-1.5">
                      Durasi Main
                    </label>
                    <select 
                      value={quickDuration}
                      onChange={(e) => setQuickDuration(e.target.value)}
                      className="bg-net-charcoal/70 border border-rattan-gold/30 text-shuttle-cream rounded-xl focus:ring-1 focus:ring-smash-lime focus:border-smash-lime block w-full p-3 text-xs outline-none transition font-sans"
                    >
                      <option value="1" className="bg-net-charcoal text-shuttle-cream">1 Jam</option>
                      <option value="2" className="bg-net-charcoal text-shuttle-cream">2 Jam</option>
                      <option value="3" className="bg-net-charcoal text-shuttle-cream">3 Jam</option>
                      <option value="4" className="bg-net-charcoal text-shuttle-cream">4 Jam</option>
                    </select>
                  </div>
                </div>

                {/* Submit / Action Button */}
                <button
                  type="submit"
                  className="w-full mt-3 bg-smash-lime hover:bg-smash-lime/90 text-net-charcoal font-sans font-bold text-xs uppercase tracking-wider py-3.5 px-4 rounded-xl transition-all transform active:scale-95 shadow-lg shadow-smash-lime/20 flex items-center justify-center gap-2 cursor-pointer l-post-corner"
                >
                  <span>Cari Lapangan Kosong</span>
                  <ChevronRight size={16} className="stroke-[3]" />
                </button>
              </form>

              {/* Status Live Indicator */}
              <div className="mt-5 pt-4 border-t border-rattan-gold/15 flex items-center gap-2.5 text-xs text-shuttle-cream/80 font-sans">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-smash-lime opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-smash-lime" />
                </span>
                <span>
                  <strong className="text-smash-lime">{activeCourtsCount} Lapangan</strong> siap dipesan
                </span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
