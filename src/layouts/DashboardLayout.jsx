import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, CalendarClock, 
  ShoppingCart, BarChart3, Settings, LogOut, Menu, X, UserCheck, KeyRound, AlertTriangle 
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { db } from '../utils/db';
import { DEFAULT_LOGO, updateFavicon } from '../utils/logoHelper';

import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userSession, setUserSession] = useState(null);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const navigate = useNavigate();
  const location = useLocation();

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

  // Enforce session check & server-side token validation
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      const sessionStr = sessionStorage.getItem('sorga_session');
      if (!sessionStr) {
        if (isMounted) navigate('/login');
        return;
      }

      let parsedSession = null;
      try {
        parsedSession = JSON.parse(sessionStr);
      } catch (e) {
        sessionStorage.removeItem('sorga_session');
        if (isMounted) navigate('/login');
        return;
      }

      if (isMounted) {
        setUserSession(parsedSession);
      }

      // If connected to live Supabase, verify JWT token with resilience against temporary network glitches
      if (isSupabaseConfigured()) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          
          if (!sessionData?.session) {
            const { data: userData, error } = await supabase.auth.getUser();
            if (error) {
              const isNetworkError = 
                error.message?.includes('Failed to fetch') || 
                error.name === 'AuthRetryableFetchError' || 
                error.status === 503 || 
                error.status === 504;
              
              // Only eject session if it is a definitive authentication failure (e.g. 401 or invalid token)
              if (!isNetworkError && (error.status === 401 || error.message?.includes('invalid_grant') || error.message?.includes('JWT'))) {
                sessionStorage.removeItem('sorga_session');
                await supabase.auth.signOut().catch(() => {});
                if (isMounted) navigate('/login');
                return;
              }
            } else if (!userData?.user) {
              sessionStorage.removeItem('sorga_session');
              await supabase.auth.signOut().catch(() => {});
              if (isMounted) navigate('/login');
              return;
            }
          }
        } catch (err) {
          console.warn("Session verification network warning:", err);
          // Keep active local session during temporary network hiccups to prevent accidental forced logout
        }
      }
    };

    verifySession();

    // Listen to Supabase auth events cleanly
    let authListener = null;
    if (isSupabaseConfigured()) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          sessionStorage.removeItem('sorga_session');
          if (isMounted) navigate('/login');
        } else if (event === 'TOKEN_REFRESHED' && session) {
          const currentStr = sessionStorage.getItem('sorga_session');
          if (currentStr) {
            try {
              const current = JSON.parse(currentStr);
              current.token = session.access_token;
              sessionStorage.setItem('sorga_session', JSON.stringify(current));
            } catch (e) {}
          }
        }
      });
      authListener = subscription;
    }

    return () => {
      isMounted = false;
      if (authListener) authListener.unsubscribe();
    };
  }, [navigate]);

  const handleLogout = async () => {
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn("Supabase signOut error:", err);
    } finally {
      sessionStorage.removeItem('sorga_session');
      navigate('/login');
    }
  };

  if (!userSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-shuttle-cream text-net-charcoal font-sans font-medium">
        Memeriksa otoritas masuk...
      </div>
    );
  }

  const menuItems = [
    { name: 'Ringkasan', path: '/admin', icon: <LayoutDashboard size={18} /> },
    { name: 'Kelola Booking', path: '/admin/bookings', icon: <Calendar size={18} /> },
    { name: 'Jadwal Member', path: '/admin/schedules', icon: <CalendarClock size={18} /> },
    { name: 'Kasir POS', path: '/admin/pos', icon: <ShoppingCart size={18} /> },
    { name: 'Laporan Keuangan', path: '/admin/reports', icon: <BarChart3 size={18} /> },
  ];

  // Tambahkan menu Pengaturan hanya untuk Super Admin & Admin
  if (userSession.user.role === 'Super Admin' || userSession.user.role === 'Admin') {
    menuItems.push({ name: 'Pengaturan Sistem', path: '/admin/settings', icon: <Settings size={18} /> });
  }

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-shuttle-cream text-net-charcoal font-sans">
      
      {/* 1. Mobile Header */}
      <header className="md:hidden flex items-center justify-between h-16 px-3 sm:px-4 bg-court-green text-shuttle-cream border-b border-chalk-line/10 sticky top-0 z-30 shadow w-full max-w-full overflow-hidden">
        <div className="flex items-center gap-2 text-left min-w-0">
          <div className="w-8 h-8 rounded-lg bg-shuttle-cream/10 border border-rattan-gold/30 flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src={logoUrl} 
              alt="Logo Brand" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-fraunces italic font-semibold text-[9px] leading-tight text-rattan-gold truncate">Sorga</span>
            <span className="font-sans font-bold text-xs tracking-wider text-shuttle-cream uppercase leading-none mt-0.5 truncate">Desa Belega</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={() => setIsChangePasswordOpen(true)}
            title="Ubah Kata Sandi"
            className="p-1.5 bg-chalk-line/10 hover:bg-smash-lime hover:text-net-charcoal text-shuttle-cream rounded-lg transition-all cursor-pointer shrink-0"
          >
            <KeyRound size={16} />
          </button>

          <div className="flex items-center gap-1 bg-chalk-line/10 py-1 px-2 rounded-lg border border-chalk-line/15 text-[10px] font-sans font-bold uppercase text-smash-lime shrink-0">
            <UserCheck size={12} className="shrink-0" />
            <span className="max-w-[70px] sm:max-w-none truncate">{userSession.user.role}</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 text-shuttle-cream hover:text-smash-lime cursor-pointer shrink-0"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* 2. Sidebar Navigation */}
      <aside className={`
        fixed md:sticky top-0 left-0 bottom-0 z-40
        w-60 bg-court-green text-shuttle-cream p-5
        flex flex-col justify-between border-r border-chalk-line/10 shadow-xl
        transition-transform duration-300 md:transform-none
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="space-y-6">
          {/* Logo Brand */}
          <div className="flex items-center gap-3 text-left border-b border-chalk-line/15 pb-4">
            <div className="w-10 h-10 rounded-xl bg-chalk-line/10 border border-rattan-gold/30 flex items-center justify-center overflow-hidden shrink-0">
              <img 
                src={logoUrl} 
                alt="Logo Brand" 
                className="w-full h-full object-cover" 
              />
            </div>
            <div className="flex flex-col">
              <span className="font-fraunces italic font-semibold text-xs leading-none text-rattan-gold">Dashboard</span>
              <span className="font-sans font-extrabold text-sm tracking-wider text-shuttle-cream uppercase leading-none mt-1">Sorga Belega</span>
            </div>
          </div>

          {/* User Profile Card with Change Password Action */}
          <div className="bg-chalk-line/5 border border-chalk-line/10 rounded-xl p-3 flex flex-col gap-2 text-left">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="w-8 h-8 rounded-full bg-rattan-gold text-court-green font-fraunces font-bold flex items-center justify-center text-xs shrink-0">
                  {userSession.user.nama.charAt(0)}
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-sans font-bold text-xs truncate text-shuttle-cream">{userSession.user.nama}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-smash-lime font-bold">{userSession.user.role}</span>
                </div>
              </div>
              <button
                onClick={() => setIsChangePasswordOpen(true)}
                title="Ubah Kata Sandi"
                className="p-1.5 bg-chalk-line/10 hover:bg-smash-lime hover:text-net-charcoal text-shuttle-cream/80 rounded-lg transition-all cursor-pointer shrink-0"
              >
                <KeyRound size={14} />
              </button>
            </div>
          </div>

          {/* Sidebar Menu */}
          <nav className="space-y-1.5">
            {menuItems.map(item => {
              const active = currentPath === item.path;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-sans font-bold uppercase tracking-wider text-left transition-all cursor-pointer
                    ${active 
                      ? 'bg-smash-lime text-net-charcoal shadow-md border-l-4 border-rattan-gold' 
                      : 'text-chalk-line/70 hover:bg-chalk-line/10 hover:text-shuttle-cream'}
                  `}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Logout & Copyright */}
        <div className="pt-6 border-t border-chalk-line/15 mt-6 space-y-3">
          {/* Logout Button - Desain Tegas, Jelas, & Kontras */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-xs font-sans font-extrabold uppercase tracking-wider text-shuttle-cream bg-status-danger/90 hover:bg-status-danger active:scale-[0.98] transition-all shadow-md cursor-pointer border border-status-danger/40"
          >
            <LogOut size={16} strokeWidth={2.5} />
            <span>Keluar Akun</span>
          </button>

          {/* Copyright Notice */}
          <div className="text-center px-1">
            <p className="text-[10px] text-chalk-line/45 font-sans leading-relaxed tracking-wide">
              &copy; 2026 Booking Sorga Desa Belega. All rights reserved.
            </p>
          </div>
        </div>
      </aside>

      {/* Sidebar mobile overlay click catcher */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-net-charcoal/60 z-30"
        ></div>
      )}

      {/* 3. Main Content Panel */}
      <main className="flex-1 p-3.5 sm:p-6 md:p-8 min-h-[calc(100vh-4rem)] md:min-h-screen overflow-y-auto overflow-x-hidden w-full max-w-6xl mx-auto flex flex-col text-left">
        
        {/* Temporary Password Security Notification Banner */}
        {userSession?.user?.must_change_password && (
          <div className="mb-6 p-3.5 sm:p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-net-charcoal flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fadeIn w-full overflow-hidden">
            <div className="flex items-start sm:items-center gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow">
                <AlertTriangle size={18} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs uppercase tracking-wider text-amber-900 font-sans">
                  Pemberitahuan Keamanan: Kata Sandi Sementara
                </h4>
                <p className="text-[11px] sm:text-xs text-amber-900/80 mt-0.5 font-sans leading-relaxed">
                  Anda saat ini masih menggunakan kata sandi sementara. Demi keamanan data transaksi dan hak akses akun Anda, harap segera ubah kata sandi.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChangePasswordOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-sans font-bold text-xs uppercase tracking-wider rounded-xl shadow transition-all shrink-0 cursor-pointer flex items-center justify-center gap-2"
            >
              <KeyRound size={15} />
              Ubah Sekarang
            </button>
          </div>
        )}

        <Outlet />
      </main>

      {/* Change Password Dialog Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
        userSession={userSession}
        onSuccess={() => {
          const sessionStr = sessionStorage.getItem('sorga_session');
          if (sessionStr) {
            setUserSession(JSON.parse(sessionStr));
          }
        }}
      />

    </div>
  );
}
