import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, Calendar, CalendarClock, 
  ShoppingCart, BarChart3, Settings, LogOut, Menu, X, UserCheck 
} from 'lucide-react';
import GlassCard from '../components/GlassCard';
import { db } from '../utils/db';
import { DEFAULT_LOGO, updateFavicon } from '../utils/logoHelper';

import { supabase, isSupabaseConfigured } from '../utils/supabaseClient';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userSession, setUserSession] = useState(null);
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
    const verifySession = async () => {
      const sessionStr = sessionStorage.getItem('sorga_session');
      if (!sessionStr) {
        navigate('/login');
        return;
      }

      // If connected to live Supabase, verify JWT token with Supabase Auth server
      if (isSupabaseConfigured()) {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          sessionStorage.removeItem('sorga_session');
          await supabase.auth.signOut();
          navigate('/login');
          return;
        }
      }

      setUserSession(JSON.parse(sessionStr));
    };

    verifySession();
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
      <header className="md:hidden flex items-center justify-between h-16 px-4 bg-court-green text-shuttle-cream border-b border-chalk-line/10 sticky top-0 z-30 shadow">
        <div className="flex items-center gap-2 text-left">
          <div className="w-8 h-8 rounded-lg bg-shuttle-cream/10 border border-rattan-gold/30 flex items-center justify-center overflow-hidden shrink-0">
            <img 
              src={logoUrl} 
              alt="Logo Brand" 
              className="w-full h-full object-cover" 
            />
          </div>
          <div className="flex flex-col">
            <span className="font-fraunces italic font-semibold text-[9px] leading-tight text-rattan-gold">Sorga</span>
            <span className="font-sans font-bold text-xs tracking-wider text-shuttle-cream uppercase leading-none mt-0.5">Desa Belega</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-chalk-line/10 py-1 px-2.5 rounded-lg border border-chalk-line/15 text-[10px] font-sans font-bold uppercase text-smash-lime">
            <UserCheck size={12} />
            <span>{userSession.user.role}</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 text-shuttle-cream hover:text-smash-lime cursor-pointer"
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

          {/* User Profile */}
          <div className="bg-chalk-line/5 border border-chalk-line/10 rounded-xl p-3.5 flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-full bg-rattan-gold text-court-green font-fraunces font-bold flex items-center justify-center text-base">
              {userSession.user.nama.charAt(0)}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="font-sans font-bold text-xs truncate text-shuttle-cream">{userSession.user.nama}</span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-smash-lime font-bold mt-0.5">{userSession.user.role}</span>
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
      <main className="flex-1 p-4 sm:p-6 md:p-8 min-h-[calc(100vh-4rem)] md:min-h-screen overflow-y-auto w-full max-w-6xl mx-auto flex flex-col text-left">
        <Outlet />
      </main>

    </div>
  );
}
