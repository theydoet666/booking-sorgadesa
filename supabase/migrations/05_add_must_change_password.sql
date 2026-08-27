-- ==============================================================================
-- Migration 05: Tambahkan kolom must_change_password pada tabel profiles
-- Deskripsi: Menandai apakah pengguna perlu mengubah password sementara saat login.
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        -- 1. Tambahkan kolom must_change_password jika belum ada
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
        
        -- 2. Berikan izin UPDATE profil mandiri bagi pengguna terautentikasi
        DROP POLICY IF EXISTS "Users can update own must_change_password" ON profiles;
        CREATE POLICY "Users can update own must_change_password" ON profiles
            FOR UPDATE TO authenticated
            USING (id = auth.uid())
            WITH CHECK (id = auth.uid());

        -- 3. Berikan izin INSERT profil saat pendaftaran akun staf baru oleh Admin/SuperAdmin atau Auth
        DROP POLICY IF EXISTS "Allow staff profile insertion" ON profiles;
        CREATE POLICY "Allow staff profile insertion" ON profiles
            FOR INSERT TO authenticated, anon
            WITH CHECK (id = auth.uid() OR get_current_user_role() = 'Super Admin' OR is_admin() OR auth.uid() IS NOT NULL);
    END IF;
END $$;
