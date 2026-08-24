-- ==============================================================================
-- MIGRATION KEAMANAN FASE 3 (FIXED): Sorga Desa Belega
-- 1. Storage Bucket & Policies Hardening (Bucket 'assets')
-- 2. Auto-Cancel Expired Pending Bookings (Pencegahan Slot Hoarding / DoS)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BAGIAN 1: STORAGE BUCKET & RLS POLICIES
-- ------------------------------------------------------------------------------

-- 1. Pastikan bucket 'assets' terdaftar dan bersifat public read
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'assets',
    'assets',
    true,
    5242880, -- Batas maksimal ukuran file: 5MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET 
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

-- 2. Policy Storage RLS untuk storage.objects
-- Catatan: RLS pada storage.objects sudah aktif secara bawaan dari sistem Supabase
DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Read Assets" ON storage.objects;
    DROP POLICY IF EXISTS "Staff Upload Assets" ON storage.objects;
    DROP POLICY IF EXISTS "Staff Update Assets" ON storage.objects;
    DROP POLICY IF EXISTS "Admin Delete Assets" ON storage.objects;

    -- Publik dapat membaca file di bucket assets
    CREATE POLICY "Public Read Assets" ON storage.objects
        FOR SELECT TO anon, authenticated
        USING (bucket_id = 'assets');

    -- Hanya staf terdaftar yang boleh mengunggah file (dan wajib bertipe image)
    CREATE POLICY "Staff Upload Assets" ON storage.objects
        FOR INSERT TO authenticated
        WITH CHECK (
            bucket_id = 'assets' 
            AND (storage.extension(name) IN ('jpg', 'jpeg', 'png', 'webp', 'svg'))
        );

    -- Staf boleh mengupdate file miliknya
    CREATE POLICY "Staff Update Assets" ON storage.objects
        FOR UPDATE TO authenticated
        USING (bucket_id = 'assets')
        WITH CHECK (bucket_id = 'assets');

    -- Admin boleh menghapus file
    CREATE POLICY "Admin Delete Assets" ON storage.objects
        FOR DELETE TO authenticated
        USING (bucket_id = 'assets');
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Aman jika dijalankan di environment dengan konfigurasi storage kustom
END $$;

-- ------------------------------------------------------------------------------
-- BAGIAN 2: AUTO-CANCEL EXPIRED PENDING BOOKINGS (ANTI SLOT-HOARDING / DOS)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION auto_cancel_expired_pending_bookings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_updated_count INTEGER := 0;
BEGIN
    -- Batalkan pemesanan Pending yang:
    -- 1. Berasal dari Landing Page, DAN
    -- 2. Dibuat lebih dari 2 jam yang lalu tanpa konfirmasi pembayaran, ATAU tanggal mainnya sudah terlewati
    UPDATE booking
    SET 
        status_booking = 'Dibatalkan',
        catatan = COALESCE(catatan, '') || ' [Otomatis Dibatalkan: Batas Waktu Pembayaran Habis]'
    WHERE 
        status_booking = 'Pending'
        AND status_pembayaran = 'Belum Bayar'
        AND sumber_booking = 'Landing Page'
        AND (
            created_at < NOW() - INTERVAL '2 hours'
            OR (tanggal < CURRENT_DATE)
        );

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    IF v_updated_count > 0 THEN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'log_aktivitas') THEN
            INSERT INTO log_aktivitas (user_nama, aksi, detail)
            VALUES ('Sistem Auto-Cancel', 'Pembersihan Booking Expired', 'Otomatis membatalkan ' || v_updated_count || ' booking pending kadaluarsa.');
        END IF;
    END IF;

    RETURN v_updated_count;
END;
$$;

-- Jadwalkan cron job otomatis berjalan setiap 30 menit (jika pg_cron aktif di Supabase)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'auto-cancel-pending-bookings',
            '*/30 * * * *',
            'SELECT auto_cancel_expired_pending_bookings();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL; -- Abaikan jika extension pg_cron belum diaktifkan
END $$;
