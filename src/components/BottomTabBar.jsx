import React, { useState } from 'react';
import { Home, Calendar, Phone, Grid, MoreHorizontal, Image, MessageSquare, Lock, Plus } from 'lucide-react';

export default function BottomTabBar({ activeTab, setActiveTab, onBookingClick }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleTabClick = (tabId) => {
    setIsMenuOpen(false);
    setActiveTab(tabId);
    const element = document.getElementById(tabId === 'beranda' ? 'hero' : tabId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-net-charcoal via-net-charcoal/95 to-transparent">
      
      {/* Popover Menu "Lainnya" */}
      {isMenuOpen && (
        <>
          {/* Click outside backdrop overlay to close */}
          <div 
            className="fixed inset-0 z-40 bg-transparent" 
            onClick={() => setIsMenuOpen(false)}
          />
          
          <div className="absolute bottom-20 right-4 z-50 w-48 p-4 bg-net-charcoal/95 border border-rattan-gold/30 rounded-2xl shadow-2xl space-y-3 animate-scale-up text-left">
            <h4 className="text-[10px] font-sans font-bold text-rattan-gold uppercase tracking-wider mb-2 border-b border-chalk-line/15 pb-1.5">
              Menu Tambahan
            </h4>
            
            {/* Lapangan */}
            <button
              onClick={() => handleTabClick('lapangan')}
              className="flex items-center gap-2.5 w-full py-1.5 px-2 text-chalk-line/80 hover:text-smash-lime font-sans font-medium text-xs transition-colors cursor-pointer"
            >
              <Grid size={14} />
              <span>Daftar Lapangan</span>
            </button>

            {/* Galeri Foto */}
            <button
              onClick={() => handleTabClick('galeri')}
              className="flex items-center gap-2.5 w-full py-1.5 px-2 text-chalk-line/80 hover:text-smash-lime font-sans font-medium text-xs transition-colors cursor-pointer"
            >
              <Image size={14} />
              <span>Galeri Foto</span>
            </button>

            {/* Testimoni */}
            <button
              onClick={() => handleTabClick('testimoni')}
              className="flex items-center gap-2.5 w-full py-1.5 px-2 text-chalk-line/80 hover:text-smash-lime font-sans font-medium text-xs transition-colors cursor-pointer"
            >
              <MessageSquare size={14} />
              <span>Testimoni</span>
            </button>

            {/* Admin Login */}
            <a
              href="/login"
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center gap-2.5 w-full py-1.5 px-2 text-chalk-line/40 hover:text-smash-lime font-sans font-medium text-xs border-t border-chalk-line/10 pt-2 transition-colors cursor-pointer"
            >
              <Lock size={14} />
              <span>Login Admin</span>
            </a>
          </div>
        </>
      )}

      {/* Main Tab Bar */}
      <div className="glass-surface-dark flex items-center justify-around h-16 rounded-2xl px-2 shadow-2xl relative z-50">
        
        {/* Tab 1: Beranda */}
        <button
          onClick={() => handleTabClick('beranda')}
          className={`flex flex-col items-center justify-center w-12 h-12 transition-all cursor-pointer ${
            activeTab === 'beranda' ? 'text-smash-lime scale-105 font-bold' : 'text-chalk-line/60'
          }`}
        >
          <Home size={18} />
          <span className="text-[9px] mt-1 font-sans font-medium tracking-wide">Beranda</span>
        </button>

        {/* Tab 2: Jadwal */}
        <button
          onClick={() => handleTabClick('jadwal')}
          className={`flex flex-col items-center justify-center w-12 h-12 transition-all cursor-pointer ${
            activeTab === 'jadwal' ? 'text-smash-lime scale-105 font-bold' : 'text-chalk-line/60'
          }`}
        >
          <Calendar size={18} />
          <span className="text-[9px] mt-1 font-sans font-medium tracking-wide">Jadwal</span>
        </button>

        {/* Tab 3: FAB Pesan Lapangan (Tengah, Terlihat Terus) */}
        <div className="relative -top-3.5 flex flex-col items-center justify-center">
          <button
            onClick={() => {
              setIsMenuOpen(false);
              onBookingClick();
            }}
            className="flex items-center justify-center w-13 h-13 bg-smash-lime text-net-charcoal rounded-full shadow-lg border-4 border-court-green/80 hover:bg-smash-lime/90 active:scale-95 transition-all cursor-pointer"
            aria-label="Pesan Lapangan"
          >
            <Plus size={22} strokeWidth={3} />
          </button>
          <span className="text-[9px] mt-1.5 font-sans font-medium text-chalk-line/60 whitespace-nowrap">Pesan</span>
        </div>

        {/* Tab 4: Kontak */}
        <button
          onClick={() => handleTabClick('kontak')}
          className={`flex flex-col items-center justify-center w-12 h-12 transition-all cursor-pointer ${
            activeTab === 'kontak' ? 'text-smash-lime scale-105 font-bold' : 'text-chalk-line/60'
          }`}
        >
          <Phone size={18} />
          <span className="text-[9px] mt-1 font-sans font-medium tracking-wide">Kontak</span>
        </button>

        {/* Tab 5: Lainnya */}
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className={`flex flex-col items-center justify-center w-12 h-12 transition-all cursor-pointer ${
            isMenuOpen ? 'text-smash-lime scale-105 font-bold' : 'text-chalk-line/60'
          }`}
        >
          <MoreHorizontal size={18} />
          <span className="text-[9px] mt-1 font-sans font-medium tracking-wide">Lainnya</span>
        </button>

      </div>
    </div>
  );
}
