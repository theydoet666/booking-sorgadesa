import React, { useState } from 'react';
import { Lock, Eye, EyeOff, X, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { db } from '../utils/db';
import { showAlert } from '../utils/alertHelper';

export default function ChangePasswordModal({ isOpen, onClose, onSuccess, userSession }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Semua kolom kata sandi wajib diisi.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Kata sandi baru minimal 8 karakter demi keamanan akun.');
      return;
    }

    if (!/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      setErrorMsg('Kata sandi baru harus mengandung minimal 1 huruf besar (A-Z) dan 1 angka (0-9).');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok dengan kata sandi baru.');
      return;
    }

    setLoading(true);

    try {
      const isLive = isSupabaseConfigured();

      if (isLive) {
        // 1. Update kata sandi pengguna di Supabase Auth
        const { error: authError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (authError) throw authError;

        // 2. Set must_change_password = false di tabel profiles
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          try {
            await supabase
              .from('profiles')
              .update({ must_change_password: false })
              .eq('id', user.id);
          } catch (profileErr) {
            console.warn('Catatan: Kolom must_change_password mungkin belum ada di tabel profiles:', profileErr);
          }
        }
      }

      // 3. Update session lokal agar banner notifikasi langsung hilang
      const currentSessionStr = sessionStorage.getItem('sorga_session');
      if (currentSessionStr) {
        const sessionObj = JSON.parse(currentSessionStr);
        if (sessionObj && sessionObj.user) {
          sessionObj.user.must_change_password = false;
          sessionStorage.setItem('sorga_session', JSON.stringify(sessionObj));
        }
      }

      // 4. Catat ke Log Aktivitas
      const actorName = userSession?.user?.nama || 'Pengelola';
      db.addActivityLog(actorName, 'Ganti Kata Sandi', 'Pengguna berhasil mengubah kata sandi akun');

      showAlert.success(
        "Kata Sandi Diperbarui",
        "Kata sandi Anda berhasil diubah! Gunakan kata sandi baru ini untuk login berikutnya."
      );

      setNewPassword('');
      setConfirmPassword('');
      if (onSuccess) onSuccess();
      if (onClose) onClose();

    } catch (err) {
      console.error('Gagal mengganti password:', err);
      setErrorMsg(err.message || 'Gagal memperbarui kata sandi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={() => !loading && onClose && onClose()} 
        className="absolute inset-0 bg-net-charcoal/60 backdrop-blur-sm transition-opacity"
      ></div>

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-shuttle-cream border border-rattan-gold/30 rounded-2xl p-6 shadow-2xl z-10 text-left">
        
        {/* Header Modal */}
        <div className="flex items-center justify-between pb-4 border-b border-net-charcoal/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-court-green/10 text-court-green flex items-center justify-center border border-court-green/20">
              <KeyRound size={20} />
            </div>
            <div>
              <h3 className="font-fraunces font-bold text-lg text-net-charcoal">Ubah Kata Sandi</h3>
              <p className="text-[11px] font-sans text-net-charcoal/60">
                Akun: <span className="font-bold text-court-green">{userSession?.user?.nama}</span> ({userSession?.user?.role})
              </p>
            </div>
          </div>
          <button
            onClick={() => !loading && onClose && onClose()}
            className="p-1.5 text-net-charcoal/40 hover:text-net-charcoal hover:bg-net-charcoal/5 rounded-lg transition-colors cursor-pointer"
            disabled={loading}
          >
            <X size={18} />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 p-3 bg-status-danger/10 border border-status-danger/30 text-status-danger rounded-xl text-xs">
            <AlertCircle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 font-sans text-left">
          {/* Kata Sandi Baru */}
          <div>
            <label className="block text-xs font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                placeholder="Minimal 6 karakter"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-net-charcoal/20 bg-white/70 focus:outline-none focus:border-court-green text-sm font-sans pl-10 pr-10"
              />
              <Lock size={16} className="absolute left-3.5 top-3.5 text-net-charcoal/40" />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3.5 top-3 text-net-charcoal/40 hover:text-court-green transition-colors p-0.5 rounded cursor-pointer focus:outline-none"
                title={showNewPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {newPassword && newPassword.length < 6 && (
              <span className="text-[10px] text-status-danger mt-1 block">Minimal 6 karakter</span>
            )}
          </div>

          {/* Konfirmasi Kata Sandi */}
          <div>
            <label className="block text-xs font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">
              Konfirmasi Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                placeholder="Ulangi kata sandi baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-3 rounded-xl border border-net-charcoal/20 bg-white/70 focus:outline-none focus:border-court-green text-sm font-sans pl-10 pr-10"
              />
              <Lock size={16} className="absolute left-3.5 top-3.5 text-net-charcoal/40" />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3.5 top-3 text-net-charcoal/40 hover:text-court-green transition-colors p-0.5 rounded cursor-pointer focus:outline-none"
                title={showConfirmPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <span className="text-[10px] text-status-danger mt-1 block">Kata sandi konfirmasi tidak cocok</span>
            )}
          </div>

          {/* Info Box */}
          <div className="p-3 bg-court-green/5 border border-court-green/15 rounded-xl flex items-start gap-2 text-[11px] text-net-charcoal/70">
            <CheckCircle2 size={15} className="text-court-green shrink-0 mt-0.5" />
            <span>Gunakan kombinasi huruf dan angka yang unik agar akun Anda tetap aman.</span>
          </div>

          {/* Tombol Aksi */}
          <div className="flex gap-2.5 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => onClose && onClose()}
              className="flex-1 py-3 border border-net-charcoal/20 text-net-charcoal/70 font-sans font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-net-charcoal/5 transition-all cursor-pointer text-center"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || (newPassword && newPassword.length < 6) || (confirmPassword && newPassword !== confirmPassword)}
              className="flex-1 py-3 bg-court-green text-shuttle-cream font-sans font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-court-green/95 active:scale-[0.99] transition-all shadow cursor-pointer text-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Menyimpan...' : 'Simpan Kata Sandi'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
