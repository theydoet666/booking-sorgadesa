import React, { useState, useEffect } from 'react';
import { 
  Menu, Phone, Instagram, Facebook, MapPin, 
  Clock, ShieldAlert, Award, Star, MessageSquare, 
  Lock, ArrowRight, CheckCircle2, ChevronRight, ChevronLeft, Activity
} from 'lucide-react';
import { db } from '../utils/db';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { 
  MOCK_TESTIMONIALS, MOCK_GALLERY, 
  MOCK_SETTINGS, MOCK_SOSMED,
  MOCK_COURTS, getMockBookingsForToday
} from '../utils/mockData';
import GlassCard from '../components/GlassCard';
import ScoreboardGrid from '../components/ScoreboardGrid';
import BottomSheetModal from '../components/BottomSheetModal';
import BottomTabBar from '../components/BottomTabBar';
import { DEFAULT_LOGO, updateFavicon } from '../utils/logoHelper';
import { showAlert } from '../utils/alertHelper';
import { getTodayLocalStr } from '../utils/dateHelper';
import ModernHero from '../components/ModernHero';

// Helper Validasi URL Aman untuk Google Maps Iframe (Anti Iframe Injection/XSS)
const getSafeGoogleMapsUrl = (rawUrl) => {
  const DEFAULT_MAP = "https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d1170.0072306116913!2d115.3106892!3d-8.5571817!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd2172940bd7bcf%3A0xd1d39209ea6f06c8!2sSorga%20Belega!5e1!3m2!1sen!2sid!4v1787796501037!5m2!1sen!2sid";
  if (!rawUrl) return DEFAULT_MAP;

  let urlCandidate = String(rawUrl).trim();
  const match = urlCandidate.match(/src=["']([^"']+)["']/);
  if (match && match[1]) {
    urlCandidate = match[1];
  }

  try {
    const parsed = new URL(urlCandidate);
    const validHost = parsed.hostname === 'www.google.com' || 
                      parsed.hostname === 'google.com' || 
                      parsed.hostname === 'maps.google.com' ||
                      parsed.hostname.endsWith('.google.com') ||
                      parsed.hostname.endsWith('.google.co.id');
    
    if (parsed.protocol === 'https:' && validHost && parsed.pathname.includes('/maps/embed')) {
      return parsed.href;
    }
  } catch (e) {}

  return DEFAULT_MAP;
};

// Helper Validasi Link Sosial Media (Anti Open Redirect ke Phishing)
const getSafeSocialUrl = (rawUrl, allowedDomains = [], defaultUrl = '#') => {
  if (!rawUrl) return defaultUrl;
  try {
    const candidate = rawUrl.startsWith('http') ? rawUrl : `https://${rawUrl}`;
    const parsed = new URL(candidate);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      const isAllowed = allowedDomains.some(domain => 
        parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
      );
      if (isAllowed) return parsed.href;
    }
  } catch (e) {}
  return defaultUrl;
};

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('beranda');
  const [selectedDate, setSelectedDate] = useState(getTodayLocalStr());
  const [courts, setCourts] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [testimonials, setTestimonials] = useState([]);
  const [settings, setSettings] = useState(MOCK_SETTINGS);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingSuccessData, setBookingSuccessData] = useState(null);
  const [lastBookingTime, setLastBookingTime] = useState(0);

  // Gallery ref and scroll handler
  const galleryRef = React.useRef(null);
  const scrollGallery = (direction) => {
    if (galleryRef.current) {
      const container = galleryRef.current;
      const firstCard = container.firstElementChild;
      const gap = 20; // gap-5 is 20px
      const step = firstCard ? (firstCard.getBoundingClientRect().width + gap) : (container.clientWidth * 0.75);
      container.scrollBy({
        left: direction === 'left' ? -step : step,
        behavior: 'smooth'
      });
    }
  };

  // Testimonial ref and scroll handler
  const testimonialRef = React.useRef(null);
  const scrollTestimonials = (direction) => {
    if (testimonialRef.current) {
      const container = testimonialRef.current;
      const firstCard = container.firstElementChild;
      const gap = 24; // gap-6 is 24px
      const step = firstCard ? (firstCard.getBoundingClientRect().width + gap) : (container.clientWidth * 0.8);
      container.scrollBy({
        left: direction === 'left' ? -step : step,
        behavior: 'smooth'
      });
    }
  };

  // Load data dari Supabase / Local Storage
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dbCourts, dbBookings, dbSettings, galleryRes, testimonialsRes] = await Promise.all([
          db.getCourts(),
          db.getPublicSchedule(selectedDate),
          db.getSettings(),
          isSupabaseConfigured() ? supabase.from('galeri').select('*').eq('status', 'Aktif').order('urutan', { ascending: true }) : Promise.resolve(null),
          isSupabaseConfigured() ? supabase.from('testimoni').select('*').eq('status', 'Aktif').order('urutan', { ascending: true }) : Promise.resolve(null)
        ]);

        if (dbCourts) setCourts(dbCourts);
        if (dbBookings) setBookings(dbBookings);
        if (dbSettings) {
          setSettings(dbSettings);
          if (dbSettings.logo_url) {
            updateFavicon(dbSettings.logo_url);
          }
        }

        if (galleryRes && galleryRes.data) {
          setGallery(galleryRes.data);
        } else if (!isSupabaseConfigured()) {
          setGallery(JSON.parse(localStorage.getItem('sorga_gallery')) || MOCK_GALLERY);
        }

        if (testimonialsRes && testimonialsRes.data) {
          setTestimonials(testimonialsRes.data);
        } else if (!isSupabaseConfigured()) {
          setTestimonials(JSON.parse(localStorage.getItem('sorga_testimonials')) || MOCK_TESTIMONIALS);
        }
      } catch (err) {
        console.warn("Fetch error, using default mock assets:", err);
        setCourts(MOCK_COURTS);
        setBookings(getMockBookingsForToday());
        setGallery(MOCK_GALLERY);
        setTestimonials(MOCK_TESTIMONIALS);
      }
    };

    fetchData();
  }, [selectedDate]);

  // Handle open booking modal
  const handleOpenBooking = (courtId = '', dateOrTime = '', time = '') => {
    setSelectedCourtId(courtId || '');
    if (time) {
      if (dateOrTime) setSelectedDate(dateOrTime);
      setSelectedTime(time);
    } else if (dateOrTime) {
      if (dateOrTime.includes('-')) {
        setSelectedDate(dateOrTime);
        setSelectedTime('');
      } else {
        setSelectedTime(dateOrTime);
      }
    } else {
      setSelectedTime('');
    }
    setIsModalOpen(true);
  };

  // Submit booking
  const handleBookingSubmit = async (bookingData) => {
    // 1. Anti-Spam Rate Limit Cooldown (15 detik antar booking dari browser yang sama)
    const now = Date.now();
    if (now - lastBookingTime < 15000) {
      const remainingSeconds = Math.ceil((15000 - (now - lastBookingTime)) / 1000);
      showAlert.warning("Mohon Tunggu", `Sistem mendeteksi pengajuan beruntun. Harap tunggu ${remainingSeconds} detik sebelum mengajukan pemesanan baru.`);
      return;
    }

    // Generate High-Entropy Cryptographic Booking ID (BK-YYYYMMDD-UUID8)
    const dateCompact = bookingData.tanggal.replace(/-/g, '');
    const cryptoKey = (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID)
      ? window.crypto.randomUUID().replace(/-/g, '').substring(0, 8).toUpperCase()
      : Math.random().toString(36).substring(2, 10).toUpperCase();
    const generatedId = `BK-${dateCompact}-${cryptoKey}`;
    
    const finalBooking = {
      ...bookingData,
      id_booking: generatedId
    };

    // Validasi bentrok jadwal
    const activeBookings = await db.getPublicSchedule(finalBooking.tanggal);
    const isBentrok = (activeBookings || []).some(b => {
      if (b.id_lapangan !== finalBooking.id_lapangan) return false;
      if (b.status_booking === 'Dibatalkan') return false;
      
      const checkStart = finalBooking.jam_mulai;
      const checkEnd = finalBooking.jam_selesai;
      return checkStart < b.jam_selesai && b.jam_mulai < checkEnd;
    });

    if (isBentrok) {
      showAlert.warning("Slot Waktu Bentrok", "Slot waktu pada lapangan yang Anda pilih sudah terisi. Silakan pilih jam atau lapangan lain.");
      return;
    }

    const res = await db.addBooking(finalBooking);
    if (res.success) {
      setLastBookingTime(Date.now());
      setBookings(prev => [...prev, finalBooking]);
      setBookingSuccessData(finalBooking);
      setIsModalOpen(false);
      showAlert.success("Booking Berhasil diajukan!", `ID Booking Anda: ${generatedId}. Silakan transfer biaya sewa dan konfirmasi via WA.`);
      db.addActivityLog('Pelanggan Publik', 'Booking Baru', `Booking ${generatedId} diajukan dari Landing Page`);
    } else {
      showAlert.error("Gagal Memproses Pemesanan", res.message || 'Terjadi gangguan koneksi.');
    }
  };

  // Direct WA message generator
  const getWaLink = (booking) => {
    const text = `Halo Admin Sorga Desa Belega, saya ingin mengonfirmasi pemesanan lapangan sorga desa belega\n\n*Detail Pemesanan:*\n- ID Booking: ${booking.id_booking}\n- Nama: ${booking.nama_pemesan}\n- Lapangan: ${booking.id_lapangan}\n- Tanggal: ${booking.tanggal}\n- Jam: ${booking.jam_mulai} - ${booking.jam_selesai}\n- Total Biaya: Rp ${booking.total_harga.toLocaleString('id-ID')}\n\nBerikut saya lampirkan bukti transfer pembayarannya.`;
    return `https://wa.me/${settings.nomor_wa_admin}?text=${encodeURIComponent(text)}`;
  };

  return (
    <div className="min-h-screen flex flex-col relative pb-20 sm:pb-0 select-none">
      
      {/* 0. Background Blob Gradasi untuk Glassmorphism */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-20%] w-[80vw] h-[80vw] sm:w-[50vw] sm:h-[50vw] rounded-full bg-court-green/15 blur-[80px] sm:blur-[120px] animate-pulse"></div>
        <div className="absolute top-[30%] right-[-10%] w-[60vw] h-[60vw] sm:w-[40vw] sm:h-[40vw] rounded-full bg-rattan-gold/10 blur-[80px] sm:blur-[120px]"></div>
        <div className="absolute bottom-[10%] left-[10%] w-[70vw] h-[70vw] sm:w-[35vw] sm:h-[35vw] rounded-full bg-court-green/10 blur-[90px] sm:blur-[120px]"></div>
      </div>

      {/* 1. Header & Navbar (Desktop Only layout) */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full px-4 py-3 sm:py-4 transition-all duration-300">
        <div className="max-w-6xl mx-auto">
          <div className="glass-surface-dark flex items-center justify-between h-16 px-6 rounded-2xl border border-chalk-line/10 shadow-lg">
            
            {/* Logo */}
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-xl bg-court-green/15 border border-rattan-gold/30 flex items-center justify-center overflow-hidden shrink-0">
                <img 
                  src={settings.logo_url || DEFAULT_LOGO} 
                  alt="Logo Brand" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex flex-col">
                <span className="font-fraunces italic font-semibold text-[11px] leading-tight text-rattan-gold">Sorga</span>
                <span className="font-sans font-bold text-xs sm:text-sm tracking-wider text-shuttle-cream uppercase leading-none mt-0.5">Desa Belega</span>
              </div>
            </div>

            {/* Menu Navigasi Desktop */}
            <nav className="hidden sm:flex items-center gap-8 text-sm font-sans font-semibold text-shuttle-cream/80">
              <a href="#hero" className="hover:text-smash-lime transition-all py-1.5 border-b-2 border-transparent hover:border-smash-lime">Beranda</a>
              <a href="#lapangan" className="hover:text-smash-lime transition-all py-1.5 border-b-2 border-transparent hover:border-smash-lime">Lapangan</a>
              <a href="#jadwal" className="hover:text-smash-lime transition-all py-1.5 border-b-2 border-transparent hover:border-smash-lime">Jadwal</a>
              <a href="#testimoni" className="hover:text-smash-lime transition-all py-1.5 border-b-2 border-transparent hover:border-smash-lime">Testimoni</a>
              <a href="#kontak" className="hover:text-smash-lime transition-all py-1.5 border-b-2 border-transparent hover:border-smash-lime">Kontak</a>
            </nav>

            {/* CTA Navbar (Desktop) */}
            <button
              onClick={() => handleOpenBooking()}
              className="hidden sm:flex items-center justify-center py-2 px-5 bg-smash-lime text-net-charcoal font-sans font-bold text-xs uppercase tracking-wider rounded-lg shadow hover:bg-smash-lime/90 active:scale-95 transition-all cursor-pointer l-post-corner"
            >
              Booking Lapangan
            </button>

            {/* Hamburger (Mobile menu fallback indicator) */}
            <div className="sm:hidden text-shuttle-cream">
              <Activity size={20} className="text-smash-lime animate-pulse" />
            </div>

          </div>
        </div>
      </header>

      {/* 2. Hero Section */}
      <section id="hero" className="max-w-6xl mx-auto w-full px-4 pt-20 sm:pt-24 pb-4 sm:pb-8 relative z-10">
        <ModernHero 
          settings={settings}
          courts={courts}
          bookings={bookings}
          selectedDate={selectedDate}
          onSelectDate={(date) => setSelectedDate(date)}
          onOpenBooking={(courtId, time) => handleOpenBooking(courtId, time)}
          testimonials={testimonials}
        />
      </section>

      {/* Doubles sideline divider */}
      <div className="max-w-6xl mx-auto w-full px-4 my-2 sm:my-4">
        <div className="doubles-sideline-divider"></div>
      </div>

      {/* 3. Daftar Lapangan Section */}
      <section id="lapangan" className="max-w-6xl mx-auto w-full px-4 py-12 relative z-10 text-left scroll-mt-24">
        <div className="mb-8">
          <span className="text-xs font-sans font-bold text-rattan-gold uppercase tracking-widest block mb-1">{settings.court_badge || "Pilihan Fasilitas"}</span>
          <h2 className="font-fraunces font-extrabold text-3xl sm:text-4xl text-net-charcoal">{settings.court_title || "Daftar Lapangan"}</h2>
        </div>

        {/* Lapangan Cards Grid - Mobile Carousel Style / Desktop Grid */}
        <div className="flex sm:grid sm:grid-cols-2 md:grid-cols-3 gap-6 overflow-x-auto sm:overflow-x-visible pb-4 sm:pb-0 snap-x custom-scrollbar">
          {courts.map(court => (
            <div key={court.id_lapangan} className="min-w-[280px] sm:min-w-0 snap-center flex-1">
              <GlassCard 
                lPost 
                netHover
                className="h-full flex flex-col justify-between border border-net-charcoal/10 relative group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-sans font-extrabold text-lg text-net-charcoal">{court.nama_lapangan}</h3>
                    <span className={`text-[10px] font-sans font-bold uppercase tracking-wider py-1 px-2.5 rounded-full ${
                      court.status === 'Aktif' 
                        ? 'bg-status-success/20 text-court-green border border-status-success/30' 
                        : 'bg-status-danger/10 text-status-danger border border-status-danger/20'
                    }`}>
                      {court.status}
                    </span>
                  </div>
                  
                  <p className="text-xs text-net-charcoal/70 leading-relaxed font-sans mb-6">
                    {court.keterangan}
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Prices */}
                  <div className="border-t border-rattan-gold/15 pt-4 space-y-1.5">
                    <div className="flex justify-between items-center text-xs font-sans font-semibold text-net-charcoal/60">
                      <span>Umum (Regular)</span>
                      <span className="font-mono text-sm font-bold text-net-charcoal">
                        Rp {court.harga_per_jam.toLocaleString('id-ID')}/jam
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-sans font-semibold text-court-green">
                      <span>Member Club</span>
                      <span className="font-mono text-sm font-bold text-court-green">
                        Rp {court.harga_member.toLocaleString('id-ID')}/jam
                      </span>
                    </div>
                  </div>

                  {/* Booking CTA */}
                  {court.status === 'Aktif' ? (
                    <button
                      onClick={() => handleOpenBooking(court.id_lapangan)}
                      className="w-full py-2.5 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-lg hover:bg-court-green/90 transition-all cursor-pointer text-center select-none block"
                    >
                      Pesan Lapangan Ini
                    </button>
                  ) : (
                    <button
                      disabled
                      className="w-full py-2.5 bg-status-inactive/20 text-status-inactive/70 font-sans font-bold text-xs uppercase tracking-wider rounded-lg select-none cursor-not-allowed text-center block"
                    >
                      Sedang Dipelihara
                    </button>
                  )}
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      </section>

      {/* Doubles sideline divider */}
      <div className="max-w-6xl mx-auto w-full px-4 my-4">
        <div className="doubles-sideline-divider"></div>
      </div>

      {/* 4. Jadwal/Kalender Section */}
      <section id="jadwal" className="max-w-6xl mx-auto w-full px-4 py-12 relative z-10 text-left scroll-mt-24">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-sans font-bold text-rattan-gold uppercase tracking-widest block mb-1">{settings.schedule_badge || "Live Ketersediaan"}</span>
            <h2 className="font-fraunces font-extrabold text-3xl sm:text-4xl text-net-charcoal">{settings.schedule_title || "Jadwal Lapangan"}</h2>
          </div>
          
          {/* Calendar Day Picker (direct input) */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-sans font-bold text-net-charcoal/60 uppercase">Pilih Tanggal:</span>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={getTodayLocalStr()}
              className="p-1.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/60 focus:outline-none focus:border-rattan-gold text-xs font-mono font-medium text-net-charcoal"
            />
          </div>
        </div>

        {/* ScoreboardGrid Component */}
        <ScoreboardGrid 
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          courts={courts}
          bookings={bookings}
          onSlotClick={(cId, date, time) => handleOpenBooking(cId, date, time)}
        />
      </section>

      {/* Doubles sideline divider */}
      <div className="max-w-6xl mx-auto w-full px-4 my-4">
        <div className="doubles-sideline-divider"></div>
      </div>

      {/* 5. Galeri Section */}
      <section id="galeri" className="max-w-6xl mx-auto w-full px-4 py-12 relative z-10 text-left scroll-mt-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-sans font-bold text-rattan-gold uppercase tracking-widest block mb-1">{settings.gallery_badge || "Fasilitas Kami"}</span>
            <h2 className="font-fraunces font-extrabold text-3xl sm:text-4xl text-net-charcoal">{settings.gallery_title || "Galeri Foto"}</h2>
          </div>
          
          {/* Scroll Buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => scrollGallery('left')}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-net-charcoal/10 bg-shuttle-cream/80 text-net-charcoal hover:bg-smash-lime hover:text-net-charcoal hover:scale-105 active:scale-90 transition-all duration-200 shadow-sm cursor-pointer"
              aria-label="Scroll Left"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => scrollGallery('right')}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-net-charcoal/10 bg-shuttle-cream/80 text-net-charcoal hover:bg-smash-lime hover:text-net-charcoal hover:scale-105 active:scale-90 transition-all duration-200 shadow-sm cursor-pointer"
              aria-label="Scroll Right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Gallery Wrapper */}
        <div className="relative">
          {/* Subtle fade overlay on edges */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-shuttle-cream to-transparent pointer-events-none z-10 hidden md:block"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-shuttle-cream to-transparent pointer-events-none z-10 hidden md:block"></div>

          <div
            ref={galleryRef}
            className="flex gap-5 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar pb-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {gallery.map(photo => (
              <div
                key={photo.id_foto}
                className="w-[280px] sm:w-[350px] aspect-[4/3] shrink-0 rounded-2xl overflow-hidden shadow-md border border-net-charcoal/10 relative group snap-start bg-court-green/5"
              >
                <img
                  src={photo.url_foto}
                  alt={photo.judul}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                
                {/* Premium Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-net-charcoal via-net-charcoal/20 to-transparent flex flex-col justify-end p-5 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-rattan-gold font-bold mb-1">Sorga Desa Belega</span>
                  <h4 className="text-sm font-sans font-bold text-shuttle-cream leading-tight">
                    {photo.judul}
                  </h4>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doubles sideline divider */}
      <div className="max-w-6xl mx-auto w-full px-4 my-4">
        <div className="doubles-sideline-divider"></div>
      </div>

      {/* 6. Testimoni Section */}
      <section id="testimoni" className="max-w-6xl mx-auto w-full px-4 py-12 relative z-10 text-left scroll-mt-24">
        <div className="flex items-end justify-between mb-8">
          <div>
            <span className="text-xs font-sans font-bold text-rattan-gold uppercase tracking-widest block mb-1">{settings.testimonial_badge || "Ulasan Pelanggan"}</span>
            <h2 className="font-fraunces font-extrabold text-3xl sm:text-4xl text-net-charcoal">{settings.testimonial_title || "Apa Kata Mereka"}</h2>
          </div>

          {/* Tombol Navigasi Scroll Responsif (aktif jika ulasan > 2 di mobile atau > 3 di desktop) */}
          <div className="flex gap-2">
            <button
              onClick={() => scrollTestimonials('left')}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-net-charcoal/10 bg-shuttle-cream/80 text-net-charcoal hover:bg-smash-lime hover:text-net-charcoal hover:scale-105 active:scale-90 transition-all duration-200 shadow-sm cursor-pointer"
              aria-label="Scroll Left"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => scrollTestimonials('right')}
              className="flex items-center justify-center w-10 h-10 rounded-xl border border-net-charcoal/10 bg-shuttle-cream/80 text-net-charcoal hover:bg-smash-lime hover:text-net-charcoal hover:scale-105 active:scale-90 transition-all duration-200 shadow-sm cursor-pointer"
              aria-label="Scroll Right"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Scrollable Testimonials Wrapper */}
        <div className="relative">
          {/* Subtle fade overlay on edges for smooth scrolling */}
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-shuttle-cream to-transparent pointer-events-none z-10 hidden md:block"></div>
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-shuttle-cream to-transparent pointer-events-none z-10 hidden md:block"></div>

          <div
            ref={testimonialRef}
            className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory no-scrollbar pb-4 pt-1 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {testimonials.map((testimonial, idx) => {
              // Memberikan varian aksen warna hijau lapangan untuk kartu ke-2 (tengah)
              const isHighlightCard = idx % 3 === 1;

              return (
                <div 
                  key={testimonial.id_testimoni || idx} 
                  className={`w-[84vw] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)] shrink-0 snap-start rounded-2xl p-7 sm:p-8 transition-all duration-300 ease-in-out relative overflow-hidden group flex flex-col justify-between hover:-translate-y-1.5 ${
                    isHighlightCard
                      ? 'bg-court-green text-white shadow-xl hover:shadow-2xl border border-court-green/40'
                      : 'bg-white/90 backdrop-blur-md text-net-charcoal border border-net-charcoal/10 shadow-sm hover:shadow-xl'
                  }`}
                >
                  {/* Elemen Dekoratif: Glow Blur Khusus Kartu Highlight */}
                  {isHighlightCard && (
                    <div className="absolute -bottom-6 -right-6 w-36 h-36 bg-emerald-500/30 rounded-full blur-2xl pointer-events-none"></div>
                  )}

                  {/* Elemen Dekoratif: Tanda Kutip Latar Belakang */}
                  <div 
                    className={`absolute top-3 right-4 font-serif pointer-events-none transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12 select-none text-8xl leading-none ${
                      isHighlightCard 
                        ? 'text-emerald-400/20' 
                        : 'text-net-charcoal/10'
                    }`}
                  >
                    &ldquo;
                  </div>

                  <div>
                    {/* Bintang Rating (5 Bintang) */}
                    <div className={`flex space-x-1 mb-5 relative z-10 ${isHighlightCard ? 'text-yellow-300' : 'text-yellow-400'}`}>
                      {[...Array(5)].map((_, starIdx) => {
                        const isFilled = starIdx < (testimonial.rating || 5);
                        return (
                          <svg 
                            key={starIdx} 
                            className={`w-5 h-5 fill-current ${isFilled ? '' : (isHighlightCard ? 'text-white/20' : 'text-gray-300')}`} 
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                          </svg>
                        );
                      })}
                    </div>

                    {/* Teks Testimoni */}
                    <p className={`leading-relaxed mb-6 relative z-10 text-sm sm:text-base font-sans ${
                      isHighlightCard ? 'text-white/95' : 'text-net-charcoal/80'
                    }`}>
                      &ldquo;{testimonial.komentar}&rdquo;
                    </p>
                  </div>

                  {/* Info Pengguna & Sosial Media / Platform */}
                  <div className={`flex items-center justify-between border-t pt-5 relative z-10 ${
                    isHighlightCard ? 'border-emerald-600/60' : 'border-net-charcoal/10'
                  }`}>
                    <div className="flex items-center min-w-0 pr-2">
                      {/* Foto Profil / Avatar */}
                      <div className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden mr-3 sm:mr-4 shrink-0 shadow-sm ring-2 ${
                        isHighlightCard ? 'ring-emerald-400 bg-emerald-700' : 'ring-court-green/20 bg-court-green/10'
                      }`}>
                        <img 
                          src={testimonial.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.nama || 'User')}&background=1B4A3F&color=fff&size=150`} 
                          alt={testimonial.nama || 'Foto Pengulas'} 
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.nama || 'User')}&background=1B4A3F&color=fff&size=150`;
                          }}
                        />
                      </div>

                      {/* Nama dan Platform / Role */}
                      <div className="truncate">
                        <h4 className={`font-bold text-sm sm:text-base truncate leading-snug ${
                          isHighlightCard ? 'text-white' : 'text-net-charcoal'
                        }`}>
                          {testimonial.nama}
                        </h4>
                        <p className={`text-xs sm:text-sm font-medium mt-0.5 truncate ${
                          isHighlightCard ? 'text-emerald-200' : 'text-court-green'
                        }`}>
                          {testimonial.platform ? `${testimonial.platform}` : 'Member Aktif'}
                        </p>
                      </div>
                    </div>

                    {/* Icon Sosial Media / Platform */}
                    <div className={`flex space-x-2 shrink-0 ${
                      isHighlightCard ? 'text-emerald-200 hover:text-white' : 'text-net-charcoal/40 hover:text-court-green'
                    }`}>
                      {testimonial.platform && testimonial.platform.toLowerCase().includes('instagram') ? (
                        <a href={settings.sosmed_instagram || "#"} target="_blank" rel="noreferrer" title="Instagram" className="hover:scale-110 transition-transform">
                          <Instagram className="w-5 h-5" />
                        </a>
                      ) : testimonial.platform && testimonial.platform.toLowerCase().includes('facebook') ? (
                        <a href={settings.sosmed_facebook || "#"} target="_blank" rel="noreferrer" title="Facebook" className="hover:scale-110 transition-transform">
                          <Facebook className="w-5 h-5" />
                        </a>
                      ) : testimonial.platform && (testimonial.platform.toLowerCase().includes('twitter') || testimonial.platform.toLowerCase().includes(' x')) ? (
                        <a href="#" className="hover:scale-110 transition-transform" title="Twitter/X">
                          <svg className="w-5 h-5 fill-current" viewBox="0 0 16 16">
                            <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z"/>
                          </svg>
                        </a>
                      ) : (
                        <a href={settings.sosmed_google_maps || "#"} target="_blank" rel="noreferrer" title="Ulasan Google" className="hover:scale-110 transition-transform">
                          <MapPin className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Doubles sideline divider */}
      <div className="max-w-6xl mx-auto w-full px-4 my-4">
        <div className="doubles-sideline-divider"></div>
      </div>

      {/* 7. Kontak & Info Lokasi */}
      <section id="kontak" className="max-w-6xl mx-auto w-full px-4 py-12 relative z-10 text-left scroll-mt-24">
        <GlassCard dark lPost className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center border border-chalk-line/10 shadow-2xl">
          
          <div className="md:col-span-7 space-y-6">
            <span className="text-xs font-sans font-bold text-rattan-gold uppercase tracking-widest block">{settings.contact_badge || "Hubungi Pengelola"}</span>
            <h2 className="font-fraunces font-extrabold text-3xl sm:text-4xl text-shuttle-cream leading-tight">
              {settings.contact_title ? settings.contact_title.split('\n').map((line, idx) => <React.Fragment key={idx}>{line}<br/></React.Fragment>) : "Siap Bertanding? Pesan Lapangan Sekarang"}
            </h2>
            <p className="text-sm text-chalk-line/75 font-sans leading-relaxed max-w-xl">
              {settings.contact_desc || "Ada pertanyaan terkait jadwal tetap member, penyewaan raket, atau pendaftaran turnamen? Hubungi staf kami langsung di WhatsApp atau kunjungi lokasi kami di Blahbatuh, Gianyar."}
            </p>
            
            {/* Info details */}
            <div className="space-y-3 font-sans text-xs text-chalk-line/90">
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-rattan-gold shrink-0" />
                <span>{settings.alamat}</span>
              </div>
              <div className="flex items-center gap-3">
                <Clock size={16} className="text-rattan-gold shrink-0" />
                <span>Jam Operasional: {settings.jam_operasional} WITA</span>
              </div>
            </div>
            
            {/* Social media icons */}
            <div className="flex items-center gap-3 pt-2">
              <a 
                href={getSafeSocialUrl(settings.sosmed_instagram, ['instagram.com'], 'https://instagram.com/sorgadesabelega')} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-chalk-line/10 hover:bg-smash-lime hover:text-net-charcoal transition-all text-shuttle-cream shrink-0"
              >
                <Instagram size={18} />
              </a>
              <a 
                href={getSafeSocialUrl(settings.sosmed_facebook, ['facebook.com'], 'https://facebook.com/sorgadesabelega')} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-chalk-line/10 hover:bg-smash-lime hover:text-net-charcoal transition-all text-shuttle-cream shrink-0"
              >
                <Facebook size={18} />
              </a>
              <a 
                href={getSafeSocialUrl(settings.sosmed_google_maps, ['google.com', 'maps.google.com', 'goo.gl'], 'https://maps.google.com/?q=Sorga+Desa+Belega')} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="w-9 h-9 rounded-lg flex items-center justify-center bg-chalk-line/10 hover:bg-smash-lime hover:text-net-charcoal transition-all text-shuttle-cream shrink-0"
              >
                <MapPin size={18} />
              </a>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col gap-3">
            {/* WhatsApp CTA */}
            <a 
              href={`https://wa.me/${String(settings.nomor_wa_admin || '').replace(/[^0-9]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-4 px-6 bg-smash-lime text-net-charcoal font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-smash-lime/90 active:scale-98 transition-all text-center"
            >
              <Phone size={16} strokeWidth={2.5} />
              Hubungi Admin via WA
            </a>

            {/* Google Map Embed */}
            <div className="rounded-xl overflow-hidden h-44 border border-chalk-line/10 relative shadow">
              <iframe 
                title="Sorga Desa Belega Map"
                src={getSafeGoogleMapsUrl(settings.google_maps_iframe)} 
                width="100%" 
                height="100%" 
                style={{ border: 0 }} 
                allowFullScreen="" 
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="w-full h-full"
              ></iframe>
            </div>
          </div>

        </GlassCard>
      </section>

      {/* 8. Footer (No visible Admin link, tiny lock icon at the bottom right) */}
      <footer className="w-full bg-net-charcoal text-chalk-line/45 py-8 text-xs font-sans relative z-10 border-t border-chalk-line/5">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
            <div className="flex items-center gap-2 text-left">
              <div className="w-8 h-8 rounded-lg bg-court-green/10 border border-rattan-gold/30 flex items-center justify-center overflow-hidden shrink-0">
                <img 
                  src={settings.logo_url || DEFAULT_LOGO} 
                  alt="Logo Brand" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="flex flex-col">
                <span className="font-fraunces italic font-semibold text-rattan-gold text-xs leading-none">Sorga</span>
                <span className="font-sans font-bold text-[10px] tracking-wide text-shuttle-cream uppercase leading-none mt-0.5">Desa Belega</span>
              </div>
            </div>
            <span className="text-[11px] tracking-wide sm:border-l sm:border-chalk-line/10 sm:pl-3">&copy; 2026 Booking Sorga Desa Belega. All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#hero" className="hover:text-chalk-line transition-all">Beranda</a>
            <a href="#lapangan" className="hover:text-chalk-line transition-all">Lapangan</a>
            <a href="#jadwal" className="hover:text-chalk-line transition-all">Jadwal</a>
            <a href="#testimoni" className="hover:text-chalk-line transition-all">Testimoni</a>
            <a href="#kontak" className="hover:text-chalk-line transition-all">Kontak</a>
            
            {/* Tiny Admin Lock Icon - HANYA ditunjukkan kecil di footer */}
            <a 
              href="/login" 
              className="text-chalk-line/30 hover:text-smash-lime transition-all p-1"
              title="Admin Login"
            >
              <Lock size={12} />
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Tab Bar Component (Only renders <640px) */}
      <BottomTabBar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          const element = document.getElementById(tab === 'beranda' ? 'hero' : tab);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }} 
        onBookingClick={() => handleOpenBooking()}
      />

      {/* Booking Form Bottom Sheet / Modal */}
      <BottomSheetModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        courts={courts}
        initialCourt={selectedCourtId}
        initialDate={selectedDate}
        initialTime={selectedTime}
        settings={settings}
        onSubmit={handleBookingSubmit}
      />

      {/* Booking Success Confirmation Dialog Overlay */}
      {bookingSuccessData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            onClick={() => setBookingSuccessData(null)}
            className="absolute inset-0 bg-net-charcoal/75 backdrop-blur-sm"
          ></div>
          
          <GlassCard className="w-full max-w-md z-10 p-6 text-center shadow-2xl relative animate-scale-up border border-status-success/30">
            <div className="flex flex-col items-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-status-success/20 text-status-success flex items-center justify-center shadow">
                <CheckCircle2 size={40} />
              </div>
              
              <h3 className="font-fraunces font-bold text-2xl text-net-charcoal">
                Booking Berhasil Diajukan!
              </h3>
              
              <div className="bg-court-green/10 border border-court-green/15 rounded-xl p-4 w-full text-left font-sans text-xs space-y-2 text-net-charcoal">
                <div className="flex justify-between">
                  <span className="font-semibold text-net-charcoal/70">ID Booking:</span>
                  <span className="font-mono font-bold text-court-green">{bookingSuccessData.id_booking}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-net-charcoal/70">Nama Pemesan:</span>
                  <span className="font-bold">{bookingSuccessData.nama_pemesan}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-net-charcoal/70">Lapangan & Waktu:</span>
                  <span className="font-semibold">{bookingSuccessData.id_lapangan} | {bookingSuccessData.tanggal}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-net-charcoal/70">Jam Sewa:</span>
                  <span className="font-mono font-semibold">{bookingSuccessData.jam_mulai} - {bookingSuccessData.jam_selesai}</span>
                </div>
                <div className="flex justify-between border-t border-court-green/20 pt-2 font-base">
                  <span className="font-bold">Total Harga:</span>
                  <span className="font-mono font-bold text-court-green">Rp {bookingSuccessData.total_harga.toLocaleString('id-ID')}</span>
                </div>
              </div>

              <div className="space-y-2 w-full pt-2">
                <a 
                  href={getWaLink(bookingSuccessData)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-smash-lime text-net-charcoal font-sans font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-smash-lime/90 active:scale-98 transition-all shadow cursor-pointer"
                >
                  <Phone size={14} strokeWidth={2.5} />
                  Kirim Bukti Transfer ke WA
                </a>
                
                <button
                  onClick={() => setBookingSuccessData(null)}
                  className="w-full py-2.5 text-net-charcoal/70 hover:text-net-charcoal font-sans font-semibold text-xs tracking-wide cursor-pointer"
                >
                  Tutup Halaman Ini
                </button>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

    </div>
  );
}
