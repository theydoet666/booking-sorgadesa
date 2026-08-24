-- ==============================================================================
-- MIGRATION KEAMANAN FASE 1 (FIXED): Sorga Desa Belega
-- Mencegah Race Condition (Double Booking), Manipulasi Harga & Status, 
-- serta Hardening Security Definer Functions
-- ==============================================================================

-- 1. AKTIFKAN EXTENSION BTREE_GIST UNTUK EXCLUSION CONSTRAINT
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. HELPER FUNCTIONS IMMUTABLE UNTUK TIMESTAMP RANGE
-- Mendukung tipe data kolom TIME maupun VARCHAR/TEXT (Universal Overloads)
CREATE OR REPLACE FUNCTION booking_tsrange(p_tanggal DATE, p_jam_mulai TIME, p_jam_selesai TIME)
RETURNS tsrange
IMMUTABLE
LANGUAGE sql
AS $$
    SELECT tsrange(p_tanggal + p_jam_mulai, p_tanggal + p_jam_selesai, '[)');
$$;

CREATE OR REPLACE FUNCTION booking_tsrange(p_tanggal DATE, p_jam_mulai TEXT, p_jam_selesai TEXT)
RETURNS tsrange
IMMUTABLE
LANGUAGE sql
AS $$
    SELECT tsrange(p_tanggal + p_jam_mulai::time, p_tanggal + p_jam_selesai::time, '[)');
$$;

-- 3. EXCLUSION CONSTRAINT: MENCEGAH DOUBLE BOOKING (RACE CONDITION PROOF)
-- Menjamin di level kernel PostgreSQL bahwa tidak akan pernah ada dua booking
-- pada lapangan yang sama dengan waktu bertabrakan jika status bukan 'Dibatalkan'
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_double_booking'
    ) THEN
        ALTER TABLE booking 
        ADD CONSTRAINT no_double_booking 
        EXCLUDE USING gist (
            id_lapangan WITH =,
            (booking_tsrange(tanggal, jam_mulai, jam_selesai)) WITH &&
        ) WHERE (status_booking != 'Dibatalkan');
    END IF;
END $$;

-- 4. HARDENING SECURITY DEFINER PADA FUNGSI CEK BENTROK JADWAL
CREATE OR REPLACE FUNCTION cek_bentrok_jadwal(
    p_id_lapangan VARCHAR,
    p_tanggal DATE,
    p_jam_mulai TEXT,
    p_jam_selesai TEXT,
    p_ignore_booking_id VARCHAR DEFAULT NULL
) RETURNS BOOLEAN 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_bentrok BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM booking
        WHERE id_lapangan = p_id_lapangan
          AND tanggal = p_tanggal
          AND status_booking != 'Dibatalkan'
          AND (jam_mulai::time) < (p_jam_selesai::time)
          AND (p_jam_mulai::time) < (jam_selesai::time)
          AND (p_ignore_booking_id IS NULL OR id_booking != p_ignore_booking_id)
    ) INTO v_bentrok;
    
    RETURN v_bentrok;
END;
$$;

-- 1.1 PASTIKAN KOLOM ID_MEMBER TERSEDIA PADA TABEL BOOKING
ALTER TABLE booking ADD COLUMN IF NOT EXISTS id_member VARCHAR(50);

-- 5. TRIGGER VALIDASI & KALKULASI HARGA OTOMATIS (ANTI PRICE/STATUS TAMPERING)
-- Menghitung total_harga secara otoritatif di server berdasarkan durasi & master harga lapangan.
-- Memaksa booking dari Landing Page berstatus awal 'Pending' dan 'Belum Bayar'.
CREATE OR REPLACE FUNCTION trigger_validasi_dan_hitung_harga()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    v_harga_per_jam NUMERIC(12, 2);
    v_harga_member NUMERIC(12, 2);
    v_durasi_jam NUMERIC(6, 2);
    v_status_lapangan VARCHAR(20);
BEGIN
    -- 1. Ambil data harga dan status dari master lapangan
    SELECT harga_per_jam, harga_member, status 
    INTO v_harga_per_jam, v_harga_member, v_status_lapangan
    FROM lapangan
    WHERE id_lapangan = NEW.id_lapangan;

    IF v_harga_per_jam IS NULL THEN
        RAISE EXCEPTION 'Lapangan dengan ID % tidak ditemukan!', NEW.id_lapangan;
    END IF;

    IF v_status_lapangan = 'Non-Aktif' THEN
        RAISE EXCEPTION 'Lapangan % sedang tidak aktif.', NEW.id_lapangan;
    END IF;

    -- 2. Validasi Durasi Waktu (Casting ::time aman untuk kolom TIME maupun VARCHAR)
    v_durasi_jam := EXTRACT(EPOCH FROM (NEW.jam_selesai::time - NEW.jam_mulai::time)) / 3600.0;
    IF v_durasi_jam <= 0 THEN
        RAISE EXCEPTION 'Jam selesai (%) harus lebih besar dari jam mulai (%)!', NEW.jam_selesai, NEW.jam_mulai;
    END IF;

    -- 3. Kalkulasi Total Harga Resmi
    IF NEW.sumber_booking = 'Terjadwal' THEN
        NEW.total_harga := v_durasi_jam * COALESCE(v_harga_member, v_harga_per_jam);
    ELSE
        NEW.total_harga := v_durasi_jam * v_harga_per_jam;
    END IF;

    -- 4. Perlindungan Status untuk Input Publik (Landing Page)
    IF NEW.sumber_booking = 'Landing Page' THEN
        NEW.status_booking := 'Pending';
        NEW.status_pembayaran := 'Belum Bayar';
        NEW.nominal_dibayar := 0;
        NEW.dibuat_oleh := 'Landing Page';
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_booking_price ON booking;
CREATE TRIGGER enforce_booking_price
BEFORE INSERT ON booking
FOR EACH ROW EXECUTE FUNCTION trigger_validasi_dan_hitung_harga();

-- 6. HARDENING SECURITY DEFINER PADA GENERATE BOOKING MINGGUAN (CRON)
CREATE OR REPLACE FUNCTION generate_booking_mingguan()
RETURNS TEXT 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    r_jadwal RECORD;
    v_target_date DATE;
    v_day_name VARCHAR;
    v_generated_count INTEGER := 0;
    v_warning_count INTEGER := 0;
    v_harga_sewa NUMERIC(12, 2);
    v_durasi_jam NUMERIC(4, 2);
    v_id_booking VARCHAR;
    v_hari_ke_depan INTEGER;
BEGIN
    FOR v_hari_ke_depan IN 0..7 LOOP
        v_target_date := CURRENT_DATE + v_hari_ke_depan;
        
        SELECT CASE EXTRACT(ISODOW FROM v_target_date)
            WHEN 1 THEN 'Senin'
            WHEN 2 THEN 'Selasa'
            WHEN 3 THEN 'Rabu'
            WHEN 4 THEN 'Kamis'
            WHEN 5 THEN 'Jumat'
            WHEN 6 THEN 'Sabtu'
            WHEN 7 THEN 'Minggu'
        END INTO v_day_name;

        FOR r_jadwal IN 
            SELECT bt.*, m.nama AS nama_member, l.harga_member, l.nama_lapangan
            FROM booking_terjadwal bt
            JOIN member m ON bt.id_member = m.id_member
            JOIN lapangan l ON bt.id_lapangan = l.id_lapangan
            WHERE bt.status = 'Aktif' 
              AND bt.hari LIKE '%' || v_day_name || '%'
              AND bt.tanggal_mulai_periode <= v_target_date
              AND (bt.tanggal_akhir_periode IS NULL OR bt.tanggal_akhir_periode >= v_target_date)
        LOOP
            IF EXISTS (
                SELECT 1 FROM lapangan 
                WHERE id_lapangan = r_jadwal.id_lapangan 
                  AND status = 'Maintenance'
                  AND (
                    (tanggal_tutup_mulai IS NULL OR v_target_date >= tanggal_tutup_mulai)
                    AND (tanggal_tutup_selesai IS NULL OR v_target_date <= tanggal_tutup_selesai)
                  )
            ) THEN
                v_warning_count := v_warning_count + 1;
                INSERT INTO log_aktivitas (user_nama, aksi, detail)
                VALUES ('Sistem Trigger', 'Skip Operasional', 'Lewati jadwal ' || r_jadwal.id_jadwal_tetap || ' Lapangan ' || r_jadwal.id_lapangan || ' tgl ' || v_target_date || ' karena Maintenance');
                CONTINUE;
            END IF;

            IF cek_bentrok_jadwal(r_jadwal.id_lapangan, v_target_date, r_jadwal.jam_mulai::text, r_jadwal.jam_selesai::text) THEN
                v_warning_count := v_warning_count + 1;
                INSERT INTO log_aktivitas (user_nama, aksi, detail)
                VALUES ('Sistem Trigger', 'Peringatan Bentrok Rutin', 'Lewati jadwal ' || r_jadwal.id_jadwal_tetap || ' Lapangan ' || r_jadwal.id_lapangan || ' tgl ' || v_target_date || ' karena bentrok jadwal');
                CONTINUE;
            END IF;

            v_durasi_jam := EXTRACT(EPOCH FROM (r_jadwal.jam_selesai::time - r_jadwal.jam_mulai::time)) / 3600.0;
            v_harga_sewa := r_jadwal.harga_member * v_durasi_jam;
            v_id_booking := 'BK-' || TO_CHAR(v_target_date, 'YYYYMMDD') || '-' || SUBSTRING(r_jadwal.id_jadwal_tetap::TEXT, 1, 8);

            IF NOT EXISTS (SELECT 1 FROM booking WHERE id_booking = v_id_booking) THEN
                INSERT INTO booking (
                    id_booking, id_lapangan, tanggal, jam_mulai, jam_selesai,
                    nama_pemesan, no_hp, sumber_booking, status_booking,
                    status_pembayaran, nominal_dibayar, total_harga,
                    id_member, catatan, dibuat_oleh
                ) VALUES (
                    v_id_booking, r_jadwal.id_lapangan, v_target_date, r_jadwal.jam_mulai, r_jadwal.jam_selesai,
                    r_jadwal.nama_member, '-', 'Terjadwal', 'Dikonfirmasi',
                    'Belum Bayar', 0, v_harga_sewa,
                    r_jadwal.id_member, 'Jadwal Rutin Member (' || r_jadwal.id_jadwal_tetap || ')', 'Sistem Trigger'
                );
                v_generated_count := v_generated_count + 1;
            END IF;
        END LOOP;
    END LOOP;

    RETURN 'Generate Selesai! Berhasil membuat ' || v_generated_count || ' slot booking. (Dilewati: ' || v_warning_count || ')';
END;
$$;
