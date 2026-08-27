-- ==============================================================================
-- Migration 05: Tambahkan kolom must_change_password pada tabel profiles
-- Deskripsi: Menandai apakah pengguna perlu mengubah password sementara saat login.
-- ==============================================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT false;
        
        -- Berikan izin UPDATE kolom ini bagi pengguna terautentikasi (sendiri)
        -- RLS Policy: Pengguna bisa update profilnya sendiri
        DROP POLICY IF EXISTS "Users can update own must_change_password" ON profiles;
        CREATE POLICY "Users can update own must_change_password" ON profiles
            FOR UPDATE TO authenticated
            USING (id = auth.uid())
            WITH CHECK (id = auth.uid());
    END IF;
END $$;
