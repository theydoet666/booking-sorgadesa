-- ==============================================================================
-- MIGRATION 09: Keep-Alive Automatic Cron & Internal Activity Ping
-- Deskripsi:
-- 1. Membuat fungsi keep_alive_ping() untuk memperbarui timestamp internal database.
-- 2. Memasang jadwal pg_cron otomatis (jika ekstensi pg_cron aktif di Supabase).
-- ==============================================================================

CREATE OR REPLACE FUNCTION keep_alive_ping()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_canceled_count INTEGER := 0;
BEGIN
    -- 1. Jalankan pembersihan booking expired
    SELECT auto_cancel_expired_pending_bookings() INTO v_canceled_count;

    -- 2. Rekam ping internal jika tabel log_aktivitas tersedia
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'log_aktivitas') THEN
        INSERT INTO log_aktivitas (user_nama, aksi, detail)
        VALUES ('Sistem Keep-Alive', 'Ping Otomatis', 'Database ping otomatis berhasil (Pembersihan: ' || v_canceled_count || ' booking expired).');
    END IF;

    RETURN 'Keep-Alive Ping Berhasil! Pembersihan booking: ' || v_canceled_count;
END;
$$;

-- Jadwalkan cron job otomatis berjalan setiap hari jam 04:00 WITA (20:00 UTC)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        PERFORM cron.schedule(
            'keep-supabase-alive-cron',
            '0 20 * * *',
            'SELECT keep_alive_ping();'
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;
