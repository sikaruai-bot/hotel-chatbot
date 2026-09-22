'use client';

import React from 'react';
import { ChevronRight } from 'lucide-react';

interface RoomSelectButtonProps {
  roomType: string;
}

export default function RoomSelectButton({ roomType }: RoomSelectButtonProps) {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    window.dispatchEvent(
      new CustomEvent('select-hotel-room', { detail: { roomType } })
    );
    const elem = document.getElementById('booking-engine');
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
    >
      <span>Select & Book Online</span>
      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
    </button>
  );
}
