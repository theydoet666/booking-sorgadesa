// Mock data untuk aplikasi Booking Sorga Desa Belega
// Menggunakan tema warna, nama lokal Bali, dan data realistis standard BWF

export const MOCK_SETTINGS = {
  nomor_wa_admin: "6281234567890",
  nama_desa: "Sorga Desa Belega",
  alamat: "Jl. Raya Belega, Blahbatuh, Gianyar, Bali",
  jam_operasional: "08:00 - 22:00",
  jam_buka: "08:00",
  jam_tutup: "22:00",
  logo_url: "",
  
  // Informasi Rekening Pembayaran
  nama_bank: "MANDIRI",
  nomor_rekening: "145-00-1234567-8",
  atas_nama_rekening: "Sorga Desa Belega",
  
  // Teks Landing Page
  hero_badge: "Gianyar Bali Badminton Community",
  hero_title: "Main Badminton di Sorga Desa Belega",
  hero_sub_badge: "Kualitas Lapangan Kelas Dunia",
  hero_sub_title: "Main Seru & Nyaman",
  hero_desc: "Dapatkan pengalaman bermain badminton terbaik dengan lapangan standar BWF, lantai vinyl premium tebal, dan pencahayaan optimal di Gianyar. Cek jadwal dan booking langsung sekarang!",
  court_badge: "Pilihan Fasilitas",
  court_title: "Daftar Lapangan",
  schedule_badge: "Live Ketersediaan",
  schedule_title: "Jadwal Lapangan",
  gallery_badge: "Fasilitas Kami",
  gallery_title: "Galeri Foto",
  testimonial_badge: "Ulasan Pelanggan",
  testimonial_title: "Apa Kata Mereka",
  contact_badge: "Hubungi Pengelola",
  contact_title: "Siap Bertanding? \nPesan Lapangan Sekarang",
  contact_desc: "Ada pertanyaan terkait jadwal tetap member, penyewaan raket, atau pendaftaran turnamen? Hubungi staf kami langsung di WhatsApp atau kunjungi lokasi kami di Blahbatuh, Gianyar.",
  sosmed_instagram: "https://instagram.com/sorgadesabelega",
  sosmed_facebook: "https://facebook.com/sorgadesabelega",
  sosmed_google_maps: "https://maps.google.com/?q=Sorga+Desa+Belega",
  google_maps_iframe: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15783.565860717208!2d115.30900085!3d-8.50974445!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x2dd21644146059d3%3A0xc3f6735e5d321528!2sBelega%2C%20Blahbatuh%2C%20Gianyar%20Regency%2C%20Bali!5e0!3m2!1sen!2sid!4v1700000000000!5m2!1sen!2sid",
};

export const MOCK_COURTS = [
  {
    id_lapangan: "LAP-001",
    nama_lapangan: "Lapangan 1",
    status: "Aktif",
    harga_per_jam: 50000,
    harga_member: 45000,
    keterangan: "Lapangan vinyl standard BWF di dekat pintu masuk utama. Pencahayaan prima.",
  },
  {
    id_lapangan: "LAP-002",
    nama_lapangan: "Lapangan 2",
    status: "Aktif",
    harga_per_jam: 50000,
    harga_member: 45000,
    keterangan: "Lapangan vinyl standard BWF bagian tengah. Sirkulasi udara sangat baik.",
  },
  {
    id_lapangan: "LAP-003",
    nama_lapangan: "Lapangan 3",
    status: "Aktif",
    harga_per_jam: 50000,
    harga_member: 45000,
    keterangan: "Lapangan vinyl standard BWF bagian dalam. Lebih privat dan tenang.",
  },
  {
    id_lapangan: "LAP-004",
    nama_lapangan: "Lapangan 4",
    status: "Maintenance",
    harga_per_jam: 50000,
    harga_member: 45000,
    keterangan: "Sedang dalam perbaikan lampu LED pencahayaan sisi kanan.",
  }
];

export const MOCK_GALLERY = [
  {
    id_foto: "GAL-001",
    url_foto: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=800&auto=format&fit=crop",
    judul: "Kondisi Lapangan Bulu Tangkis Premium Vinyl Standard BWF",
    urutan: 1,
  },
  {
    id_foto: "GAL-002",
    url_foto: "https://images.unsplash.com/photo-1521537634581-0dced2fee2ef?q=80&w=800&auto=format&fit=crop",
    judul: "Sentra Kerajinan Bambu Desa Belega Gianyar yang Teduh",
    urutan: 2,
  },
  {
    id_foto: "GAL-003",
    url_foto: "https://images.unsplash.com/photo-1613918431208-675277643382?q=80&w=800&auto=format&fit=crop",
    judul: "Pencahayaan LED Badminton Court Anti-Glow di Malam Hari",
    urutan: 3,
  },
  {
    id_foto: "GAL-004",
    url_foto: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?q=80&w=800&auto=format&fit=crop",
    judul: "Ruang Istirahat Berbahan Bambu Eksklusif Belega",
    urutan: 4,
  }
];

export const MOCK_TESTIMONIALS = [
  {
    id_testimoni: "TEST-001",
    nama: "I Wayan Raka Suarta",
    platform: "Google Maps",
    avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    komentar: "Lapangan bulutangkis terbaik di Gianyar. Karpet vinyl-nya empuk dan tebal, lutut tidak gampang sakit. Parkir juga luas dan aman.",
  },
  {
    id_testimoni: "TEST-002",
    nama: "Ni Ketut Sri Lestari",
    platform: "Instagram",
    avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    komentar: "Suka sekali dengan suasananya yang asri khas Belega. Booking lewat website super cepat dan langsung dikonfirmasi admin lewat WA.",
  },
  {
    id_testimoni: "TEST-003",
    nama: "Made Yoga Pratama",
    platform: "Facebook",
    avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    rating: 5,
    komentar: "Fasilitas lengkap, ada POS kasir untuk beli kok Yonex dan minuman dingin tanpa ribet. Recommended banget buat mabar bulutangkis!",
  }
];

export const MOCK_SOSMED = [
  { id_sosmed: "SOS-001", platform: "Instagram", url: "https://instagram.com/sorgadesabelega" },
  { id_sosmed: "SOS-002", platform: "Facebook", url: "https://facebook.com/sorgadesabelega" },
  { id_sosmed: "SOS-003", platform: "Google Maps", url: "https://maps.google.com/?q=Sorga+Desa+Belega" }
];

// Menghasilkan daftar jam operasional harian (08:00 - 22:00)
export const getOperationalHours = () => {
  const hours = [];
  for (let h = 8; h <= 21; h++) {
    const hourStr = String(h).padStart(2, '0');
    hours.push(`${hourStr}:00`);
    hours.push(`${hourStr}:30`);
  }
  return hours;
};

// Mock bookings untuk hari ini
export const getMockBookingsForToday = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  return [
    {
      id_booking: "BK-2026-0001",
      id_lapangan: "LAP-001",
      tanggal: todayStr,
      jam_mulai: "08:00",
      jam_selesai: "10:00",
      nama_pemesan: "I Ketut Wijaya",
      no_hp: "081987654321",
      sumber_booking: "Landing Page",
      status_booking: "Dikonfirmasi",
      status_pembayaran: "Lunas",
      total_harga: 100000,
      nominal_dibayar: 100000,
      catatan: "",
      dibuat_oleh: "Sistem"
    },
    {
      id_booking: "BK-2026-0002",
      id_lapangan: "LAP-002",
      tanggal: todayStr,
      jam_mulai: "09:00",
      jam_selesai: "11:00",
      nama_pemesan: "Wayan Gede",
      no_hp: "081234567890",
      sumber_booking: "Landing Page",
      status_booking: "Pending",
      status_pembayaran: "Belum Bayar",
      total_harga: 100000,
      nominal_dibayar: 0,
      catatan: "Sewa raket 1",
      dibuat_oleh: "Sistem"
    },
    {
      id_booking: "BK-2026-0003",
      id_lapangan: "LAP-001",
      tanggal: todayStr,
      jam_mulai: "18:00",
      jam_selesai: "20:00",
      nama_pemesan: "Member Tetap (PB Belega)",
      no_hp: "081338000000",
      sumber_booking: "Terjadwal",
      status_booking: "Dikonfirmasi",
      status_pembayaran: "Belum Bayar",
      total_harga: 90000,
      nominal_dibayar: 0,
      catatan: "Jadwal Rutin Member",
      dibuat_oleh: "Sistem Trigger"
    },
    {
      id_booking: "BK-2026-0004",
      id_lapangan: "LAP-003",
      tanggal: todayStr,
      jam_mulai: "19:00",
      jam_selesai: "21:00",
      nama_pemesan: "Budi Sentosa",
      no_hp: "081222333444",
      sumber_booking: "Admin",
      status_booking: "Dikonfirmasi",
      status_pembayaran: "Lunas",
      total_harga: 100000,
      nominal_dibayar: 100000,
      catatan: "",
      dibuat_oleh: "Kasir Belega"
    }
  ];
};
