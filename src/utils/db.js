import { supabase, isSupabaseConfigured } from './supabaseClient';
import { 
  MOCK_COURTS, MOCK_TESTIMONIALS, MOCK_GALLERY, 
  MOCK_SETTINGS, getMockBookingsForToday, MOCK_SOSMED 
} from './mockData';

// Helper to initialize LocalStorage if empty
const initLocalStorage = () => {
  if (!localStorage.getItem('sorga_courts')) {
    localStorage.setItem('sorga_courts', JSON.stringify(MOCK_COURTS));
  }
  if (!localStorage.getItem('sorga_bookings')) {
    localStorage.setItem('sorga_bookings', JSON.stringify(getMockBookingsForToday()));
  }
  if (!localStorage.getItem('sorga_gallery')) {
    localStorage.setItem('sorga_gallery', JSON.stringify(MOCK_GALLERY));
  }
  if (!localStorage.getItem('sorga_testimonials')) {
    localStorage.setItem('sorga_testimonials', JSON.stringify(MOCK_TESTIMONIALS));
  }
  if (!localStorage.getItem('sorga_settings')) {
    localStorage.setItem('sorga_settings', JSON.stringify(MOCK_SETTINGS));
  }
  if (!localStorage.getItem('sorga_products')) {
    const products = [
      { id_produk: "PRD-01", kategori: "Bola", nama_produk: "Kok Yonex Mavis 350 (Pcs)", harga_jual: 15000, harga_modal: 12000, stok: 50, satuan: "Pcs", status: "Aktif" },
      { id_produk: "PRD-02", kategori: "Minuman", nama_produk: "Pocari Sweat 500ml", harga_jual: 8000, harga_modal: 6000, stok: 30, satuan: "Botol", status: "Aktif" },
      { id_produk: "PRD-03", kategori: "Minuman", nama_produk: "Aqua 600ml", harga_jual: 4000, harga_modal: 2000, stok: 100, satuan: "Botol", status: "Aktif" },
      { id_produk: "PRD-04", kategori: "Makanan", nama_produk: "Snack Kacang Bali", harga_jual: 10000, harga_modal: 7500, stok: 25, satuan: "Bungkus", status: "Aktif" }
    ];
    localStorage.setItem('sorga_products', JSON.stringify(products));
  }
  if (!localStorage.getItem('sorga_schedules')) {
    const schedules = [
      { id_jadwal_tetap: "SCH-01", id_member: "MBR-01", nama_member: "Wayan Suarta", id_lapangan: "LAP-001", hari: "Senin", jam_mulai: "18:00", jam_selesai: "20:00", tanggal_mulai_periode: "2026-07-01", tanggal_akhir_periode: "2026-12-31", status: "Aktif", catatan: "PB Belega Rutin" }
    ];
    localStorage.setItem('sorga_schedules', JSON.stringify(schedules));
  }
  if (!localStorage.getItem('sorga_transactions')) {
    localStorage.setItem('sorga_transactions', JSON.stringify([]));
  }
  if (!localStorage.getItem('sorga_staff')) {
    const staff = [
      { id_user: "USR-01", nama: "Admin Utama", username: "admin", role: "Super Admin", status: "Aktif", must_change_password: false },
      { id_user: "USR-02", nama: "Kasir Belega", username: "kasir", role: "Kasir", status: "Aktif", must_change_password: true }
    ];
    localStorage.setItem('sorga_staff', JSON.stringify(staff));
  }
};

initLocalStorage();

export const db = {
  // === LAPANGAN (COURTS) ===
  async getCourts() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('lapangan').select('*').order('id_lapangan');
      if (!error && data) return data;
    }
    return JSON.parse(localStorage.getItem('sorga_courts')) || [];
  },

  async addCourt(court) {
    const sanitized = {
      ...court,
      tanggal_tutup_mulai: court.tanggal_tutup_mulai || null,
      tanggal_tutup_selesai: court.tanggal_tutup_selesai || null,
      alasan_tutup: court.alasan_tutup || null,
      keterangan: court.keterangan || ''
    };

    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('lapangan').insert([sanitized]).select();
      if (!error) return { success: true, data: data[0] };
      return { success: false, message: error.message };
    }
    const courts = JSON.parse(localStorage.getItem('sorga_courts')) || [];
    courts.push(sanitized);
    localStorage.setItem('sorga_courts', JSON.stringify(courts));
    return { success: true, data: sanitized };
  },

  async updateCourt(court) {
    const sanitized = {
      ...court,
      tanggal_tutup_mulai: court.tanggal_tutup_mulai || null,
      tanggal_tutup_selesai: court.tanggal_tutup_selesai || null,
      alasan_tutup: court.alasan_tutup || null,
      keterangan: court.keterangan || ''
    };

    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('lapangan').update(sanitized).eq('id_lapangan', court.id_lapangan);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const courts = JSON.parse(localStorage.getItem('sorga_courts')) || [];
    const index = courts.findIndex(c => c.id_lapangan === court.id_lapangan);
    if (index !== -1) {
      courts[index] = { ...courts[index], ...sanitized };
    } else {
      courts.push(sanitized);
    }
    localStorage.setItem('sorga_courts', JSON.stringify(courts));
    return { success: true };
  },

  async deleteCourt(id) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('lapangan').delete().eq('id_lapangan', id);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const courts = JSON.parse(localStorage.getItem('sorga_courts'));
    const filtered = courts.filter(c => c.id_lapangan !== id);
    localStorage.setItem('sorga_courts', JSON.stringify(filtered));
    return { success: true };
  },

  // === BOOKINGS & SCHEDULE ===
  // 1. Publik: Hanya membaca slot waktu dari Database View (Aman dari kebocoran no HP & nama)
  async getPublicSchedule(date = '') {
    if (isSupabaseConfigured()) {
      let query = supabase.from('public_jadwal_lapangan').select('*');
      if (date) {
        query = query.eq('tanggal', date);
      }
      const { data, error } = await query;
      if (!error && data) return data;
    }
    const all = JSON.parse(localStorage.getItem('sorga_bookings')) || [];
    if (date) {
      return all.filter(b => b.tanggal === date);
    }
    return all;
  },

  // 2. Internal Staf: Membaca detail penuh booking (Memerlukan login staf via RLS)
  async getBookings(date = '') {
    if (isSupabaseConfigured()) {
      let query = supabase.from('booking').select('*, lapangan(nama_lapangan)');
      if (date) {
        query = query.eq('tanggal', date);
      }
      const { data, error } = await query;
      if (!error) return data;
    }
    const all = JSON.parse(localStorage.getItem('sorga_bookings'));
    if (date) {
      return all.filter(b => b.tanggal === date);
    }
    return all;
  },

  async addBooking(booking) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('booking').insert([booking]).select();
      if (!error) return { success: true, data: data[0] };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_bookings'));
    all.push(booking);
    localStorage.setItem('sorga_bookings', JSON.stringify(all));
    return { success: true, data: booking };
  },

  async addBookingsBatch(bookings) {
    if (!bookings || bookings.length === 0) return { success: true, data: [] };
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('booking').insert(bookings).select();
      if (!error) return { success: true, data };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_bookings')) || [];
    const updated = [...all, ...bookings];
    localStorage.setItem('sorga_bookings', JSON.stringify(updated));
    return { success: true, data: bookings };
  },

  async updateBookingStatus(id_booking, updates) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('booking').update(updates).eq('id_booking', id_booking);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_bookings'));
    const idx = all.findIndex(b => b.id_booking === id_booking);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates };
      localStorage.setItem('sorga_bookings', JSON.stringify(all));
      return { success: true };
    }
    return { success: false, message: "Booking tidak ditemukan." };
  },

  // === JADWAL TETAP (RECURRING SCHEDULES) ===
  async getSchedules() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('booking_terjadwal').select('*');
      if (!error) return data;
    }
    return JSON.parse(localStorage.getItem('sorga_schedules'));
  },

  async addSchedule(schedule) {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('booking_terjadwal').insert([schedule]).select();
      if (!error) return { success: true, data: data[0] };
    }
    const all = JSON.parse(localStorage.getItem('sorga_schedules'));
    all.push(schedule);
    localStorage.setItem('sorga_schedules', JSON.stringify(all));
    return { success: true, data: schedule };
  },

  async toggleScheduleStatus(id, newStatus) {
    if (isSupabaseConfigured()) {
      await supabase.from('booking_terjadwal').update({ status: newStatus }).eq('id_jadwal_tetap', id);
    }
    const all = JSON.parse(localStorage.getItem('sorga_schedules'));
    const idx = all.findIndex(s => s.id_jadwal_tetap === id);
    if (idx !== -1) {
      all[idx].status = newStatus;
      localStorage.setItem('sorga_schedules', JSON.stringify(all));
    }
    return { success: true };
  },

  async updateSchedule(schedule) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('booking_terjadwal').upsert([schedule]);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_schedules'));
    const idx = all.findIndex(s => s.id_jadwal_tetap === schedule.id_jadwal_tetap);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...schedule };
    } else {
      all.push(schedule);
    }
    localStorage.setItem('sorga_schedules', JSON.stringify(all));
    return { success: true };
  },

  async deleteSchedule(id) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('booking_terjadwal').delete().eq('id_jadwal_tetap', id);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_schedules'));
    const filtered = all.filter(s => s.id_jadwal_tetap !== id);
    localStorage.setItem('sorga_schedules', JSON.stringify(filtered));
    return { success: true };
  },

  // === PRODUK (POS PRODUCTS) ===
  async getProducts() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('produk').select('*').order('nama_produk');
      if (!error) return data;
    }
    return JSON.parse(localStorage.getItem('sorga_products'));
  },

  async saveProduct(product) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('produk').upsert([product]);
      if (!error) return { success: true };
    }
    const all = JSON.parse(localStorage.getItem('sorga_products'));
    const idx = all.findIndex(p => p.id_produk === product.id_produk);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...product };
    } else {
      all.push(product);
    }
    localStorage.setItem('sorga_products', JSON.stringify(all));
    return { success: true };
  },

  async deleteProduct(id) {
    if (isSupabaseConfigured()) {
      await supabase.from('produk').delete().eq('id_produk', id);
    }
    const all = JSON.parse(localStorage.getItem('sorga_products'));
    const filtered = all.filter(p => p.id_produk !== id);
    localStorage.setItem('sorga_products', JSON.stringify(filtered));
    return { success: true };
  },

  // === TRANSAKSI POS ===
  async getTransactions() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('transaksi_pos')
        .select('*, transaksi_pos_item(*, produk(nama_produk, kategori, harga_modal))')
        .order('tanggal', { ascending: false });
        
      if (!error && data) {
        return data.map(t => ({
          id_transaksi: t.id_transaksi,
          tanggal: t.tanggal,
          id_booking: t.id_booking,
          total_belanja: t.total_belanja,
          metode_bayar: t.metode_bayar,
          kasir: t.kasir,
          nama_konsumen: t.nama_konsumen,
          daftar_item: (t.transaksi_pos_item || []).map(item => ({
            id_produk: item.id_produk,
            nama_produk: item.produk ? item.produk.nama_produk : 'Produk Tidak Dikenal',
            harga: item.harga_satuan,
            qty: item.qty
          }))
        }));
      }
    }
    return JSON.parse(localStorage.getItem('sorga_transactions'));
  },

  async submitPosTransaction(transactionData) {
    const { daftar_item, total_belanja, metode_bayar, kasir, id_booking, nama_konsumen } = transactionData;
    
    if (isSupabaseConfigured()) {
      // 1. Insert ke transaksi_pos
      const { data: trx, error: errTrx } = await supabase
        .from('transaksi_pos')
        .insert([{ total_belanja, metode_bayar, kasir, id_booking, nama_konsumen }])
        .select();
      
      if (errTrx) return { success: false, message: errTrx.message };

      // 2. Insert items (Ini akan mentrigger pos_item_decrease_stock di Supabase)
      const items = daftar_item.map(item => ({
        id_transaksi: trx[0].id_transaksi,
        id_produk: item.id_produk,
        qty: item.qty,
        harga_satuan: item.harga,
        subtotal: item.harga * item.qty
      }));

      const { error: errItems } = await supabase.from('transaksi_pos_item').insert(items);
      if (errItems) return { success: false, message: errItems.message };
      return { success: true };
    }

    // LOCAL STORAGE SIMULATION
    const products = JSON.parse(localStorage.getItem('sorga_products'));
    
    // Validasi stok
    for (let item of daftar_item) {
      const p = products.find(prod => prod.id_produk === item.id_produk);
      if (!p || p.stok < item.qty) {
        return { success: false, message: `Stok tidak mencukupi untuk "${item.nama_produk}". Tersisa: ${p ? p.stok : 0}` };
      }
    }

    // Potong stok
    daftar_item.forEach(item => {
      const p = products.find(prod => prod.id_produk === item.id_produk);
      if (p) p.stok -= item.qty;
    });
    localStorage.setItem('sorga_products', JSON.stringify(products));

    // Simpan transaksi
    const transactions = JSON.parse(localStorage.getItem('sorga_transactions'));
    const newTrx = {
      id_transaksi: `TRX-${Date.now()}`,
      tanggal: new Date().toISOString(),
      id_booking,
      total_belanja,
      metode_bayar,
      kasir,
      nama_konsumen,
      daftar_item // Simpan langsung item untuk mempermudah report di sandbox
    };
    transactions.push(newTrx);
    localStorage.setItem('sorga_transactions', JSON.stringify(transactions));

    return { success: true };
  },

  // === PENGATURAN (SETTINGS) ===
  async getSettings() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('pengaturan').select('*');
      if (!error && data && data.length > 0) {
        const formatted = {};
        data.forEach(s => { formatted[s.key] = s.value; });
        const merged = { ...MOCK_SETTINGS, ...formatted };
        try {
          localStorage.setItem('sorga_settings', JSON.stringify(merged));
        } catch (e) {}
        return merged;
      }
    }
    return JSON.parse(localStorage.getItem('sorga_settings')) || MOCK_SETTINGS;
  },

  async saveSettings(data) {
    if (isSupabaseConfigured()) {
      const rows = Object.keys(data).map(key => ({ key, value: String(data[key]) }));
      await supabase.from('pengaturan').upsert(rows);
    }
    const current = JSON.parse(localStorage.getItem('sorga_settings')) || {};
    const updated = { ...current, ...data };
    localStorage.setItem('sorga_settings', JSON.stringify(updated));
    return { success: true };
  },

  // Helper Client-Side File Validation (MIME Type & File Size)
  validateImageFile(file, maxSizeBytes = 5242880) {
    if (!file) return { valid: false, message: "File tidak ditemukan." };
    if (file.size > maxSizeBytes) {
      return { valid: false, message: `Ukuran file terlalu besar (maksimal ${(maxSizeBytes / (1024 * 1024)).toFixed(0)}MB).` };
    }
    const allowedMime = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
    const allowedExts = ['jpg', 'jpeg', 'png', 'webp', 'svg'];
    const ext = file.name ? file.name.split('.').pop().toLowerCase() : '';
    
    if (!allowedMime.includes(file.type) && !allowedExts.includes(ext)) {
      return { valid: false, message: "Format file tidak didukung! Hanya JPG, PNG, WEBP, dan SVG yang diperbolehkan." };
    }
    return { valid: true };
  },

  async uploadLogo(fileOrBase64, isFile = false) {
    if (isFile) {
      const validation = this.validateImageFile(fileOrBase64);
      if (!validation.valid) {
        return { success: false, message: validation.message };
      }
    }

    if (isSupabaseConfigured() && isFile) {
      try {
        const fileExt = fileOrBase64.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `branding/${fileName}`;

        // 1. Upload to Supabase Storage bucket 'assets'
        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, fileOrBase64, { upsert: true });

        if (uploadError) throw uploadError;

        // 2. Get Public URL
        const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
        const publicUrl = data.publicUrl;

        // 3. Save to database pengaturan
        await this.saveSettings({ logo_url: publicUrl });
        return { success: true, logoUrl: publicUrl };
      } catch (err) {
        console.error("Gagal upload logo ke Supabase storage:", err);
        return { success: false, message: err.message };
      }
    }

    // Fallback/Local Base64 storage
    try {
      let base64Data = fileOrBase64;
      if (isFile) {
        // Read file to base64
        base64Data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(fileOrBase64);
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
        });
      }

      await this.saveSettings({ logo_url: base64Data });
      return { success: true, logoUrl: base64Data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // === LOG AKTIVITAS ===
  async addActivityLog(user, action, detail) {
    if (isSupabaseConfigured()) {
      await supabase.from('log_aktivitas').insert([{ user_nama: user, aksi: action, detail }]);
    }
    // Sandbox log to console/optional list
  },

  // === USERS / STAFF ===
  async getStaff() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('profiles').select('*');
      if (!error && data) {
        return data.map(d => ({
          ...d,
          id_user: d.id || d.id_user || `USR-${d.username}`
        }));
      }
    }
    return JSON.parse(localStorage.getItem('sorga_staff')) || [];
  },

  async saveStaff(staff) {
    if (isSupabaseConfigured()) {
      // Format payload yang valid untuk tabel profiles Supabase (hanya kolom yang ada di database)
      const profileData = {
        nama: staff.nama,
        username: staff.username,
        role: staff.role,
        status: staff.status || 'Aktif'
      };

      if (staff.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(staff.id)) {
        profileData.id = staff.id;
      }

      if (staff.must_change_password !== undefined) {
        profileData.must_change_password = Boolean(staff.must_change_password);
      }

      // Upsert ke tabel profiles
      const { error } = await supabase.from('profiles').upsert([profileData], { onConflict: 'username' });
      if (error) {
        // Jika kolom must_change_password belum dieksekusi di SQL editor Supabase
        if (error.message && (error.message.includes('must_change_password') || error.message.includes('column'))) {
          delete profileData.must_change_password;
          const { error: retryError } = await supabase.from('profiles').upsert([profileData], { onConflict: 'username' });
          if (retryError) {
            console.error("Gagal menyimpan profil staf di Supabase:", retryError);
            return { success: false, message: retryError.message };
          }
        } else {
          console.error("Gagal menyimpan profil staf di Supabase:", error);
          return { success: false, message: error.message };
        }
      }
    }

    const all = JSON.parse(localStorage.getItem('sorga_staff')) || [];
    const staffId = staff.id_user || staff.id || `USR-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const idx = all.findIndex(s => s.username === staff.username || (staff.id_user && s.id_user === staff.id_user));
    const finalStaff = {
      ...staff,
      id_user: staffId
    };

    if (idx !== -1) {
      all[idx] = { ...all[idx], ...finalStaff };
    } else {
      all.push(finalStaff);
    }
    localStorage.setItem('sorga_staff', JSON.stringify(all));
    return { success: true };
  },

  // === GALERI (GALLERY) ===
  async getGallery() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('galeri')
        .select('*')
        .order('urutan', { ascending: true });
      if (!error) return data;
    }
    return JSON.parse(localStorage.getItem('sorga_gallery')) || [];
  },

  async addGalleryImage(photo) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('galeri').insert([photo]);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_gallery')) || [];
    all.push(photo);
    localStorage.setItem('sorga_gallery', JSON.stringify(all));
    return { success: true };
  },

  async updateGalleryImage(photo) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('galeri').upsert([photo]);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_gallery')) || [];
    const idx = all.findIndex(g => g.id_foto === photo.id_foto);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...photo };
    } else {
      all.push(photo);
    }
    localStorage.setItem('sorga_gallery', JSON.stringify(all));
    return { success: true };
  },

  async deleteGalleryImage(id_foto) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('galeri').delete().eq('id_foto', id_foto);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_gallery')) || [];
    // Ensure id_foto match checks both string and numeric types
    const filtered = all.filter(g => String(g.id_foto) !== String(id_foto));
    localStorage.setItem('sorga_gallery', JSON.stringify(filtered));
    return { success: true };
  },

  async uploadGalleryFile(file) {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    if (isSupabaseConfigured()) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `gallery-${Date.now()}.${fileExt}`;
        const filePath = `gallery/${fileName}`;

        // Upload to bucket 'assets'
        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
        return { success: true, url: data.publicUrl };
      } catch (err) {
        console.error("Gagal upload gambar galeri ke Supabase storage:", err);
        return { success: false, message: err.message };
      }
    }

    // Local Base64 storage fallback
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
      return { success: true, url: base64Data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  // === TESTIMONI (TESTIMONIALS) ===
  async getTestimonials() {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('testimoni')
        .select('*')
        .order('urutan', { ascending: true });
      if (!error) return data;
    }
    return JSON.parse(localStorage.getItem('sorga_testimonials')) || [];
  },

  async addTestimonial(testimonial) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('testimoni').insert([testimonial]);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_testimonials')) || [];
    all.push(testimonial);
    localStorage.setItem('sorga_testimonials', JSON.stringify(all));
    return { success: true };
  },

  async updateTestimonial(testimonial) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('testimoni').upsert([testimonial]);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_testimonials')) || [];
    const idx = all.findIndex(t => t.id_testimoni === testimonial.id_testimoni);
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...testimonial };
    } else {
      all.push(testimonial);
    }
    localStorage.setItem('sorga_testimonials', JSON.stringify(all));
    return { success: true };
  },

  async deleteTestimonial(id_testimoni) {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('testimoni').delete().eq('id_testimoni', id_testimoni);
      if (!error) return { success: true };
      return { success: false, message: error.message };
    }
    const all = JSON.parse(localStorage.getItem('sorga_testimonials')) || [];
    const filtered = all.filter(t => String(t.id_testimoni) !== String(id_testimoni));
    localStorage.setItem('sorga_testimonials', JSON.stringify(filtered));
    return { success: true };
  },

  async uploadAvatarFile(file) {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    if (isSupabaseConfigured()) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `avatar-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload to bucket 'assets'
        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
        return { success: true, url: data.publicUrl };
      } catch (err) {
        console.error("Gagal upload gambar avatar ke Supabase storage:", err);
        return { success: false, message: err.message };
      }
    }

    // Local Base64 storage fallback
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
      return { success: true, url: base64Data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  async uploadHeroImage(file) {
    const validation = this.validateImageFile(file);
    if (!validation.valid) {
      return { success: false, message: validation.message };
    }

    if (isSupabaseConfigured()) {
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `hero-bg-${Date.now()}.${fileExt}`;
        const filePath = `hero/${fileName}`;

        // Upload to bucket 'assets'
        const { error: uploadError } = await supabase.storage
          .from('assets')
          .upload(filePath, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('assets').getPublicUrl(filePath);
        return { success: true, url: data.publicUrl };
      } catch (err) {
        console.error("Gagal upload background hero ke Supabase storage:", err);
        return { success: false, message: err.message };
      }
    }

    // Local Base64 storage fallback
    try {
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
      });
      return { success: true, url: base64Data };
    } catch (err) {
      return { success: false, message: err.message };
    }
  }
};
