-- ==============================================================================
-- MIGRATION KEAMANAN FASE 2 (RESILIENT / SAFE EXECUTION): Sorga Desa Belega
-- Menggunakan pengecekan IF EXISTS agar query tidak error jika ada tabel yang belum dibuat.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BAGIAN 1: HELPER FUNCTIONS (SECURITY DEFINER TANPA REKURSI RLS)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        SELECT role INTO v_role
        FROM profiles
        WHERE id = auth.uid() AND status = 'Aktif';
        RETURN v_role;
    END IF;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RETURN EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
              AND role IN ('Super Admin', 'Admin', 'Kasir') 
              AND status = 'Aktif'
        );
    END IF;
    RETURN false;
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
STABLE
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        RETURN EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
              AND role IN ('Super Admin', 'Admin') 
              AND status = 'Aktif'
        );
    END IF;
    RETURN false;
END;
$$;

-- ------------------------------------------------------------------------------
-- BAGIAN 2: DATABASE VIEW PUBLIK (ANTI-KEBOCORAN DATA PII PELANGGAN)
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking') THEN
        EXECUTE '
            CREATE OR REPLACE VIEW public_jadwal_lapangan AS
            SELECT 
                id_booking,
                id_lapangan,
                tanggal,
                jam_mulai,
                jam_selesai,
                status_booking
            FROM booking
            WHERE status_booking != ''Dibatalkan'';
            GRANT SELECT ON public_jadwal_lapangan TO anon, authenticated;
        ';
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- BAGIAN 3: ROW LEVEL SECURITY (RLS) DINAMIS PER TABEL
-- ------------------------------------------------------------------------------

DO $$
BEGIN
    -- 1. TABEL: booking
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking') THEN
        ALTER TABLE booking ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS "Public Read Bookings" ON booking;
        DROP POLICY IF EXISTS "Staff Read Bookings" ON booking;
        DROP POLICY IF EXISTS "Public Insert Bookings" ON booking;
        DROP POLICY IF EXISTS "Staff Update Bookings" ON booking;
        DROP POLICY IF EXISTS "Admin Delete Bookings" ON booking;

        CREATE POLICY "Staff Read Bookings" ON booking FOR SELECT TO authenticated USING (is_staff());
        CREATE POLICY "Public Insert Bookings" ON booking FOR INSERT TO anon, authenticated WITH CHECK ((sumber_booking = 'Landing Page' AND status_booking = 'Pending') OR is_staff());
        CREATE POLICY "Staff Update Bookings" ON booking FOR UPDATE TO authenticated USING (is_staff()) WITH CHECK (is_staff());
        CREATE POLICY "Admin Delete Bookings" ON booking FOR DELETE TO authenticated USING (is_admin());
    END IF;

    -- 2. TABEL: lapangan
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lapangan') THEN
        ALTER TABLE lapangan ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Read Lapangan" ON lapangan;
        DROP POLICY IF EXISTS "Admin Manage Lapangan" ON lapangan;

        CREATE POLICY "Public Read Lapangan" ON lapangan FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "Admin Manage Lapangan" ON lapangan FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    -- 3. TABEL: member
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'member') THEN
        ALTER TABLE member ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Staff Read Member" ON member;
        DROP POLICY IF EXISTS "Staff Insert Member" ON member;
        DROP POLICY IF EXISTS "Admin Manage Member" ON member;

        CREATE POLICY "Staff Read Member" ON member FOR SELECT TO authenticated USING (is_staff());
        CREATE POLICY "Staff Insert Member" ON member FOR INSERT TO authenticated WITH CHECK (is_staff());
        CREATE POLICY "Admin Manage Member" ON member FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    -- 4. TABEL: booking_terjadwal
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking_terjadwal') THEN
        ALTER TABLE booking_terjadwal ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Staff Read Booking Terjadwal" ON booking_terjadwal;
        DROP POLICY IF EXISTS "Admin Manage Booking Terjadwal" ON booking_terjadwal;

        CREATE POLICY "Staff Read Booking Terjadwal" ON booking_terjadwal FOR SELECT TO authenticated USING (is_staff());
        CREATE POLICY "Admin Manage Booking Terjadwal" ON booking_terjadwal FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    -- 5. TABEL: produk
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'produk') THEN
        ALTER TABLE produk ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Staff Read Produk" ON produk;
        DROP POLICY IF EXISTS "Admin Manage Produk" ON produk;

        CREATE POLICY "Staff Read Produk" ON produk FOR SELECT TO authenticated USING (is_staff());
        CREATE POLICY "Admin Manage Produk" ON produk FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    -- 6. TABEL: transaksi_pos & transaksi_pos_item
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaksi_pos') THEN
        ALTER TABLE transaksi_pos ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Staff Read POS" ON transaksi_pos;
        DROP POLICY IF EXISTS "Staff Insert POS" ON transaksi_pos;
        DROP POLICY IF EXISTS "Admin Manage POS" ON transaksi_pos;

        CREATE POLICY "Staff Read POS" ON transaksi_pos FOR SELECT TO authenticated USING (is_staff());
        CREATE POLICY "Staff Insert POS" ON transaksi_pos FOR INSERT TO authenticated WITH CHECK (is_staff());
        CREATE POLICY "Admin Manage POS" ON transaksi_pos FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'transaksi_pos_item') THEN
        ALTER TABLE transaksi_pos_item ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Staff Read POS Items" ON transaksi_pos_item;
        DROP POLICY IF EXISTS "Staff Insert POS Items" ON transaksi_pos_item;
        DROP POLICY IF EXISTS "Admin Manage POS Items" ON transaksi_pos_item;

        CREATE POLICY "Staff Read POS Items" ON transaksi_pos_item FOR SELECT TO authenticated USING (is_staff());
        CREATE POLICY "Staff Insert POS Items" ON transaksi_pos_item FOR INSERT TO authenticated WITH CHECK (is_staff());
        CREATE POLICY "Admin Manage POS Items" ON transaksi_pos_item FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    -- 7. TABEL: profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Read Own Profile or Admin" ON profiles;
        DROP POLICY IF EXISTS "SuperAdmin Manage Profiles" ON profiles;

        CREATE POLICY "Read Own Profile or Admin" ON profiles FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin());
        CREATE POLICY "SuperAdmin Manage Profiles" ON profiles FOR ALL TO authenticated USING (get_current_user_role() = 'Super Admin') WITH CHECK (get_current_user_role() = 'Super Admin');
    END IF;

    -- 8. TABEL: log_aktivitas
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'log_aktivitas') THEN
        ALTER TABLE log_aktivitas ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Admin Read Logs" ON log_aktivitas;
        DROP POLICY IF EXISTS "Allow Insert Logs" ON log_aktivitas;

        CREATE POLICY "Admin Read Logs" ON log_aktivitas FOR SELECT TO authenticated USING (is_admin());
        CREATE POLICY "Allow Insert Logs" ON log_aktivitas FOR INSERT TO anon, authenticated WITH CHECK (true);
    END IF;

    -- 9. TABEL: pengaturan
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pengaturan') THEN
        ALTER TABLE pengaturan ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Read Pengaturan" ON pengaturan;
        DROP POLICY IF EXISTS "Admin Manage Pengaturan" ON pengaturan;

        CREATE POLICY "Public Read Pengaturan" ON pengaturan FOR SELECT TO anon, authenticated USING (true);
        CREATE POLICY "Admin Manage Pengaturan" ON pengaturan FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    -- 10. TABEL: galeri
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'galeri') THEN
        ALTER TABLE galeri ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Read Galeri" ON galeri;
        DROP POLICY IF EXISTS "Admin Manage Galeri" ON galeri;

        CREATE POLICY "Public Read Galeri" ON galeri FOR SELECT TO anon, authenticated USING (status = 'Aktif' OR is_admin());
        CREATE POLICY "Admin Manage Galeri" ON galeri FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
    END IF;

    -- 11. TABEL: testimoni
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'testimoni') THEN
        ALTER TABLE testimoni ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Public Read Testimoni" ON testimoni;
        DROP POLICY IF EXISTS "Public Insert Testimoni" ON testimoni;
        DROP POLICY IF EXISTS "Admin Manage Testimoni" ON testimoni;

        CREATE POLICY "Public Read Testimoni" ON testimoni FOR SELECT TO anon, authenticated USING (status = 'Aktif' OR is_admin());
        CREATE POLICY "Public Insert Testimoni" ON testimoni FOR INSERT TO anon, authenticated WITH CHECK (status = 'Pending');
        CREATE POLICY "Admin Manage Testimoni" ON testimoni FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
    END IF;
END $$;
