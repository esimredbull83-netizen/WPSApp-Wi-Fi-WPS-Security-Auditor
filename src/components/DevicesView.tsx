import React, { useState } from 'react';
import {
  Cpu,
  Laptop,
  RefreshCw,
  Router,
  Search,
  Smartphone,
  Tv,
} from 'lucide-react';
import { LanDevice, Language } from '../types/network';
import { STRINGS } from '../utils/i18n';

interface DevicesViewProps {
  devices: LanDevice[];
  language: Language;
  connectedSsid: string;
  onRescan: () => void;
  isScanning: boolean;
}

export const DevicesView: React.FC<DevicesViewProps> = ({
  devices,
  language,
  connectedSsid,
  onRescan,
  isScanning,
}) => {
  const t = STRINGS[language];
  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = devices.filter((d) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      d.hostname.toLowerCase().includes(q) ||
      d.ip.includes(q) ||
      d.mac.toLowerCase().includes(q) ||
      d.vendor.toLowerCase().includes(q)
    );
  });

  const renderCategoryIcon = (category: LanDevice['category']) => {
    const cls = 'w-5 h-5 text-[#1B3B6F]';
    switch (category) {
      case 'router':
        return <Router className={cls} />;
      case 'phone':
        return <Smartphone className={cls} />;
      case 'laptop':
        return <Laptop className={cls} />;
      case 'tv':
        return <Tv className={cls} />;
      case 'iot':
        return <Cpu className={cls} />;
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      {/* Toolbar */}
      <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Subnet Discovery · 192.168.1.0/24
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Active SSID: <span className="font-medium text-slate-700">{connectedSsid}</span>
            <span aria-hidden="true"> · </span>
            <span className="tabular-nums">{devices.length} hosts responding</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search IP, MAC, vendor..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
            />
          </div>
          <button
            type="button"
            onClick={onRescan}
            disabled={isScanning}
            className="min-h-[38px] px-3.5 py-2 rounded-lg bg-[#1B3B6F] hover:bg-[#152E58] disabled:opacity-70 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
            <span>{isScanning ? t.scanning : t.scanDevices}</span>
          </button>
        </div>
      </div>

      {/* Host List */}
      <div className="divide-y divide-slate-200">
        {filtered.map((device) => {
          const isOpen = expandedId === device.id;
          return (
            <div key={device.id} className="transition-colors hover:bg-slate-50/80">
              <button
                type="button"
                onClick={() => setExpandedId(isOpen ? null : device.id)}
                className="w-full px-4 sm:px-6 py-3.5 flex items-center justify-between gap-4 text-left cursor-pointer"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    {renderCategoryIcon(device.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-bold text-slate-900 truncate">
                        {device.hostname}
                      </span>
                      {device.isGateway && (
                        <span className="text-[11px] font-semibold text-[#1B3B6F]">
                          · Gateway
                        </span>
                      )}
                      {device.isSelf && (
                        <span className="text-[11px] font-semibold text-emerald-700">
                          · This Device
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600 mt-0.5">
                      <span className="font-mono tabular-nums font-medium text-slate-800">
                        {device.ip}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums text-slate-500">{device.mac}</span>
                      <span aria-hidden="true" className="hidden sm:inline">·</span>
                      <span className="hidden sm:inline text-slate-500">{device.vendor}</span>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs font-mono tabular-nums font-semibold text-slate-800">
                    {device.latencyMs.toFixed(1)} ms
                  </div>
                  <div className="text-[11px] font-mono tabular-nums text-slate-500 mt-0.5">
                    {device.linkSpeedMbps} Mbps
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="px-4 sm:px-6 pb-3.5 pt-1 bg-slate-50 border-t border-slate-100 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-semibold text-slate-700">Vendor OUI:</span>{' '}
                    {device.vendor}
                  </div>
                  <div className="font-mono tabular-nums">
                    <span className="font-sans font-semibold text-slate-700">Open Ports:</span>{' '}
                    {device.openPorts.length > 0 ? device.openPorts.join(', ') : 'None detected'}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm text-slate-500">
            No subnet hosts match &ldquo;{query}&rdquo;.
          </div>
        )}
      </div>
    </div>
  );
};
