-- ==============================================================================
-- MIGRATION 08: Tighten Log Aktivitas RLS (Pencegahan Log Flooding / DoS)
-- Deskripsi:
-- 1. Batasi RLS INSERT pada log_aktivitas hanya untuk authenticated users.
-- 2. Buat trigger otomatis log_booking_insert untuk mencatat booking publik secara internal server-side.
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'log_aktivitas') THEN
        DROP POLICY IF EXISTS "Allow Insert Logs" ON log_aktivitas;
        
        -- HANYA pengguna terautentikasi (staf/admin) yang boleh insert log langsung dari client
        CREATE POLICY "Allow Insert Logs" ON log_aktivitas 
            FOR INSERT TO authenticated 
            WITH CHECK (true);
    END IF;
END $$;

-- Automatic Trigger for Public Booking Logging (Server-Side)
CREATE OR REPLACE FUNCTION trigger_log_new_booking()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'log_aktivitas') THEN
        INSERT INTO log_aktivitas (user_nama, aksi, detail)
        VALUES (
            COALESCE(NEW.dibuat_oleh, 'Pelanggan Publik'),
            'Booking Baru',
            'Booking ' || NEW.id_booking || ' diajukan (' || NEW.sumber_booking || ')'
        );
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'booking') THEN
        DROP TRIGGER IF EXISTS log_new_booking_trigger ON booking;
        CREATE TRIGGER log_new_booking_trigger
        AFTER INSERT ON booking
        FOR EACH ROW EXECUTE FUNCTION trigger_log_new_booking();
    END IF;
END $$;
