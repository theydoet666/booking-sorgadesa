-- ==============================================================================
-- MIGRATION KEAMANAN FASE 4: Sorga Desa Belega
-- 1. Database Trigger Anti-Privilege Escalation pada tabel profiles
--    (Mencegah kasir/admin mengubah role/status mereka sendiri via API)
-- ==============================================================================

CREATE OR REPLACE FUNCTION trigger_protect_profile_role()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Jika terjadi perubahan kolom role atau status
    IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.status IS DISTINCT FROM OLD.status) THEN
        -- Periksa apakah user yang sedang login adalah Super Admin
        IF get_current_user_role() != 'Super Admin' THEN
            RAISE EXCEPTION 'Akses Ditolak: Hanya Super Admin yang berhak mengubah role atau status akun staf!';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        DROP TRIGGER IF EXISTS protect_profile_role ON profiles;
        CREATE TRIGGER protect_profile_role
        BEFORE UPDATE ON profiles
        FOR EACH ROW EXECUTE FUNCTION trigger_protect_profile_role();
    END IF;
END $$;
