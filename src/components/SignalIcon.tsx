import React from 'react';

interface SignalIconProps {
  rssi: number;
  wpsLocked?: boolean;
  isConnected?: boolean;
}

export const SignalIcon: React.FC<SignalIconProps> = ({ rssi, wpsLocked, isConnected }) => {
  // Determine 1..4 bars based on dBm RSSI
  const level = rssi >= -60 ? 4 : rssi >= -72 ? 3 : rssi >= -82 ? 2 : 1;

  const activeColor = isConnected
    ? '#16A34A'
    : level >= 3
    ? '#0F223D'
    : level === 2
    ? '#334155'
    : '#475569';
  const inactiveColor = '#CBD5E1';

  return (
    <div className="relative flex flex-col items-center justify-center w-14 shrink-0 select-none">
      <svg
        viewBox="0 0 48 36"
        className="w-10 h-8"
        aria-hidden="true"
      >
        {/* Outer arc (Level 4) */}
        <path
          d="M5 13C15.5 2.5 32.5 2.5 43 13"
          fill="none"
          stroke={level >= 4 ? activeColor : inactiveColor}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        {/* Mid-outer arc (Level 3) */}
        <path
          d="M10.5 18.5C18 11 30 11 37.5 18.5"
          fill="none"
          stroke={level >= 3 ? activeColor : inactiveColor}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        {/* Mid-inner arc (Level 2) */}
        <path
          d="M16 24C20.5 19.5 27.5 19.5 32 24"
          fill="none"
          stroke={level >= 2 ? activeColor : inactiveColor}
          strokeWidth="3.6"
          strokeLinecap="round"
        />
        {/* Center dot (Level 1) */}
        <circle
          cx="24"
          cy="30"
          r="3.2"
          fill={level >= 1 ? activeColor : inactiveColor}
        />
      </svg>
      {wpsLocked && (
        <span
          title="WPS Rate-Limited / Locked"
          className="absolute -top-0.5 right-1 w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center shadow-xs"
        >
          !
        </span>
      )}
      <span className="text-[12px] font-medium text-slate-600 font-mono tabular-nums leading-none mt-1">
        {rssi}dB
      </span>
    </div>
  );
};
