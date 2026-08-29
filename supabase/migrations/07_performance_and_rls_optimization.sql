-- ==============================================================================
-- MIGRATION FASE 7: PERFORMANCE & RLS OPTIMIZATION (Sorga Desa Belega)
-- 1. Menghapus overhead information_schema scan pada RLS helper functions.
-- 2. Menambahkan B-Tree Indexing pada kolom utama untuk mempercepat login & query multi-user.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BAGIAN 1: REFACTOR RLS HELPER FUNCTIONS (HIGH-PERFORMANCE & STABLE CACHED)
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
    SELECT role INTO v_role
    FROM profiles
    WHERE id = auth.uid() AND status = 'Aktif';
    RETURN v_role;
EXCEPTION WHEN OTHERS THEN
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
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
          AND role IN ('Super Admin', 'Admin', 'Kasir') 
          AND status = 'Aktif'
    );
EXCEPTION WHEN OTHERS THEN
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
    RETURN EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() 
          AND role IN ('Super Admin', 'Admin') 
          AND status = 'Aktif'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$;

-- ------------------------------------------------------------------------------
-- BAGIAN 2: B-TREE INDEXING (PENCEGAHAN FULL TABLE SCAN PADA KONEKSI TINGGI)
-- ------------------------------------------------------------------------------

-- Index untuk otentikasi & RLS lookup pada tabel profiles
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_id_role_status ON profiles(id, role, status);

-- Index untuk filter jadwal & booking
CREATE INDEX IF NOT EXISTS idx_booking_tanggal ON booking(tanggal);
CREATE INDEX IF NOT EXISTS idx_booking_status ON booking(status_booking);
CREATE INDEX IF NOT EXISTS idx_booking_lapangan_tanggal ON booking(id_lapangan, tanggal);

-- Index untuk transaksi POS & audit log
CREATE INDEX IF NOT EXISTS idx_transaksi_pos_tanggal ON transaksi_pos(tanggal DESC);
CREATE INDEX IF NOT EXISTS idx_log_aktivitas_created_at ON log_aktivitas(created_at DESC);

-- Index untuk produk & jadwal tetap
CREATE INDEX IF NOT EXISTS idx_produk_status ON produk(status);
CREATE INDEX IF NOT EXISTS idx_booking_terjadwal_status ON booking_terjadwal(status);
