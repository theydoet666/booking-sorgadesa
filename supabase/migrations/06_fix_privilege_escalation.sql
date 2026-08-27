-- ==============================================================================
-- MIGRATION 06: Perbaikan Kerentanan Keamanan Kritis (Privilege Escalation Fix)
-- Deskripsi: 
-- 1. Mengunci fungsi create_staff_user (Tolak total pemanggil anonymous,
--    hanya authenticated Admin / Super Admin, dan cegah Admin membuat Super Admin).
-- 2. Memperketat RLS Policy INSERT pada tabel profiles (Hapus celah auth.uid() IS NOT NULL dan anon).
-- 3. Memperketat RLS Policy SELECT pada tabel log_aktivitas (Hanya Admin / Super Admin).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PERBAIKAN FUNCTION RPC: create_staff_user
-- ------------------------------------------------------------------------------

-- Pastikan fungsi create_staff_user didefinisikan dengan kontrol otorisasi tanpa celah
CREATE OR REPLACE FUNCTION create_staff_user(
    p_nama VARCHAR,
    p_username VARCHAR,
    p_password VARCHAR,
    p_role VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_email VARCHAR;
    v_encrypted_pw VARCHAR;
    v_creator_role VARCHAR;
    v_custom_id_user VARCHAR;
BEGIN
    -- [KEAMANAN 1]: Blokir total pemanggil anonim / tanpa login
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak: harus login untuk mendaftarkan staf.';
    END IF;

    -- [KEAMANAN 2]: Validasi status dan peran pemanggil dari tabel profiles
    SELECT role INTO v_creator_role
    FROM profiles
    WHERE id = auth.uid() AND status = 'Aktif';

    IF v_creator_role IS NULL OR v_creator_role NOT IN ('Super Admin', 'Admin') THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin / Admin yang dapat mendaftarkan staf baru.';
    END IF;

    -- [KEAMANAN 3]: Aturan bisnis - Hanya Super Admin yang boleh membuat sesama Super Admin
    IF p_role = 'Super Admin' AND v_creator_role != 'Super Admin' THEN
        RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin yang berhak membuat akun dengan role Super Admin.';
    END IF;

    -- [KEAMANAN 4]: Validasi parameter role yang diizinkan
    IF p_role NOT IN ('Super Admin', 'Admin', 'Kasir') THEN
        RAISE EXCEPTION 'Role tidak valid: "%"', p_role;
    END IF;

    -- Domain email resmi: @sorgadesa.belega.id
    v_email := LOWER(TRIM(p_username)) || '@sorgadesa.belega.id';

    -- Cek jika username sudah terdaftar di tabel profiles
    IF EXISTS (SELECT 1 FROM profiles WHERE LOWER(username) = LOWER(TRIM(p_username))) THEN
        RAISE EXCEPTION 'Username "%" sudah digunakan oleh staf lain.', p_username;
    END IF;

    -- Generate format id_user otomatis (USR-01, USR-02, dst.)
    v_custom_id_user := 'USR-' || LPAD((COALESCE((SELECT COUNT(*) FROM profiles), 0) + 1)::text, 2, '0');

    -- Cek jika email sudah terdaftar di auth.users
    IF EXISTS (SELECT 1 FROM auth.users WHERE LOWER(email) = v_email) THEN
        SELECT id INTO v_user_id FROM auth.users WHERE LOWER(email) = v_email LIMIT 1;
    ELSE
        -- Generate UUID baru dan hash password menggunakan pgcrypto (bcrypt)
        v_user_id := gen_random_uuid();
        v_encrypted_pw := crypt(p_password, gen_salt('bf'));

        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            v_encrypted_pw,
            NOW(),
            '{"provider":"email","providers":["email"]}'::jsonb,
            jsonb_build_object('nama', p_nama, 'username', LOWER(TRIM(p_username)), 'role', p_role),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
    END IF;

    -- Masukkan atau perbarui profil staf di tabel profiles
    INSERT INTO profiles (
        id,
        id_user,
        nama,
        username,
        role,
        status,
        must_change_password
    ) VALUES (
        v_user_id,
        v_custom_id_user,
        p_nama,
        LOWER(TRIM(p_username)),
        p_role,
        'Aktif',
        true
    )
    ON CONFLICT (id) DO UPDATE SET
        id_user = COALESCE(profiles.id_user, v_custom_id_user),
        nama = EXCLUDED.nama,
        username = EXCLUDED.username,
        role = EXCLUDED.role,
        status = 'Aktif',
        must_change_password = true;

    RETURN jsonb_build_object(
        'success', true,
        'id', v_user_id,
        'id_user', v_custom_id_user,
        'message', 'Akun staf berhasil didaftarkan.'
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$;

-- [KEAMANAN 5]: Cabut total izin eksekusi dari role anonymous & public
REVOKE EXECUTE ON FUNCTION create_staff_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM anon;
REVOKE EXECUTE ON FUNCTION create_staff_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR) FROM public;

-- Berikan izin eksekusi HANYA kepada pengguna terautentikasi (authenticated)
GRANT EXECUTE ON FUNCTION create_staff_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated;


-- ------------------------------------------------------------------------------
-- 2. PERBAIKAN RLS POLICY INSERT TABEL: profiles
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- Hapus policy lama yang longgar
        DROP POLICY IF EXISTS "Allow staff profile insertion" ON profiles;
        
        -- Buat ulang policy INSERT HANYA untuk authenticated dengan kondisi ketat
        CREATE POLICY "Allow staff profile insertion" ON profiles
            FOR INSERT TO authenticated
            WITH CHECK (
                id = auth.uid() 
                OR get_current_user_role() = 'Super Admin' 
                OR is_admin()
            );
    END IF;
END $$;


-- ------------------------------------------------------------------------------
-- 3. PERBAIKAN RLS POLICY SELECT TABEL: log_aktivitas
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'log_aktivitas') THEN
        -- Hapus policy lama
        DROP POLICY IF EXISTS "Admin Read Logs" ON log_aktivitas;
        
        -- Buat ulang policy SELECT khusus Admin dan Super Admin
        CREATE POLICY "Admin Read Logs" ON log_aktivitas
            FOR SELECT TO authenticated
            USING (is_admin() OR get_current_user_role() = 'Super Admin');
    END IF;
END $$;
