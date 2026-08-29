import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, AlertCircle, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';
import { db } from '../utils/db';
import GlassCard from '../components/GlassCard';
import { DEFAULT_LOGO, updateFavicon } from '../utils/logoHelper';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 60000; // 60 detik

export default function LoginAdmin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [loginAttempts, setLoginAttempts] = useState(() => {
    try {
      const stored = sessionStorage.getItem('sorga_login_attempts');
      return stored ? JSON.parse(stored) : { count: 0, lockoutUntil: 0 };
    } catch { return { count: 0, lockoutUntil: 0 }; }
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        const config = await db.getSettings();
        if (config && config.logo_url) {
          setLogoUrl(config.logo_url);
          updateFavicon(config.logo_url);
        }
      } catch (err) {
        console.warn(err);
      }
    };
    fetchLogo();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    // Rate-limiting: Cek lockout
    const now = Date.now();
    if (loginAttempts.lockoutUntil > now) {
      const remainingSec = Math.ceil((loginAttempts.lockoutUntil - now) / 1000);
      setErrorMsg(`Terlalu banyak percobaan login gagal. Coba lagi dalam ${remainingSec} detik.`);
      setLoading(false);
      return;
    }

    if (!username || !password) {
      setErrorMsg('Username dan password wajib diisi.');
      setLoading(false);
      return;
    }

    const dbConfigured = isSupabaseConfigured();

    if (!dbConfigured) {
      // Jika di production dan Supabase belum terkonfigurasi, tolak login secara absolut tanpa fallback
      if (!import.meta.env.DEV) {
        setErrorMsg('Sistem otentikasi belum siap. Server database Supabase belum terkonfigurasi pada environment production.');
        setLoading(false);
        return;
      }

      // Khusus Development Mode (Sandbox): Dynamic import devMockAuth agar ter-strip saat build production
      try {
        const { handleDevMockLogin } = await import('../utils/devMockAuth');
        await handleDevMockLogin({ username, password, db, navigate, setErrorMsg, setLoading });
      } catch (err) {
        console.error('Gagal memuat modul dev mock auth:', err);
        setErrorMsg('Gagal memuat modul otentikasi mode pengembangan.');
        setLoading(false);
      }
      return;
    }

    try {
      const cleanUsername = username.trim().toLowerCase();
      let authRes;

      if (cleanUsername.includes('@')) {
        authRes = await supabase.auth.signInWithPassword({
          email: cleanUsername,
          password: password,
        });
      } else {
        const primaryEmail = `${cleanUsername}@sorgadesa.belega.id`;
        authRes = await supabase.auth.signInWithPassword({
          email: primaryEmail,
          password: password,
        });

        // Hanya coba domain fallback jika error berupa kredensial salah
        if (authRes.error && authRes.error.message && authRes.error.message.toLowerCase().includes('invalid login credentials')) {
          const fallbackEmail = `${cleanUsername}@sorgadesa.com`;
          const fallbackRes = await supabase.auth.signInWithPassword({
            email: fallbackEmail,
            password: password,
          });
          if (!fallbackRes.error) {
            authRes = fallbackRes;
          }
        }
      }

      if (authRes.error) throw authRes.error;
      const data = authRes.data;

      // Ambil profile role dari tabel profiles
      const { data: profile, error: errProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single();

      if (errProfile) throw errProfile;

      if (profile.status !== 'Aktif') {
        setErrorMsg('Akun Anda dinonaktifkan. Silakan hubungi Super Admin.');
        setLoading(false);
        return;
      }

      sessionStorage.setItem('sorga_session', JSON.stringify({
        token: data.session.access_token,
        user: {
          id: profile.id,
          nama: profile.nama,
          username: profile.username,
          role: profile.role,
          must_change_password: Boolean(profile.must_change_password)
        }
      }));

      // Non-blocking log aktivitas agar redirect terasa instan
      db.addActivityLog(profile.nama, 'Login Admin', 'Berhasil masuk ke dashboard Supabase').catch(() => {});
      
      // Reset rate-limiting counter setelah login berhasil
      setLoginAttempts({ count: 0, lockoutUntil: 0 });
      sessionStorage.removeItem('sorga_login_attempts');

      setLoading(false);
      navigate('/admin');

    } catch (err) {
      console.error("Login error:", err);

      // Rate-limiting: Increment percobaan gagal
      const isNetworkErr = err.message && (err.message.includes('Failed to fetch') || err.name === 'AuthRetryableFetchError' || err.message.includes('fetch'));
      if (!isNetworkErr) {
        const newCount = loginAttempts.count + 1;
        const newAttempts = newCount >= MAX_LOGIN_ATTEMPTS
          ? { count: newCount, lockoutUntil: Date.now() + LOCKOUT_DURATION_MS }
          : { count: newCount, lockoutUntil: 0 };
        setLoginAttempts(newAttempts);
        sessionStorage.setItem('sorga_login_attempts', JSON.stringify(newAttempts));

        if (newCount >= MAX_LOGIN_ATTEMPTS) {
          setErrorMsg(`Terlalu banyak percobaan gagal (${newCount}x). Akun dikunci selama 60 detik.`);
          setLoading(false);
          return;
        }
      }

      if (isNetworkErr) {
        setErrorMsg('Gagal terhubung ke server Supabase. Pastikan koneksi internet aktif dan project Supabase tidak dalam status Paused.');
      } else {
        const remaining = MAX_LOGIN_ATTEMPTS - (loginAttempts.count + 1);
        setErrorMsg((err.message || 'Kombinasi email/password salah.') + (remaining > 0 ? ` (Sisa ${remaining} percobaan)` : ''));
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-shuttle-cream">
      {/* Dynamic Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-15%] w-[80vw] h-[80vw] sm:w-[40vw] sm:h-[40vw] rounded-full bg-court-green/10 blur-[80px] sm:blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-15%] w-[80vw] h-[80vw] sm:w-[40vw] sm:h-[40vw] rounded-full bg-rattan-gold/10 blur-[80px] sm:blur-[120px]"></div>
      </div>

      <div className="w-full max-w-md z-10">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-2 text-xs font-sans font-bold text-court-green hover:text-rattan-gold mb-6 transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Kembali ke Landing Page
        </button>

        <GlassCard lPost className="shadow-2xl border border-rattan-gold/30">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-court-green/10 border border-rattan-gold/30 flex items-center justify-center overflow-hidden mb-3.5 shadow-md">
              <img 
                src={logoUrl} 
                alt="Logo Brand" 
                className="w-full h-full object-cover" 
              />
            </div>
            <h2 className="font-fraunces font-bold text-2xl text-net-charcoal">Login Pengelola</h2>
            <p className="text-xs font-sans text-net-charcoal/60 mt-1 uppercase tracking-wider">Sorga Desa Belega</p>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-status-danger/10 border border-status-danger/30 text-status-danger rounded-xl text-xs mb-4">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-sans font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">Username / Email</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Masukkan username atau email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 rounded-xl border border-net-charcoal/20 bg-shuttle-cream/40 focus:outline-none focus:border-rattan-gold text-sm font-sans pl-10"
                />
                <User size={16} className="absolute left-3.5 top-4 text-net-charcoal/40" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-sans font-bold text-net-charcoal/70 uppercase tracking-wider mb-1">Kata Sandi</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border border-net-charcoal/20 bg-shuttle-cream/40 focus:outline-none focus:border-rattan-gold text-sm font-sans pl-10 pr-10"
                />
                <Lock size={16} className="absolute left-3.5 top-4 text-net-charcoal/40" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-net-charcoal/40 hover:text-court-green transition-colors p-0.5 rounded cursor-pointer focus:outline-none"
                  title={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                  aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-court-green text-shuttle-cream font-sans font-bold uppercase tracking-wider rounded-xl hover:bg-court-green/95 active:scale-[0.99] transition-all shadow cursor-pointer text-center text-xs pt-3.5"
            >
              {loading ? 'Memvalidasi...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          {!isSupabaseConfigured() && import.meta.env.DEV && (
            <div className="mt-6 border-t border-rattan-gold/15 pt-4 text-center">
              <p className="text-[10px] text-net-charcoal/50 leading-relaxed font-sans italic">
                * Sandbox Dev Mode: admin / kasir (offline mock data)
              </p>
            </div>
          )}
        </GlassCard>

        {/* Copyright Notice */}
        <p className="text-[11px] text-net-charcoal/45 text-center mt-6 font-sans">
          &copy; 2026 Booking Sorga Desa Belega. All rights reserved.
        </p>
      </div>
    </div>
  );
}
