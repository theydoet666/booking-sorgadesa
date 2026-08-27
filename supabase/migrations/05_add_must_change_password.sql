-- ==============================================================================
-- Migration 05: Fitur Ganti Password, Notifikasi Sandi Sementara, & RPC Pendaftaran Staf
-- Deskripsi: Menambahkan kolom must_change_password dan fungsi create_staff_user 
--            serta auto-generate id_user (USR-01, USR-02, dst.) agar tidak NULL.
-- ==============================================================================

-- 1. Pastikan ekstensi pgcrypto aktif untuk enkripsi password bcrypt
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- 2. Tambahkan kolom yang diperlukan jika belum ada
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_user VARCHAR(50);
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        
        -- 3. Berikan izin UPDATE profil mandiri bagi pengguna terautentikasi
        DROP POLICY IF EXISTS "Users can update own must_change_password" ON profiles;
        CREATE POLICY "Users can update own must_change_password" ON profiles
            FOR UPDATE TO authenticated
            USING (id = auth.uid())
            WITH CHECK (id = auth.uid());

        -- 4. Berikan izin INSERT profil saat pendaftaran akun staf
        DROP POLICY IF EXISTS "Allow staff profile insertion" ON profiles;
        CREATE POLICY "Allow staff profile insertion" ON profiles
            FOR INSERT TO authenticated, anon
            WITH CHECK (id = auth.uid() OR get_current_user_role() = 'Super Admin' OR is_admin() OR auth.uid() IS NOT NULL);

        -- 5. Perbaiki id_user yang masih NULL pada data yang sudah ada
        UPDATE profiles 
        SET id_user = 'USR-' || LPAD(row_num::text, 2, '0')
        FROM (
            SELECT id, ROW_NUMBER() OVER (
                ORDER BY 
                    CASE 
                        WHEN username = 'admin' THEN 1 
                        WHEN username = 'kasir' THEN 2 
                        ELSE 3 
                    END, 
                    username ASC
            ) as row_num 
            FROM profiles
        ) sub
        WHERE profiles.id = sub.id AND (profiles.id_user IS NULL OR profiles.id_user = '');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 6. FUNCTION RPC: create_staff_user (Pendaftaran Staf Tanpa Batasan Rate-Limit)
-- ------------------------------------------------------------------------------
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
    -- Verifikasi otorisasi: hanya Super Admin atau Admin yang boleh mendaftarkan staf
    IF auth.uid() IS NOT NULL THEN
        SELECT role INTO v_creator_role
        FROM profiles
        WHERE id = auth.uid() AND status = 'Aktif';

        IF v_creator_role NOT IN ('Super Admin', 'Admin') THEN
            RAISE EXCEPTION 'Akses ditolak: Hanya Super Admin / Admin yang dapat mendaftarkan staf baru.';
        END IF;
    END IF;

    v_email := LOWER(TRIM(p_username)) || '@sorgadesa.com';

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
        -- Generate UUID baru dan hash password menggunakan pgcrypto (bcrypt standard)
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

-- Berikan izin akses eksekusi RPC ke pengguna terautentikasi
GRANT EXECUTE ON FUNCTION create_staff_user(VARCHAR, VARCHAR, VARCHAR, VARCHAR) TO authenticated, anon;
