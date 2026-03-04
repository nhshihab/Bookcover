
import React from 'react';

export const COLORS = [
  '#000000', '#FFFFFF', '#FFFFFF', '#D4AF37', '#800000', '#000080', '#2F4F4F', '#4A0E0E'
];

export const BLEED = 0.125; // Standard KDP bleed per side in inches
export const WHITE_PAPER_THICKNESS = 0.00225; // Thickness per page for spine calculation

export const Logo = () => (
  <div className="flex items-center gap-1.5 sm:gap-2">
    <img src="/logo.png" alt="BookCoverBee Logo" className="w-8 h-8 sm:w-10 sm:h-10 object-contain" />
    <span className="text-xl sm:text-2xl font-black tracking-tighter text-slate-800">BookCover<span className="text-yellow-500">Bee</span></span>
  </div>
);
