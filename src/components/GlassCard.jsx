import React from 'react';

export default function GlassCard({ 
  children, 
  dark = false, 
  lPost = false, 
  netHover = false, 
  className = "" 
}) {
  const baseStyle = dark ? 'glass-surface-dark text-chalk-line' : 'glass-surface-light text-net-charcoal';
  const lPostStyle = lPost ? 'l-post-corner' : '';
  const netStyle = netHover ? 'net-hover-card' : '';

  return (
    <div className={`rounded-2xl p-6 transition-all duration-300 ${baseStyle} ${lPostStyle} ${netStyle} ${className}`}>
      {children}
    </div>
  );
}
