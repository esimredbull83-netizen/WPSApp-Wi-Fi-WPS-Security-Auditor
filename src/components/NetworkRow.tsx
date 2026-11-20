import React from 'react';
import { Check, HelpCircle, Lock, X } from 'lucide-react';
import { WifiNetwork } from '../types/network';
import { SignalIcon } from './SignalIcon';

interface NetworkRowProps {
  network: WifiNetwork;
  onSelect: (network: WifiNetwork) => void;
  isSelected?: boolean;
}

export const NetworkRow: React.FC<NetworkRowProps> = ({ network, onSelect, isSelected }) => {
  const securityLabel = network.security.map((s) => `[${s}]`).join(' + ');

  const renderStatusButton = () => {
    if (network.isConnected || network.verifiedPin || network.vulnerableStatus === 'vulnerable') {
      return (
        <span
          aria-label="Potentially vulnerable or verified"
          className="w-10 h-10 rounded-full bg-[#16A34A] text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105"
        >
          <Check className="w-5 h-5 stroke-[2.75]" />
        </span>
      );
    }
    if (network.vulnerableStatus === 'locked') {
      return (
        <span
          aria-label="WPS locked"
          className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105"
        >
          <Lock className="w-4 h-4 stroke-[2.5]" />
        </span>
      );
    }
    if (!network.wpsEnabled || network.vulnerableStatus === 'not_vulnerable') {
      return (
        <span
          aria-label="WPS disabled or not vulnerable"
          className="w-10 h-10 rounded-full bg-[#0F223D] text-[#EF4444] flex items-center justify-center shadow-xs transition-transform group-hover:scale-105"
        >
          <X className="w-5 h-5 stroke-[3]" />
        </span>
      );
    }
    return (
      <span
        aria-label="WPS enabled, untested"
        className="w-10 h-10 rounded-full bg-[#0F223D] text-white flex items-center justify-center shadow-xs transition-transform group-hover:scale-105"
      >
        <HelpCircle className="w-5 h-5 stroke-[2.25]" />
      </span>
    );
  };

  return (
    <button
      type="button"
      onClick={() => onSelect(network)}
      className={`group w-full text-left px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 sm:gap-5 border-b border-slate-200 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B3B6F] ${
        isSelected ? 'bg-slate-100' : 'bg-white hover:bg-slate-50/90'
      }`}
    >
      <div className="flex items-center gap-3.5 sm:gap-5 min-w-0 flex-1">
        <SignalIcon
          rssi={network.rssi}
          wpsLocked={network.wpsLocked}
          isConnected={network.isConnected}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-[17px] sm:text-[18px] font-bold text-slate-900 truncate leading-tight">
              {network.ssid}
            </h3>
            {network.isConnected && (
              <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                · Connected
              </span>
            )}
          </div>

          <p className="text-[13px] text-slate-600 font-mono tabular-nums mt-0.5 truncate">
            {network.bssid}
          </p>

          <p className="text-[12px] text-slate-500 mt-0.5 truncate">
            {securityLabel}
          </p>

          <div className="flex items-center gap-2 text-[13px] text-slate-700 mt-0.5 truncate">
            <span className="truncate">{network.vendor}</span>
            <span className="hidden md:inline text-slate-400" aria-hidden="true">·</span>
            <span className="hidden md:inline text-slate-500 font-mono text-[12px] tabular-nums">
              {network.band} ({network.bandwidthMhz} MHz)
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
        <span className="text-[13px] text-slate-500 font-mono tabular-nums whitespace-nowrap">
          (Ch: {network.channel})
        </span>
        {renderStatusButton()}
      </div>
    </button>
  );
};
