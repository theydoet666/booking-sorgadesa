import React, { useState, useEffect } from 'react';
import { RefreshCw, Settings, ShieldAlert, Users, Plus, X, Power, Save, Upload, Edit, Trash2, Image, MessageSquare, Star } from 'lucide-react';
import { db } from '../../utils/db';
import GlassCard from '../../components/GlassCard';
import { DEFAULT_LOGO, updateFavicon } from '../../utils/logoHelper';
import { showAlert } from '../../utils/alertHelper';

export default function PengaturanSistem() {
  const [activeSubTab, setActiveSubTab] = useState('umum');
  const [loading, setLoading] = useState(false);

  // 1. State Umum Settings
  const [settingsForm, setSettingsForm] = useState({
    nomor_wa_admin: '',
    nama_desa: '',
    alamat: '',
    jam_operasional: '',
    jam_buka: '08:00',
    jam_tutup: '22:00',
    logo_url: '',
    nama_bank: 'MANDIRI',
    nomor_rekening: '145-00-1234567-8',
    atas_nama_rekening: 'Sorga Desa Belega',
    hero_badge: '',
    hero_title: '',
    hero_sub_badge: '',
    hero_sub_title: '',
    hero_desc: '',
    court_badge: '',
    court_title: '',
    schedule_badge: '',
    schedule_title: '',
    gallery_badge: '',
    gallery_title: '',
    testimonial_badge: '',
    testimonial_title: '',
    contact_badge: '',
    contact_title: '',
    contact_desc: '',
    sosmed_instagram: '',
    sosmed_facebook: '',
    sosmed_google_maps: '',
    google_maps_iframe: ''
  });

  // 2. State Lapangan & Maintenance
  const [courts, setCourts] = useState([]);
  const [selectedCourtId, setSelectedCourtId] = useState('');
  const [maintenanceForm, setMaintenanceForm] = useState({
    tanggal_tutup_mulai: '',
    tanggal_tutup_selesai: '',
    alasan_tutup: ''
  });

  // Court CRUD State
  const [isCourtModalOpen, setIsCourtModalOpen] = useState(false);
  const [courtModalMode, setCourtModalMode] = useState('add'); // 'add' or 'edit'
  const [courtForm, setCourtForm] = useState({
    id_lapangan: '',
    nama_lapangan: '',
    harga_per_jam: '',
    harga_member: '',
    status: 'Aktif',
    keterangan: '',
    tanggal_tutup_mulai: null,
    tanggal_tutup_selesai: null,
    alasan_tutup: null
  });

  // 3. State Staff Users
  const [staffList, setStaffList] = useState([]);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [newStaff, setNewStaff] = useState({
    nama: '',
    username: '',
    role: 'Kasir',
    status: 'Aktif'
  });

  // Paginasi Lapangan
  const [currentCourtPage, setCurrentCourtPage] = useState(1);
  const courtsPerPage = 5;
  
  useEffect(() => {
    setCurrentCourtPage(1);
  }, [courts.length]);

  const totalCourtPages = Math.ceil(courts.length / courtsPerPage);
  const indexOfLastCourt = currentCourtPage * courtsPerPage;
  const indexOfFirstCourt = indexOfLastCourt - courtsPerPage;
  const currentCourts = courts.slice(indexOfFirstCourt, indexOfLastCourt);

  // Paginasi Staf
  const [currentStaffPage, setCurrentStaffPage] = useState(1);
  const staffPerPage = 5;

  useEffect(() => {
    setCurrentStaffPage(1);
  }, [staffList.length]);

  const totalStaffPages = Math.ceil(staffList.length / staffPerPage);
  const indexOfLastStaff = currentStaffPage * staffPerPage;
  const indexOfFirstStaff = indexOfLastStaff - staffPerPage;
  const currentStaffList = staffList.slice(indexOfFirstStaff, indexOfLastStaff);

  // Gallery Management State
  const [galleryList, setGalleryList] = useState([]);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryModalMode, setGalleryModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedGalleryFile, setSelectedGalleryFile] = useState(null);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [galleryForm, setGalleryForm] = useState({
    id_foto: '',
    judul: '',
    url_foto: '',
    status: 'Aktif',
    urutan: 0
  });

  // Testimonial Management State
  const [testimonialList, setTestimonialList] = useState([]);
  const [isTestimonialModalOpen, setIsTestimonialModalOpen] = useState(false);
  const [testimonialModalMode, setTestimonialModalMode] = useState('add'); // 'add' or 'edit'
  const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [testimonialForm, setTestimonialForm] = useState({
    id_testimoni: '',
    nama: '',
    avatar_url: '',
    rating: 5,
    komentar: '',
    platform: 'Google',
    status: 'Aktif',
    urutan: 0
  });

  useEffect(() => {
    loadSettingsData();
  }, []);

  const loadSettingsData = async () => {
    setLoading(true);
    try {
      const config = await db.getSettings();
      setSettingsForm(config);

      // Update browser favicon dynamically
      updateFavicon(config.logo_url || DEFAULT_LOGO);

      const dbCourts = await db.getCourts();
      setCourts(dbCourts);
      if (dbCourts.length > 0) {
        setSelectedCourtId(dbCourts[0].id_lapangan);
      }

      const list = await db.getStaff();
      setStaffList(list);

      const gallery = await db.getGallery();
      setGalleryList(gallery);

      const testimonials = await db.getTestimonials();
      setTestimonialList(testimonials);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Simpan Pengaturan Umum
  const handleSaveGeneralSettings = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validasi nomor wa
    const waRegex = /^62\d{8,}$/;
    if (!waRegex.test(settingsForm.nomor_wa_admin)) {
      showAlert.warning("Nomor WA Tidak Valid", "Format nomor WhatsApp admin tidak valid! Harus diawali dengan kode 62 (contoh: 628123456789), minimal 10 digit.");
      setLoading(false);
      return;
    }

    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const res = await db.saveSettings(settingsForm);
    if (res.success) {
      db.addActivityLog(adminName, 'Ubah Pengaturan Umum', 'Memperbarui nama bisnis, nomor WA, alamat, dan jam operasional');
      showAlert.success("Pengaturan Disimpan", "Profil bisnis dan operasional berhasil diperbarui.");
      loadSettingsData();
    }
    setLoading(false);
  };

  // Upload Logo Baru
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      showAlert.warning("Logo Terlalu Besar", "Ukuran berkas logo brand tidak boleh melebihi 1MB!");
      return;
    }

    setLoading(true);
    const res = await db.uploadLogo(file, true);
    if (res.success) {
      setSettingsForm(prev => ({ ...prev, logo_url: res.logoUrl }));
      updateFavicon(res.logoUrl);
      showAlert.success("Logo Diperbarui", "Logo brand pengelola dan favicon browser berhasil diperbarui!");
      
      const sessionStr = sessionStorage.getItem('sorga_session');
      const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';
      db.addActivityLog(adminName, 'Unggah Logo Baru', 'Memperbarui logo branding dan favicon sistem');
    } else {
      showAlert.error("Gagal", res.message || "Gagal mengunggah logo.");
    }
    setLoading(false);
  };

  // Ajukan Tutup Sementara / Maintenance Lapangan
  const handleApplyMaintenance = async (e) => {
    e.preventDefault();
    if (!selectedCourtId || !maintenanceForm.tanggal_tutup_mulai || !maintenanceForm.alasan_tutup) {
      showAlert.warning("Kolom Belum Lengkap", "Harap lengkapi semua kolom wajib pemeliharaan!");
      return;
    }

    const court = courts.find(c => c.id_lapangan === selectedCourtId);
    if (!court) return;

    const confirmRes = await showAlert.confirm("Tutup Lapangan", `Apakah Anda yakin ingin menyetel ${court.nama_lapangan} ke status Maintenance?`);
    if (!confirmRes.isConfirmed) return;

    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const updatedCourt = {
      ...court,
      status: 'Maintenance',
      tanggal_tutup_mulai: maintenanceForm.tanggal_tutup_mulai,
      tanggal_tutup_selesai: maintenanceForm.tanggal_tutup_selesai || null,
      alasan_tutup: maintenanceForm.alasan_tutup
    };

    const res = await db.updateCourt(updatedCourt);
    if (res.success) {
      db.addActivityLog(adminName, 'Tutup Sementara Lapangan', `Menyetel status Lapangan ${selectedCourtId} ke Maintenance karena: ${maintenanceForm.alasan_tutup}`);
      showAlert.success("Status Maintenance", `Lapangan ${selectedCourtId} berhasil di-set ke Maintenance.`);
      
      // Reset form
      setMaintenanceForm({
        tanggal_tutup_mulai: '',
        tanggal_tutup_selesai: '',
        alasan_tutup: ''
      });
      loadSettingsData();
    }
  };

  // Buka Kembali Lapangan (Batal Tutup Sementara)
  const handleOpenCourt = async (courtId) => {
    const court = courts.find(c => c.id_lapangan === courtId);
    if (!court) return;

    const confirmRes = await showAlert.confirm("Buka Kembali Lapangan", `Aktifkan kembali ${court.nama_lapangan} untuk pemesanan publik?`);
    if (!confirmRes.isConfirmed) return;

    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const updatedCourt = {
      ...court,
      status: 'Aktif',
      tanggal_tutup_mulai: null,
      tanggal_tutup_selesai: null,
      alasan_tutup: null
    };

    const res = await db.updateCourt(updatedCourt);
    if (res.success) {
      db.addActivityLog(adminName, 'Buka Lapangan', `Membuka kembali Lapangan ${courtId} ke status Aktif.`);
      showAlert.success("Lapangan Tanggapan", `Lapangan ${courtId} sekarang aktif dan siap disewa.`);
      loadSettingsData();
    }
  };

  // Buka Modal Tambah Lapangan
  const handleOpenAddCourt = () => {
    const randomId = `LAP-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    setCourtForm({
      id_lapangan: randomId,
      nama_lapangan: '',
      harga_per_jam: '',
      harga_member: '',
      status: 'Aktif',
      keterangan: '',
      tanggal_tutup_mulai: null,
      tanggal_tutup_selesai: null,
      alasan_tutup: null
    });
    setCourtModalMode('add');
    setIsCourtModalOpen(true);
  };

  // Buka Modal Edit Lapangan
  const handleOpenEditCourt = (court) => {
    if (!court) return;
    setCourtForm({
      id_lapangan: court.id_lapangan || '',
      nama_lapangan: court.nama_lapangan || '',
      harga_per_jam: court.harga_per_jam !== undefined ? court.harga_per_jam : '',
      harga_member: court.harga_member !== undefined ? court.harga_member : '',
      status: court.status || 'Aktif',
      keterangan: court.keterangan || '',
      tanggal_tutup_mulai: court.tanggal_tutup_mulai || '',
      tanggal_tutup_selesai: court.tanggal_tutup_selesai || '',
      alasan_tutup: court.alasan_tutup || ''
    });
    setCourtModalMode('edit');
    setIsCourtModalOpen(true);
  };

  // Submit Simpan/Edit Lapangan
  const handleCourtSubmit = async (e) => {
    e.preventDefault();
    if (!courtForm.nama_lapangan || !courtForm.harga_per_jam || !courtForm.harga_member) {
      showAlert.warning("Kolom Belum Lengkap", "Nama lapangan, harga umum, dan harga member wajib diisi!");
      return;
    }

    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const formattedCourt = {
      ...courtForm,
      harga_per_jam: Number(courtForm.harga_per_jam),
      harga_member: Number(courtForm.harga_member),
      tanggal_tutup_mulai: courtForm.tanggal_tutup_mulai || null,
      tanggal_tutup_selesai: courtForm.tanggal_tutup_selesai || null,
      alasan_tutup: courtForm.alasan_tutup || null
    };

    let res;
    if (courtModalMode === 'add') {
      res = await db.addCourt(formattedCourt);
    } else {
      res = await db.updateCourt(formattedCourt);
    }

    if (res.success) {
      const actionText = courtModalMode === 'add' ? 'Menambah Lapangan' : 'Memperbarui Lapangan';
      db.addActivityLog(adminName, actionText, `${actionText}: ${courtForm.nama_lapangan} (ID: ${courtForm.id_lapangan})`);
      setIsCourtModalOpen(false);
      showAlert.success("Berhasil Disimpan", `Data lapangan ${courtForm.nama_lapangan} berhasil disimpan.`);
      loadSettingsData();
    } else {
      showAlert.error("Gagal Menyimpan", res.message || "Terjadi kesalahan saat menyimpan data lapangan.");
    }
  };

  // Hapus Lapangan
  const handleDeleteCourt = async (court) => {
    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const confirmRes = await showAlert.confirm("Hapus Lapangan", `Apakah Anda yakin ingin menghapus ${court.nama_lapangan} secara dengan ID ${court.id_lapangan}? Semua data transaksi yang terkait mungkin akan terdampak.`);
    if (!confirmRes.isConfirmed) return;

    const res = await db.deleteCourt(court.id_lapangan);
    if (res.success) {
      db.addActivityLog(adminName, 'Hapus Lapangan', `Menghapus Lapangan ${court.nama_lapangan} (ID: ${court.id_lapangan})`);
      showAlert.success("Berhasil Dihapus", `Lapangan ${court.nama_lapangan} telah dihapus.`);
      loadSettingsData();
    } else {
      showAlert.error("Gagal Menghapus", res.message || "Gagal menghapus data lapangan.");
    }
  };

  // === GALLERY HANDLERS ===
  const handleOpenAddGallery = () => {
    setGalleryForm({
      id_foto: `IMG-${Date.now()}`,
      judul: '',
      url_foto: '',
      status: 'Aktif',
      urutan: galleryList.length + 1
    });
    setSelectedGalleryFile(null);
    setGalleryModalMode('add');
    setIsGalleryModalOpen(true);
  };

  const handleOpenEditGallery = (photo) => {
    setGalleryForm({
      id_foto: photo.id_foto,
      judul: photo.judul,
      url_foto: photo.url_foto,
      status: photo.status,
      urutan: photo.urutan
    });
    setSelectedGalleryFile(null);
    setGalleryModalMode('edit');
    setIsGalleryModalOpen(true);
  };

  const handleGallerySubmit = async (e) => {
    e.preventDefault();
    if (galleryModalMode === 'add' && !selectedGalleryFile) {
      showAlert.warning("Berkas Belum Dipilih", "Harap pilih berkas foto yang ingin diunggah!");
      return;
    }

    setUploadingGallery(true);
    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    try {
      let finalUrl = galleryForm.url_foto;

      // Jika ada file baru yang dipilih, unggah terlebih dahulu
      if (selectedGalleryFile) {
        const uploadRes = await db.uploadGalleryFile(selectedGalleryFile);
        if (uploadRes.success) {
          finalUrl = uploadRes.url;
        } else {
          showAlert.error("Gagal Mengunggah", uploadRes.message || "Gagal mengunggah foto ke storage.");
          setUploadingGallery(false);
          return;
        }
      }

      const photoData = {
        ...galleryForm,
        url_foto: finalUrl,
        urutan: Number(galleryForm.urutan)
      };

      let res;
      if (galleryModalMode === 'add') {
        const { id_foto, ...insertData } = photoData;
        res = await db.addGalleryImage(insertData);
      } else {
        res = await db.updateGalleryImage(photoData);
      }

      if (res.success) {
        const actionText = galleryModalMode === 'add' ? 'Mengunggah Foto Galeri' : 'Memperbarui Foto Galeri';
        db.addActivityLog(adminName, actionText, `${actionText}: ${photoData.judul}`);
        setIsGalleryModalOpen(false);
        showAlert.success("Berhasil Disimpan", "Foto galeri berhasil disimpan.");
        loadSettingsData();
      } else {
        showAlert.error("Gagal Menyimpan", res.message || "Gagal menyimpan data foto.");
      }
    } catch (err) {
      console.error(err);
      showAlert.error("Terjadi Kesalahan", err.message);
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleDeleteGallery = async (photo) => {
    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const confirmRes = await showAlert.confirm("Hapus Foto", `Apakah Anda yakin ingin menghapus foto "${photo.judul}" secara permanen?`);
    if (!confirmRes.isConfirmed) return;

    const res = await db.deleteGalleryImage(photo.id_foto);
    if (res.success) {
      db.addActivityLog(adminName, 'Hapus Foto Galeri', `Menghapus foto "${photo.judul}"`);
      showAlert.success("Berhasil Dihapus", "Foto berhasil dihapus.");
      loadSettingsData();
    } else {
      showAlert.error("Gagal Menghapus", res.message || "Gagal menghapus foto.");
    }
  };

  // === TESTIMONI HANDLERS ===
  const handleOpenAddTestimonial = () => {
    setTestimonialForm({
      id_testimoni: `TESTI-${Date.now()}`,
      nama: '',
      avatar_url: '',
      rating: 5,
      komentar: '',
      platform: 'Google',
      status: 'Aktif',
      urutan: testimonialList.length + 1
    });
    setSelectedAvatarFile(null);
    setTestimonialModalMode('add');
    setIsTestimonialModalOpen(true);
  };

  const handleOpenEditTestimonial = (testimonial) => {
    setTestimonialForm({
      id_testimoni: testimonial.id_testimoni,
      nama: testimonial.nama,
      avatar_url: testimonial.avatar_url,
      rating: testimonial.rating,
      komentar: testimonial.komentar,
      platform: testimonial.platform || 'Google',
      status: testimonial.status || 'Aktif',
      urutan: testimonial.urutan || 0
    });
    setSelectedAvatarFile(null);
    setTestimonialModalMode('edit');
    setIsTestimonialModalOpen(true);
  };

  const handleTestimonialSubmit = async (e) => {
    e.preventDefault();
    if (testimonialModalMode === 'add' && !selectedAvatarFile) {
      showAlert.warning("Avatar Belum Dipilih", "Harap pilih berkas foto profil / avatar pelanggan!");
      return;
    }

    setUploadingAvatar(true);
    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    try {
      let finalAvatarUrl = testimonialForm.avatar_url;

      // Jika ada file avatar baru yang dipilih, unggah terlebih dahulu
      if (selectedAvatarFile) {
        const uploadRes = await db.uploadAvatarFile(selectedAvatarFile);
        if (uploadRes.success) {
          finalAvatarUrl = uploadRes.url;
        } else {
          showAlert.error("Gagal Mengunggah", uploadRes.message || "Gagal mengunggah avatar ke storage.");
          setUploadingAvatar(false);
          return;
        }
      }

      const testimonialData = {
        ...testimonialForm,
        avatar_url: finalAvatarUrl,
        rating: Number(testimonialForm.rating),
        urutan: Number(testimonialForm.urutan)
      };

      let res;
      if (testimonialModalMode === 'add') {
        const { id_testimoni, ...insertData } = testimonialData;
        res = await db.addTestimonial(insertData);
      } else {
        res = await db.updateTestimonial(testimonialData);
      }

      if (res.success) {
        const actionText = testimonialModalMode === 'add' ? 'Menambah Ulasan Pelanggan' : 'Memperbarui Ulasan Pelanggan';
        db.addActivityLog(adminName, actionText, `${actionText}: ${testimonialData.nama}`);
        setIsTestimonialModalOpen(false);
        showAlert.success("Berhasil Disimpan", "Ulasan pelanggan berhasil disimpan.");
        loadSettingsData();
      } else {
        showAlert.error("Gagal Menyimpan", res.message || "Gagal menyimpan ulasan.");
      }
    } catch (err) {
      console.error(err);
      showAlert.error("Terjadi Kesalahan", err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteTestimonial = async (t) => {
    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const confirmRes = await showAlert.confirm("Hapus Ulasan", `Apakah Anda yakin ingin menghapus ulasan dari "${t.nama}" secara permanen?`);
    if (!confirmRes.isConfirmed) return;

    const res = await db.deleteTestimonial(t.id_testimoni);
    if (res.success) {
      db.addActivityLog(adminName, 'Hapus Ulasan Pelanggan', `Menghapus ulasan dari "${t.nama}"`);
      showAlert.success("Berhasil Dihapus", "Ulasan berhasil dihapus.");
      loadSettingsData();
    } else {
      showAlert.error("Gagal Menghapus", res.message || "Gagal menghapus ulasan.");
    }
  };

  // Simpan Staff Baru
  const handleAddStaffSubmit = async (e) => {
    e.preventDefault();
    if (!newStaff.nama || !newStaff.username) {
      showAlert.warning("Kolom Belum Lengkap", "Nama dan Username wajib diisi!");
      return;
    }

    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';
    
    const staffId = `USR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const staffData = {
      ...newStaff,
      id_user: staffId
    };

    const res = await db.saveStaff(staffData);
    if (res.success) {
      db.addActivityLog(adminName, 'Tambah Staf Baru', `Mendaftarkan staf baru: ${newStaff.nama} (${newStaff.role})`);
      setIsStaffModalOpen(false);
      showAlert.success("Staf Baru Terdaftar", `Akun staf ${newStaff.nama} berhasil didaftarkan ke sistem.`);
      setNewStaff({ nama: '', username: '', role: 'Kasir', status: 'Aktif' });
      loadSettingsData();
    }
  };

  // Toggle Aktif/Nonaktif Staf
  const handleToggleStaffStatus = async (staff) => {
    const sessionStr = sessionStorage.getItem('sorga_session');
    const adminName = sessionStr ? JSON.parse(sessionStr).user.nama : 'Admin';

    const actionText = staff.status === 'Aktif' ? 'menonaktifkan' : 'mengaktifkan';
    const confirmRes = await showAlert.confirm("Konfirmasi Staf", `Apakah Anda yakin ingin ${actionText} akun staf ${staff.nama}?`);
    if (!confirmRes.isConfirmed) return;

    const updated = {
      ...staff,
      status: staff.status === 'Aktif' ? 'Nonaktif' : 'Aktif'
    };

    const res = await db.saveStaff(updated);
    if (res.success) {
      db.addActivityLog(adminName, 'Toggle Status Staf', `Mengubah status staf ${staff.nama} menjadi ${updated.status}`);
      showAlert.success("Status Staf Diperbarui", `Akun staf ${staff.nama} kini berstatus ${updated.status}.`);
      loadSettingsData();
    }
  };

  return (
    <div className="space-y-6 text-net-charcoal">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-fraunces font-bold text-2xl sm:text-3xl text-net-charcoal">Pengaturan Sistem</h2>
          <p className="text-xs font-sans text-net-charcoal/60 uppercase tracking-wider mt-0.5">Konfigurasi Profil, Ketersediaan Lapangan, & Hak Akses</p>
        </div>
        <button 
          onClick={loadSettingsData}
          className="flex items-center justify-center gap-2 py-2.5 px-4 bg-court-green/10 text-court-green hover:bg-court-green/20 rounded-xl font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer border border-court-green/15"
        >
          <RefreshCw size={14} />
          Segarkan
        </button>
      </div>

      {/* Sub Tabs */}
      <div className="flex border-b border-rattan-gold/25 font-sans text-xs font-bold uppercase tracking-wider">
        <button
          onClick={() => setActiveSubTab('umum')}
          className={`py-2.5 px-5 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'umum' ? 'border-court-green text-court-green font-extrabold' : 'border-transparent text-net-charcoal/50 hover:text-net-charcoal'
          }`}
        >
          Info Umum
        </button>
        <button
          onClick={() => setActiveSubTab('lapangan')}
          className={`py-2.5 px-5 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'lapangan' ? 'border-court-green text-court-green font-extrabold' : 'border-transparent text-net-charcoal/50 hover:text-net-charcoal'
          }`}
        >
          Pemeliharaan Lapangan
        </button>
        <button
          onClick={() => setActiveSubTab('staf')}
          className={`py-2.5 px-5 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'staf' ? 'border-court-green text-court-green font-extrabold' : 'border-transparent text-net-charcoal/50 hover:text-net-charcoal'
          }`}
        >
          Kelola Staf
        </button>
        <button
          onClick={() => setActiveSubTab('galeri')}
          className={`py-2.5 px-5 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'galeri' ? 'border-court-green text-court-green font-extrabold' : 'border-transparent text-net-charcoal/50 hover:text-net-charcoal'
          }`}
        >
          Kelola Galeri
        </button>
        <button
          onClick={() => setActiveSubTab('testimoni')}
          className={`py-2.5 px-5 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'testimoni' ? 'border-court-green text-court-green font-extrabold' : 'border-transparent text-net-charcoal/50 hover:text-net-charcoal'
          }`}
        >
          Kelola Testimoni
        </button>
        <button
          onClick={() => setActiveSubTab('konten')}
          className={`py-2.5 px-5 border-b-2 transition-all cursor-pointer ${
            activeSubTab === 'konten' ? 'border-court-green text-court-green font-extrabold' : 'border-transparent text-net-charcoal/50 hover:text-net-charcoal'
          }`}
        >
          Konten Landing Page
        </button>
      </div>

      {/* 1. TAB UMUM */}
      {activeSubTab === 'umum' && (
        <GlassCard lPost className="border border-net-charcoal/10 relative p-6">
          <form onSubmit={handleSaveGeneralSettings} className="space-y-4 text-xs text-left">
            <h3 className="font-fraunces font-bold text-lg text-net-charcoal border-b border-rattan-gold/15 pb-2.5 mb-4 flex items-center gap-2">
              <Settings size={16} />
              Pengaturan Profil Bisnis
            </h3>

            {/* Logo Upload Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 bg-court-green/5 border border-court-green/10 rounded-2xl mb-6">
              <div className="w-20 h-20 rounded-2xl bg-court-green/10 border border-rattan-gold/30 flex items-center justify-center overflow-hidden shrink-0">
                <img 
                  src={settingsForm.logo_url || DEFAULT_LOGO} 
                  alt="Logo Brand" 
                  className="w-full h-full object-cover" 
                />
              </div>
              <div className="text-left space-y-2 flex-1">
                <h4 className="font-bold text-net-charcoal font-sans text-xs uppercase tracking-wider">Logo Brand & Favicon</h4>
                <p className="text-[10px] text-net-charcoal/60 leading-relaxed font-sans">
                  Unggah file gambar logo pengelola (Rekomendasi rasio 1:1, format PNG/JPG/SVG/WebP, maks. 1MB). Logo ini akan dipasang secara real-time di seluruh portal sistem.
                </p>
                <div className="relative inline-block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    id="logo-upload-input"
                  />
                  <label
                    htmlFor="logo-upload-input"
                    className="inline-flex items-center gap-2 py-2.5 px-4 bg-court-green text-shuttle-cream font-sans font-bold text-[10px] uppercase tracking-wider rounded-lg shadow hover:bg-court-green/95 transition-all cursor-pointer"
                  >
                    <Upload size={12} />
                    Pilih Berkas Logo
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nama Desa / Bisnis</label>
                <input
                  type="text"
                  required
                  value={settingsForm.nama_desa}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, nama_desa: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                />
              </div>

              <div>
                <label className="block font-bold text-net-charcoal/70 uppercase mb-1">WhatsApp Admin (Dimulai kode 62) *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 62812345678"
                  value={settingsForm.nomor_wa_admin}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, nomor_wa_admin: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Alamat Fisik Lapangan</label>
              <input
                type="text"
                required
                value={settingsForm.alamat}
                onChange={(e) => setSettingsForm(prev => ({ ...prev, alamat: e.target.value }))}
                className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Jam Operasional (Teks)</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 08:00 - 22:00"
                  value={settingsForm.jam_operasional}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, jam_operasional: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                />
              </div>
              
              <div>
                <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Jam Buka (WITA)</label>
                <input
                  type="text"
                  required
                  placeholder="08:00"
                  value={settingsForm.jam_buka}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, jam_buka: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Jam Tutup (WITA)</label>
                <input
                  type="text"
                  required
                  placeholder="22:00"
                  value={settingsForm.jam_tutup}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, jam_tutup: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                />
              </div>
            </div>

            {/* Rekening Pembayaran Transfer */}
            <div className="pt-4 border-t border-rattan-gold/15 space-y-4">
              <div>
                <h4 className="font-fraunces font-bold text-sm text-net-charcoal flex items-center gap-2">
                  Informasi Rekening Pembayaran Transfer
                </h4>
                <p className="text-[10px] text-net-charcoal/60 leading-relaxed font-sans mt-0.5">
                  Data rekening bank ini akan ditampilkan langsung kepada pelanggan di form booking saat mereka melihat instruksi pembayaran transfer.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nama Bank / Metode *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: MANDIRI, BCA, BRI, QRIS"
                    value={settingsForm.nama_bank || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, nama_bank: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 uppercase font-sans font-bold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nomor Rekening / No. E-Wallet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: 145-00-1234567-8"
                    value={settingsForm.nomor_rekening || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, nomor_rekening: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono font-bold text-court-green"
                  />
                </div>

                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Atas Nama Pemilik Rekening *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Sorga Desa Belega"
                    value={settingsForm.atas_nama_rekening || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, atas_nama_rekening: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 bg-court-green text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-court-green/95 transition-all text-xs pt-3.5 cursor-pointer shadow-md flex items-center gap-2"
            >
              <Save size={14} />
              {loading ? 'Menyimpan...' : 'Simpan Pengaturan'}
            </button>
          </form>
        </GlassCard>
      )}

      {/* 2. TAB PEMELIHARAAN (MAINTENANCE) */}
      {activeSubTab === 'lapangan' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Form Ajukan Tutup */}
          <div className="md:col-span-5">
            <GlassCard lPost className="border border-net-charcoal/10 relative p-5 space-y-4">
              <h3 className="font-fraunces font-bold text-base text-net-charcoal border-b border-rattan-gold/15 pb-2.5 mb-2 flex items-center gap-2 text-left">
                <ShieldAlert size={16} className="text-status-danger" />
                Set Tutup Lapangan (Maintenance)
              </h3>
              
              <form onSubmit={handleApplyMaintenance} className="space-y-4 text-xs text-left">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-net-charcoal/70 uppercase">Pilih Lapangan</label>
                    <button
                      type="button"
                      onClick={() => {
                        const targetCourt = courts.find(c => c.id_lapangan === selectedCourtId) || courts[0];
                        if (targetCourt) handleOpenEditCourt(targetCourt);
                      }}
                      className="text-[10px] font-bold text-court-green hover:text-rattan-gold hover:underline flex items-center gap-1 cursor-pointer transition-colors"
                      title="Ubah Tarif, Nama, atau Keterangan Lapangan Ini"
                    >
                      <Edit size={11} />
                      <span>Edit Data Lapangan</span>
                    </button>
                  </div>
                  <select
                    value={selectedCourtId}
                    onChange={(e) => setSelectedCourtId(e.target.value)}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs font-sans font-medium"
                  >
                    {courts.map(c => (
                      <option key={c.id_lapangan} value={c.id_lapangan}>{c.nama_lapangan} ({c.status})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Mulai Tutup</label>
                    <input
                      type="date"
                      required
                      value={maintenanceForm.tanggal_tutup_mulai}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, tanggal_tutup_mulai: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Akhir Tutup (Opsional)</label>
                    <input
                      type="date"
                      value={maintenanceForm.tanggal_tutup_selesai}
                      onChange={(e) => setMaintenanceForm(prev => ({ ...prev, tanggal_tutup_selesai: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Alasan Tutup Sementara</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Perbaikan lampu lapangan"
                    value={maintenanceForm.alasan_tutup}
                    onChange={(e) => setMaintenanceForm(prev => ({ ...prev, alasan_tutup: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-status-danger text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-status-danger/90 transition-all text-[11px] pt-3.5 cursor-pointer shadow-md"
                >
                  Ajukan Pemeliharaan
                </button>
              </form>
            </GlassCard>
          </div>

          {/* List Status Lapangan */}
          <div className="md:col-span-7">
            <GlassCard className="border border-net-charcoal/10 relative p-5 space-y-4 text-left">
              <div className="border-b border-rattan-gold/15 pb-3 flex items-center justify-between">
                <h3 className="font-fraunces font-bold text-base text-net-charcoal">
                  Status Ketersediaan Lapangan
                </h3>
                <button
                  onClick={handleOpenAddCourt}
                  className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-court-green text-shuttle-cream font-sans font-bold text-[10px] uppercase tracking-wider rounded-lg shadow hover:bg-court-green/95 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus size={12} />
                  <span>Tambah Lapangan</span>
                </button>
              </div>

              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left font-sans text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-net-charcoal/10 text-net-charcoal/50 font-bold uppercase tracking-wider">
                      <th className="py-2 px-1">Lapangan</th>
                      <th className="py-2 px-1 text-center">Status</th>
                      <th className="py-2 px-1">Periode Tutup</th>
                      <th className="py-2 px-1">Alasan Tutup</th>
                      <th className="py-2 px-1 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-net-charcoal/5 font-medium text-net-charcoal/80">
                    {currentCourts.map(c => (
                      <tr key={c.id_lapangan} className="hover:bg-court-green/5">
                        <td className="py-3 px-1 font-bold">{c.nama_lapangan}</td>
                        <td className="py-3 px-1 text-center">
                          <span className={`inline-block py-0.5 px-2 rounded text-[10px] font-bold uppercase ${
                            c.status === 'Aktif'
                              ? 'bg-status-success/20 text-court-green'
                              : c.status === 'Nonaktif'
                              ? 'bg-status-inactive/20 text-status-inactive border border-status-inactive/30'
                              : 'bg-status-danger/10 text-status-danger'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-1 font-mono text-[10px] text-net-charcoal/70">
                          {c.tanggal_tutup_mulai 
                            ? `${c.tanggal_tutup_mulai} s/d ${c.tanggal_tutup_selesai || '?'}` 
                            : '-'
                          }
                        </td>
                        <td className="py-3 px-1 text-net-charcoal/70">{c.alasan_tutup || '-'}</td>
                        <td className="py-3 px-1 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.status === 'Maintenance' && (
                              <button
                                onClick={() => handleOpenCourt(c.id_lapangan)}
                                className="py-1 px-2 bg-status-success text-net-charcoal hover:bg-status-success/90 rounded text-[9px] font-bold uppercase cursor-pointer shrink-0"
                                title="Buka Lapangan"
                              >
                                Buka
                              </button>
                            )}
                            <button
                              onClick={() => handleOpenEditCourt(c)}
                              className="py-1 px-2.5 bg-court-green/10 text-court-green hover:bg-court-green hover:text-white rounded text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                              title={`Edit Data ${c.nama_lapangan}`}
                            >
                              <Edit size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => handleDeleteCourt(c)}
                              className="p-1.5 bg-status-danger/10 text-status-danger hover:bg-status-danger/20 rounded transition-all cursor-pointer"
                              title="Hapus Lapangan"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Kontrol Paginasi Lapangan */}
              {totalCourtPages > 1 && (
                <div className="flex items-center justify-between border-t border-net-charcoal/10 pt-4 mt-4 text-xs font-sans">
                  <span className="text-net-charcoal/60">
                    Menampilkan {indexOfFirstCourt + 1}-{Math.min(indexOfLastCourt, courts.length)} dari {courts.length} lapangan
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentCourtPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentCourtPage === 1}
                      className="py-1 px-3 border border-net-charcoal/20 bg-shuttle-cream/50 text-net-charcoal hover:bg-net-charcoal/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-all cursor-pointer"
                    >
                      Sebelumnya
                    </button>
                    <span className="font-mono font-bold px-2">
                      Halaman {currentCourtPage} dari {totalCourtPages}
                    </span>
                    <button
                      onClick={() => setCurrentCourtPage(prev => Math.min(prev + 1, totalCourtPages))}
                      disabled={currentCourtPage === totalCourtPages}
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
      )}

      {/* 3. TAB KELOLA STAF */}
      {activeSubTab === 'staf' && (
        <GlassCard lPost className="border border-net-charcoal/10 relative p-5 space-y-4 text-left">
          <div className="border-b border-rattan-gold/15 pb-3 flex items-center justify-between">
            <h3 className="font-fraunces font-bold text-base text-net-charcoal flex items-center gap-2">
              <Users size={16} className="text-court-green" />
              Daftar Staf Admin / Kasir
            </h3>
            <button
              onClick={() => setIsStaffModalOpen(true)}
              className="flex items-center justify-center gap-2 py-1.5 px-3.5 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-lg shadow hover:bg-court-green/95 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Daftar Staf Baru</span>
            </button>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left font-sans text-xs border-collapse">
              <thead>
                <tr className="border-b border-net-charcoal/10 text-net-charcoal/50 font-bold uppercase tracking-wider">
                  <th className="py-2 px-3">Nama Lengkap</th>
                  <th className="py-2 px-3">Username</th>
                  <th className="py-2 px-3">Hak Akses Role</th>
                  <th className="py-2 px-3 text-center">Status</th>
                  <th className="py-2 px-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-net-charcoal/5 font-medium text-net-charcoal/80">
                {currentStaffList.map(s => (
                  <tr key={s.id_user} className="hover:bg-court-green/5">
                    <td className="py-3 px-3 font-bold">{s.nama}</td>
                    <td className="py-3 px-3 font-mono">{s.username}</td>
                    <td className="py-3 px-3 uppercase font-semibold text-court-green">{s.role}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block py-0.5 px-2.5 rounded-full text-[10px] font-bold uppercase ${
                        s.status === 'Aktif' 
                          ? 'bg-status-success/20 text-court-green' 
                          : 'bg-status-danger/10 text-status-danger'
                      }`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {s.username !== 'admin' && (
                        <button
                          onClick={() => handleToggleStaffStatus(s)}
                          className={`inline-flex items-center gap-1 py-1 px-2.5 rounded text-[10px] font-bold uppercase cursor-pointer ${
                            s.status === 'Aktif'
                              ? 'bg-status-danger/15 text-status-danger hover:bg-status-danger/25'
                              : 'bg-status-success/20 text-court-green hover:bg-status-success/30'
                          }`}
                        >
                          <Power size={10} /> {s.status === 'Aktif' ? 'Matikan' : 'Aktifkan'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kontrol Paginasi Staf */}
          {totalStaffPages > 1 && (
            <div className="flex items-center justify-between border-t border-net-charcoal/10 pt-4 mt-4 text-xs font-sans">
              <span className="text-net-charcoal/60">
                Menampilkan {indexOfFirstStaff + 1}-{Math.min(indexOfLastStaff, staffList.length)} dari {staffList.length} staf
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentStaffPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentStaffPage === 1}
                  className="py-1 px-3 border border-net-charcoal/20 bg-shuttle-cream/50 text-net-charcoal hover:bg-net-charcoal/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-all cursor-pointer"
                >
                  Sebelumnya
                </button>
                <span className="font-mono font-bold px-2">
                  Halaman {currentStaffPage} dari {totalStaffPages}
                </span>
                <button
                  onClick={() => setCurrentStaffPage(prev => Math.min(prev + 1, totalStaffPages))}
                  disabled={currentStaffPage === totalStaffPages}
                  className="py-1 px-3 border border-net-charcoal/20 bg-shuttle-cream/50 text-net-charcoal hover:bg-net-charcoal/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-all cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      )}

      {/* 4. TAB KELOLA GALERI */}
      {activeSubTab === 'galeri' && (
        <GlassCard lPost className="border border-net-charcoal/10 relative p-5 space-y-4 text-left animate-fade-in">
          <div className="border-b border-rattan-gold/15 pb-3 flex items-center justify-between">
            <h3 className="font-fraunces font-bold text-base text-net-charcoal flex items-center gap-2">
              <Image size={16} className="text-court-green" />
              Kelola Galeri Foto Landing Page
            </h3>
            <button
              onClick={handleOpenAddGallery}
              className="flex items-center justify-center gap-2 py-1.5 px-3.5 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-lg shadow hover:bg-court-green/95 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Tambah Foto</span>
            </button>
          </div>

          {galleryList.length === 0 ? (
            <p className="text-xs text-net-charcoal/60 py-8 text-center font-sans">Belum ada foto galeri terunggah.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 animate-fade-in">
              {galleryList.map(photo => (
                <div key={photo.id_foto} className="group relative bg-court-green/5 border border-net-charcoal/10 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between">
                  
                  {/* Image Aspect Box */}
                  <div className="aspect-video w-full bg-court-green/10 border-b border-net-charcoal/5 relative overflow-hidden">
                    <img
                      src={photo.url_foto}
                      alt={photo.judul}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Status Badge */}
                    <span className={`absolute top-2 left-2 py-0.5 px-2 rounded text-[8px] font-bold uppercase shadow-sm ${
                      photo.status === 'Aktif'
                        ? 'bg-court-green text-shuttle-cream border border-smash-lime/20'
                        : 'bg-net-charcoal/60 text-shuttle-cream border border-chalk-line/10'
                    }`}>
                      {photo.status}
                    </span>

                    {/* Order Badge */}
                    <span className="absolute bottom-2 right-2 py-0.5 px-1.5 rounded bg-rattan-gold text-net-charcoal text-[8px] font-mono font-bold shadow-sm">
                      Urutan: {photo.urutan}
                    </span>
                  </div>

                  {/* Body Content */}
                  <div className="p-3 text-left space-y-2 flex-1 flex flex-col justify-between">
                    <h4 className="font-bold text-net-charcoal font-sans text-[11px] line-clamp-1 leading-snug">
                      {photo.judul}
                    </h4>
                    
                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-net-charcoal/5">
                      <button
                        onClick={() => handleOpenEditGallery(photo)}
                        className="py-1 px-2.5 bg-court-green text-shuttle-cream hover:bg-court-green/95 rounded text-[9px] font-bold uppercase cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteGallery(photo)}
                        className="py-1 px-2.5 bg-status-danger text-shuttle-cream hover:bg-status-danger/95 rounded text-[9px] font-bold uppercase cursor-pointer"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* 5. TAB KELOLA TESTIMONI */}
      {activeSubTab === 'testimoni' && (
        <GlassCard lPost className="border border-net-charcoal/10 relative p-5 space-y-4 text-left animate-fade-in">
          <div className="border-b border-rattan-gold/15 pb-3 flex items-center justify-between">
            <h3 className="font-fraunces font-bold text-base text-net-charcoal flex items-center gap-2">
              <MessageSquare size={16} className="text-court-green" />
              Kelola Testimoni Pelanggan
            </h3>
            <button
              onClick={handleOpenAddTestimonial}
              className="flex items-center justify-center gap-2 py-1.5 px-3.5 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-lg shadow hover:bg-court-green/95 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={14} />
              <span>Tambah Testimoni</span>
            </button>
          </div>

          {testimonialList.length === 0 ? (
            <p className="text-xs text-net-charcoal/60 py-8 text-center font-sans">Belum ada ulasan testimoni terunggah.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-fade-in">
              {testimonialList.map(t => (
                <div key={t.id_testimoni} className="group relative bg-court-green/5 border border-net-charcoal/10 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between p-4 space-y-3">
                  
                  {/* Rating, Platform & Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex text-rattan-gold">
                      {[...Array(t.rating)].map((_, i) => (
                        <Star key={i} size={12} fill="currentColor" />
                      ))}
                      {[...Array(5 - t.rating)].map((_, i) => (
                        <Star key={i} size={12} className="text-net-charcoal/20" />
                      ))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-mono font-bold uppercase text-court-green/70 bg-court-green/10 py-0.5 px-1.5 rounded-full border border-court-green/15">
                        {t.platform || 'Google'}
                      </span>
                      <span className={`py-0.5 px-1.5 rounded text-[8px] font-bold uppercase ${
                        t.status === 'Aktif'
                          ? 'bg-status-success/20 text-court-green'
                          : 'bg-status-inactive/20 text-status-inactive border border-status-inactive/30'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                  </div>

                  {/* Comment */}
                  <p className="text-xs text-net-charcoal/80 leading-relaxed font-sans italic flex-1">
                    "{t.komentar}"
                  </p>

                  {/* User Profile */}
                  <div className="flex items-center justify-between border-t border-net-charcoal/5 pt-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={t.avatar_url}
                        alt={t.nama}
                        className="w-8 h-8 rounded-full object-cover border border-rattan-gold/25"
                      />
                      <div className="text-left">
                        <h4 className="font-bold text-net-charcoal font-sans text-xs">{t.nama}</h4>
                        <span className="text-[8px] text-net-charcoal/40 font-mono">Urutan: {t.urutan || 0}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleOpenEditTestimonial(t)}
                        className="p-1 bg-court-green/10 text-court-green hover:bg-court-green/20 rounded transition-all cursor-pointer"
                        title="Edit Ulasan"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteTestimonial(t)}
                        className="p-1 bg-status-danger/10 text-status-danger hover:bg-status-danger/20 rounded transition-all cursor-pointer"
                        title="Hapus Ulasan"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}

      {/* TAB KELOLA KONTEN LANDING PAGE */}
      {activeSubTab === 'konten' && (
        <GlassCard lPost className="border border-net-charcoal/10 relative p-6 text-left animate-fade-in">
          <form onSubmit={handleSaveGeneralSettings} className="space-y-6 text-xs text-net-charcoal">
            <h3 className="font-fraunces font-bold text-lg text-net-charcoal border-b border-rattan-gold/15 pb-2.5 mb-4 flex items-center gap-2">
              <Settings size={16} />
              Pengaturan Teks Landing Page
            </h3>

            {/* Section 1: Hero */}
            <div className="space-y-4">
              <h4 className="font-bold text-court-green text-xs uppercase tracking-wider border-l-4 border-court-green pl-2">Hero Section</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Hero Badge Text</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.hero_badge || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, hero_badge: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Hero Sub-Badge Text</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.hero_sub_badge || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, hero_sub_badge: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Hero Title</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.hero_title || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, hero_title: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Hero Sub-Title</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.hero_sub_title || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, hero_sub_title: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Hero Description</label>
                <textarea
                  required
                  rows={2}
                  value={settingsForm.hero_desc || ''}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, hero_desc: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                />
              </div>
            </div>

            {/* Section 2: Court & Schedule */}
            <div className="space-y-4 pt-4 border-t border-net-charcoal/10">
              <h4 className="font-bold text-court-green text-xs uppercase tracking-wider border-l-4 border-court-green pl-2">Section Lapangan & Jadwal</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Lapangan Section Badge</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.court_badge || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, court_badge: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Lapangan Section Title</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.court_title || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, court_title: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Jadwal Section Badge</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.schedule_badge || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, schedule_badge: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Jadwal Section Title</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.schedule_title || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, schedule_title: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Gallery & Testimonials */}
            <div className="space-y-4 pt-4 border-t border-net-charcoal/10">
              <h4 className="font-bold text-court-green text-xs uppercase tracking-wider border-l-4 border-court-green pl-2">Section Galeri & Testimoni</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Galeri Section Badge</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.gallery_badge || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, gallery_badge: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Galeri Section Title</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.gallery_title || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, gallery_title: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Testimoni Section Badge</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.testimonial_badge || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, testimonial_badge: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Testimoni Section Title</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.testimonial_title || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, testimonial_title: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Kontak */}
            <div className="space-y-4 pt-4 border-t border-net-charcoal/10">
              <h4 className="font-bold text-court-green text-xs uppercase tracking-wider border-l-4 border-court-green pl-2">Section Kontak & Info</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Kontak Section Badge</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.contact_badge || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, contact_badge: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Kontak Section Title</label>
                  <textarea
                    required
                    rows={2}
                    value={settingsForm.contact_title || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, contact_title: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans"
                  />
                </div>
              </div>
              <div>
                <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Kontak Section Description</label>
                <textarea
                  required
                  rows={2}
                  value={settingsForm.contact_desc || ''}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, contact_desc: e.target.value }))}
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans"
                />
              </div>
            </div>

            {/* Section 5: Sosial Media */}
            <div className="space-y-4 pt-4 border-t border-net-charcoal/10">
              <h4 className="font-bold text-court-green text-xs uppercase tracking-wider border-l-4 border-court-green pl-2">Tautan Sosial Media & Google Maps</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Instagram URL</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.sosmed_instagram || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, sosmed_instagram: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Facebook URL</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.sosmed_facebook || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, sosmed_facebook: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Google Maps URL (Redirect)</label>
                  <input
                    type="text"
                    required
                    value={settingsForm.sosmed_google_maps || ''}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, sosmed_google_maps: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>
              </div>
              <div className="pt-2">
                <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Google Maps Embed (Iframe Src)</label>
                <textarea
                  required
                  rows={2}
                  value={settingsForm.google_maps_iframe || ''}
                  onChange={(e) => setSettingsForm(prev => ({ ...prev, google_maps_iframe: e.target.value }))}
                  placeholder="Masukkan link src iframe Google Maps (contoh: https://www.google.com/maps/embed?...)"
                  className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="py-3 px-6 bg-court-green text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-court-green/95 transition-all text-xs pt-3.5 cursor-pointer shadow-md flex items-center gap-2 mt-4"
            >
              <Save size={14} />
              {loading ? 'Menyimpan...' : 'Simpan Konten Teks'}
            </button>
          </form>
        </GlassCard>
      )}

      {/* New Staff Registration Modal */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsStaffModalOpen(false)} className="absolute inset-0 bg-net-charcoal/60 backdrop-blur-sm"></div>
          
          <div className="w-full max-w-sm z-10">
            <GlassCard lPost className="p-6 relative border border-rattan-gold/30">
              <div className="flex items-center justify-between border-b border-rattan-gold/25 pb-3 mb-4">
                <h3 className="font-fraunces font-bold text-xl text-net-charcoal">Daftar Staf Baru</h3>
                <button onClick={() => setIsStaffModalOpen(false)} className="text-net-charcoal/50 hover:text-net-charcoal">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddStaffSubmit} className="space-y-4 text-xs text-left">
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: I Made Dwi"
                    value={newStaff.nama}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, nama: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>

                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Username Login</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: madedwi"
                    value={newStaff.username}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Hak Akses Role</label>
                  <select
                    value={newStaff.role}
                    onChange={(e) => setNewStaff(prev => ({ ...prev, role: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans font-medium"
                  >
                    <option value="Admin">Admin (Penuh kecuali Super Admin)</option>
                    <option value="Kasir">Kasir (Hanya POS & Booking)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-court-green text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-court-green/95 transition-all text-xs pt-4 cursor-pointer shadow-md"
                >
                  Simpan Akun Staf
                </button>
              </form>
            </GlassCard>
          </div>
        </div>
      )}

      {/* 4. MODAL TAMBAH/EDIT LAPANGAN */}
      {isCourtModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsCourtModalOpen(false)} className="absolute inset-0 bg-net-charcoal/60 backdrop-blur-sm"></div>
          
          <div className="w-full max-w-md z-10">
            <GlassCard lPost className="relative p-6 border border-rattan-gold/30 shadow-2xl max-h-[90vh] overflow-y-auto">
              {/* Close Button */}
              <button
                onClick={() => setIsCourtModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-net-charcoal/50 hover:bg-court-green/10 hover:text-net-charcoal transition-all cursor-pointer"
              >
                <X size={16} />
              </button>

              <div className="mb-4 text-left">
                <h3 className="font-fraunces font-bold text-lg text-net-charcoal">
                  {courtModalMode === 'add' ? 'Tambah Lapangan Baru' : 'Edit Data Lapangan'}
                </h3>
                <p className="text-[10px] font-sans text-net-charcoal/50 uppercase tracking-wider mt-0.5">
                  {courtModalMode === 'add' ? 'Daftarkan fasilitas lapangan baru' : `ID Lapangan: ${courtForm.id_lapangan}`}
                </p>
              </div>

              <form onSubmit={handleCourtSubmit} className="space-y-4 text-xs text-left">
                {courtModalMode === 'add' && (
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">ID Lapangan</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: LAP-004"
                      value={courtForm.id_lapangan}
                      onChange={(e) => setCourtForm(prev => ({ ...prev, id_lapangan: e.target.value.toUpperCase() }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nama Lapangan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Lapangan 4 (Vinyl)"
                    value={courtForm.nama_lapangan}
                    onChange={(e) => setCourtForm(prev => ({ ...prev, nama_lapangan: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Harga Sewa / Jam</label>
                    <input
                      type="number"
                      required
                      placeholder="Harga Umum"
                      value={courtForm.harga_per_jam}
                      onChange={(e) => setCourtForm(prev => ({ ...prev, harga_per_jam: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Harga Member / Jam</label>
                    <input
                      type="number"
                      required
                      placeholder="Harga Member"
                      value={courtForm.harga_member}
                      onChange={(e) => setCourtForm(prev => ({ ...prev, harga_member: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Status Lapangan</label>
                  <select
                    value={courtForm.status}
                    onChange={(e) => setCourtForm(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans font-medium"
                  >
                    <option value="Aktif">Aktif (Siap disewa)</option>
                    <option value="Nonaktif">Nonaktif (Sembunyikan dari Publik)</option>
                    <option value="Maintenance">Maintenance (Tutup Pemeliharaan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Keterangan / Fasilitas</label>
                  <textarea
                    rows={3}
                    placeholder="Contoh: Lantai vinyl standar BWF ketebalan 4.5mm."
                    value={courtForm.keterangan}
                    onChange={(e) => setCourtForm(prev => ({ ...prev, keterangan: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-court-green text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-court-green/95 transition-all text-xs pt-4 cursor-pointer shadow-md"
                >
                  Simpan Data Lapangan
                </button>
              </form>
            </GlassCard>
          </div>
        </div>
      )}

      {/* 5. MODAL TAMBAH/EDIT FOTO GALERI */}
      {isGalleryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md">
            <GlassCard lPost className="relative p-6 border border-rattan-gold/30 shadow-2xl max-h-[90vh] overflow-y-auto">
              
              {/* Close Button */}
              <button
                onClick={() => setIsGalleryModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-net-charcoal/50 hover:bg-court-green/10 hover:text-net-charcoal transition-all cursor-pointer"
                disabled={uploadingGallery}
              >
                <X size={16} />
              </button>

              <div className="mb-4 text-left">
                <h3 className="font-fraunces font-bold text-lg text-net-charcoal">
                  {galleryModalMode === 'add' ? 'Tambah Foto Galeri Baru' : 'Edit Info Foto Galeri'}
                </h3>
                <p className="text-[10px] font-sans text-net-charcoal/50 uppercase tracking-wider mt-0.5">
                  Unggah gambar yang akan dimuat ke galeri halaman utama
                </p>
              </div>

              <form onSubmit={handleGallerySubmit} className="space-y-4 text-xs text-left">
                
                {/* File Input (Image Select) */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Pilih Berkas Foto</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedGalleryFile(e.target.files[0]);
                        const tempUrl = URL.createObjectURL(e.target.files[0]);
                        setGalleryForm(prev => ({ ...prev, url_foto: tempUrl }));
                      }
                    }}
                    required={galleryModalMode === 'add'}
                    className="w-full p-2 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs font-sans"
                    disabled={uploadingGallery}
                  />
                </div>

                {/* Preview Box */}
                {galleryForm.url_foto && (
                  <div className="w-full h-44 rounded-xl bg-court-green/5 border border-net-charcoal/10 flex items-center justify-center overflow-hidden">
                    <img
                      src={galleryForm.url_foto}
                      alt="Pratinjau Galeri"
                      className="w-full h-full object-cover animate-fade-in"
                    />
                  </div>
                )}

                {/* Title */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Judul / Keterangan Singkat</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Keseruan Turnamen Sorga Desa 2026"
                    value={galleryForm.judul}
                    onChange={(e) => setGalleryForm(prev => ({ ...prev, judul: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                    disabled={uploadingGallery}
                  />
                </div>

                {/* Urutan & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nomor Urutan Tampil</label>
                    <input
                      type="number"
                      required
                      placeholder="1, 2, 3..."
                      value={galleryForm.urutan}
                      onChange={(e) => setGalleryForm(prev => ({ ...prev, urutan: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                      disabled={uploadingGallery}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Status Galeri</label>
                    <select
                      value={galleryForm.status}
                      onChange={(e) => setGalleryForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans font-medium"
                      disabled={uploadingGallery}
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={uploadingGallery}
                  className="w-full py-3.5 bg-court-green text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-court-green/95 transition-all text-xs pt-4 cursor-pointer shadow-md disabled:bg-net-charcoal/25 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadingGallery ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sedang Mengunggah...</span>
                    </>
                  ) : (
                    <span>Simpan Foto Galeri</span>
                  )}
                </button>

              </form>
            </GlassCard>
          </div>
        </div>
      )}

      {/* 6. MODAL TAMBAH/EDIT TESTIMONI */}
      {isTestimonialModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md">
            <GlassCard lPost className="relative p-6 border border-rattan-gold/30 shadow-2xl max-h-[90vh] overflow-y-auto">
              
              {/* Close Button */}
              <button
                onClick={() => setIsTestimonialModalOpen(false)}
                className="absolute right-4 top-4 p-1.5 rounded-lg text-net-charcoal/50 hover:bg-court-green/10 hover:text-net-charcoal transition-all cursor-pointer"
                disabled={uploadingAvatar}
              >
                <X size={16} />
              </button>

              <div className="mb-4 text-left">
                <h3 className="font-fraunces font-bold text-lg text-net-charcoal">
                  {testimonialModalMode === 'add' ? 'Tambah Testimoni Baru' : 'Edit Testimoni Pelanggan'}
                </h3>
                <p className="text-[10px] font-sans text-net-charcoal/50 uppercase tracking-wider mt-0.5">
                  Tulis ulasan dan unggah avatar foto profil pelanggan
                </p>
              </div>

              <form onSubmit={handleTestimonialSubmit} className="space-y-4 text-xs text-left">
                
                {/* File Input (Avatar Select) */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Pilih Foto Profil / Avatar</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setSelectedAvatarFile(e.target.files[0]);
                        const tempUrl = URL.createObjectURL(e.target.files[0]);
                        setTestimonialForm(prev => ({ ...prev, avatar_url: tempUrl }));
                      }
                    }}
                    required={testimonialModalMode === 'add'}
                    className="w-full p-2 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 text-xs font-sans"
                    disabled={uploadingAvatar}
                  />
                </div>

                {/* Preview Box */}
                {testimonialForm.avatar_url && (
                  <div className="flex items-center gap-3 p-3 bg-court-green/5 border border-net-charcoal/10 rounded-xl">
                    <img
                      src={testimonialForm.avatar_url}
                      alt="Pratinjau Avatar"
                      className="w-12 h-12 rounded-full object-cover border border-rattan-gold/25 animate-fade-in"
                    />
                    <div>
                      <span className="text-[10px] font-sans text-net-charcoal/40 font-bold uppercase block">Pratinjau Avatar</span>
                      <span className="text-xs font-bold text-net-charcoal font-sans">{testimonialForm.nama || 'Nama Pelanggan'}</span>
                    </div>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nama Pelanggan</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={testimonialForm.nama}
                    onChange={(e) => setTestimonialForm(prev => ({ ...prev, nama: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40"
                    disabled={uploadingAvatar}
                  />
                </div>

                {/* Rating & Platform */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Rating Bintang (1 - 5)</label>
                    <select
                      value={testimonialForm.rating}
                      onChange={(e) => setTestimonialForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans font-medium"
                      disabled={uploadingAvatar}
                    >
                      <option value={5}>⭐⭐⭐⭐⭐ (5 Bintang)</option>
                      <option value={4}>⭐⭐⭐⭐ (4 Bintang)</option>
                      <option value={3}>⭐⭐⭐ (3 Bintang)</option>
                      <option value={2}>⭐⭐ (2 Bintang)</option>
                      <option value={1}>⭐ (1 Bintang)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Platform Sumber</label>
                    <select
                      value={testimonialForm.platform}
                      onChange={(e) => setTestimonialForm(prev => ({ ...prev, platform: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans font-medium"
                      disabled={uploadingAvatar}
                    >
                      <option value="Google">Google Maps</option>
                      <option value="Facebook">Facebook</option>
                      <option value="WhatsApp">WhatsApp</option>
                      <option value="Walk-In">Manual/Staf</option>
                    </select>
                  </div>
                </div>

                {/* Urutan & Status */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Nomor Urutan</label>
                    <input
                      type="number"
                      required
                      placeholder="1, 2, 3..."
                      value={testimonialForm.urutan}
                      onChange={(e) => setTestimonialForm(prev => ({ ...prev, urutan: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-mono"
                      disabled={uploadingAvatar}
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Status Ulasan</label>
                    <select
                      value={testimonialForm.status}
                      onChange={(e) => setTestimonialForm(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans font-medium"
                      disabled={uploadingAvatar}
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block font-bold text-net-charcoal/70 uppercase mb-1">Ulasan / Komentar</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Tulis ulasan pelanggan di sini..."
                    value={testimonialForm.komentar}
                    onChange={(e) => setTestimonialForm(prev => ({ ...prev, komentar: e.target.value }))}
                    className="w-full p-2.5 rounded-lg border border-net-charcoal/20 bg-shuttle-cream/40 font-sans"
                    disabled={uploadingAvatar}
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={uploadingAvatar}
                  className="w-full py-3.5 bg-court-green text-shuttle-cream font-sans font-bold uppercase rounded-lg hover:bg-court-green/95 transition-all text-xs pt-4 cursor-pointer shadow-md disabled:bg-net-charcoal/25 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {uploadingAvatar ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Sedang Mengunggah...</span>
                    </>
                  ) : (
                    <span>Simpan Testimoni</span>
                  )}
                </button>

              </form>
            </GlassCard>
          </div>
        </div>
      )}

    </div>
  );
}
