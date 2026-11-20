import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckSquare,
  MoreVertical,
  RefreshCw,
  Search,
  Square,
  WifiOff,
} from 'lucide-react';
import { INITIAL_LAN_DEVICES, INITIAL_NETWORKS } from './data/mockNetworks';
import {
  LanDevice,
  Language,
  MainTab,
  SortMode,
  WifiNetwork,
} from './types/network';
import { STRINGS } from './utils/i18n';
import { NetworkRow } from './components/NetworkRow';
import { NetworkModal } from './components/NetworkModal';
import { DevicesView } from './components/DevicesView';
import { ChannelsView } from './components/ChannelsView';
import { AddNetworkModal } from './components/AddNetworkModal';
import { AboutModal } from './components/AboutModal';

export default function App() {
  const [networks, setNetworks] = useState<WifiNetwork[]>(INITIAL_NETWORKS);
  const [devices, setDevices] = useState<LanDevice[]>(INITIAL_LAN_DEVICES);
  const [activeTab, setActiveTab] = useState<MainTab>('networks');
  const [language, setLanguage] = useState<Language>('en');

  // Filters & Sorting
  const [wpsFilter, setWpsFilter] = useState(false);
  const [vulnerableFilter, setVulnerableFilter] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('signal');

  // Modals & Scanning State
  const [selectedNetworkId, setSelectedNetworkId] = useState<string | null>(null);
  const [isScanningNetworks, setIsScanningNetworks] = useState(false);
  const [isScanningDevices, setIsScanningDevices] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const t = STRINGS[language];

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const selectedNetwork = useMemo(
    () => networks.find((n) => n.id === selectedNetworkId) ?? null,
    [networks, selectedNetworkId]
  );

  const handleUpdateNetwork = (updated: WifiNetwork) => {
    setNetworks((prev) =>
      prev.map((n) => {
        if (n.id === updated.id) return updated;
        // If newly connected, disconnect other APs
        if (updated.isConnected && n.isConnected) {
          return { ...n, isConnected: false };
        }
        return n;
      })
    );
  };

  const handleRescanNetworks = () => {
    if (isScanningNetworks) return;
    setIsScanningNetworks(true);
    setTimeout(() => {
      setNetworks((prev) =>
        prev.map((net) => {
          const delta = Math.floor(Math.random() * 5) - 2; // -2 to +2 dB natural RSSI jitter
          const nextRssi = Math.max(-95, Math.min(-38, net.rssi + delta));
          return { ...net, rssi: nextRssi };
        })
      );
      setIsScanningNetworks(false);
    }, 650);
  };

  const handleRescanDevices = () => {
    if (isScanningDevices) return;
    setIsScanningDevices(true);
    setTimeout(() => {
      setDevices((prev) =>
        prev.map((dev) => ({
          ...dev,
          latencyMs: Math.max(
            0.2,
            Number((dev.latencyMs + (Math.random() * 2 - 1)).toFixed(1))
          ),
        }))
      );
      setIsScanningDevices(false);
    }, 700);
  };

  const filteredNetworks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = networks.filter((net) => {
      if (wpsFilter && !net.wpsEnabled) return false;
      if (
        vulnerableFilter &&
        net.vulnerableStatus !== 'vulnerable' &&
        net.vulnerableStatus !== 'unknown'
      ) {
        return false;
      }
      if (q) {
        const match =
          net.ssid.toLowerCase().includes(q) ||
          net.bssid.toLowerCase().includes(q) ||
          net.vendor.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    return [...list].sort((a, b) => {
      if (sortMode === 'signal') return b.rssi - a.rssi;
      if (sortMode === 'channel') return a.channel - b.channel;
      if (sortMode === 'ssid') return a.ssid.localeCompare(b.ssid);
      const rank = (s: WifiNetwork['vulnerableStatus']) =>
        s === 'vulnerable' ? 0 : s === 'unknown' ? 1 : s === 'locked' ? 2 : 3;
      return rank(a.vulnerableStatus) - rank(b.vulnerableStatus) || b.rssi - a.rssi;
    });
  }, [networks, wpsFilter, vulnerableFilter, searchQuery, sortMode]);

  const stats = useMemo(() => {
    const wpsCount = networks.filter((n) => n.wpsEnabled).length;
    const auditableCount = networks.filter(
      (n) => n.wpsEnabled && !n.wpsLocked && n.vulnerableStatus !== 'not_vulnerable'
    ).length;
    return { total: networks.length, wpsCount, auditableCount };
  }, [networks]);

  const connectedNetwork = networks.find((n) => n.isConnected);

  return (
    <div className="min-h-screen bg-[#F4F6F9] text-slate-900 flex flex-col">
      {/* Sticky Top App Bar + Navigation Tabs */}
      <header className="sticky top-0 z-30 bg-[#0B192C] text-white shadow-sm">
        <div className="max-w-6xl mx-auto">
          {/* App Title & Actions Row */}
          <div className="h-[52px] px-4 sm:px-6 flex items-center justify-between gap-4">
            <h1 className="text-[20px] font-bold tracking-tight whitespace-nowrap shrink-0">
              {t.appName}
            </h1>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={
                  activeTab === 'devices' ? handleRescanDevices : handleRescanNetworks
                }
                aria-label={t.refreshScan}
                title={t.refreshScan}
                className="w-11 h-11 rounded-full flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <RefreshCw
                  className={`w-5 h-5 ${
                    isScanningNetworks || isScanningDevices ? 'animate-spin' : ''
                  }`}
                />
              </button>

              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  aria-label="More options"
                  aria-expanded={showMenu}
                  className="w-11 h-11 rounded-full flex items-center justify-center text-slate-200 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 mt-1 w-60 bg-white text-slate-800 rounded-xl shadow-xl border border-slate-200 py-1.5 z-50">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {t.addCustomTarget}
                    </button>

                    <div className="my-1 border-t border-slate-100" />

                    {(
                      [
                        ['signal', t.sortSignal],
                        ['channel', t.sortChannel],
                        ['ssid', t.sortSsid],
                        ['vulnerable', t.sortVulnerable],
                      ] as const
                    ).map(([mode, label]) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => {
                          setSortMode(mode);
                          setShowMenu(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-xs font-medium hover:bg-slate-100 flex items-center justify-between cursor-pointer ${
                          sortMode === mode ? 'text-[#1B3B6F] font-bold' : 'text-slate-600'
                        }`}
                      >
                        <span>{label}</span>
                        {sortMode === mode && <span>✓</span>}
                      </button>
                    ))}

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={() => {
                        setLanguage((l) => (l === 'en' ? 'bn' : 'en'));
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {t.languageToggle}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowAboutModal(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left text-sm font-medium hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                      {t.aboutNotice}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3-Tab Navigation Strip */}
          <nav
            aria-label="Primary sections"
            className="grid grid-cols-3 border-t border-white/10"
          >
            {(
              [
                ['networks', t.networksTab],
                ['devices', t.devicesTab],
                ['channels', t.channelsTab],
              ] as const
            ).map(([tabKey, label]) => {
              const active = activeTab === tabKey;
              return (
                <button
                  key={tabKey}
                  type="button"
                  onClick={() => setActiveTab(tabKey)}
                  className={`h-[44px] text-[13px] font-semibold tracking-wider uppercase transition-colors relative cursor-pointer whitespace-nowrap shrink-0 px-2 ${
                    active ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-white" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Secondary Filter Strip for Networks Tab (Matching screenshot dark navy filter row) */}
      {activeTab === 'networks' && (
        <div className="bg-[#0F213A] text-slate-200 border-t border-white/10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
            {/* Checkboxes (matching exact screenshot layout) */}
            <div className="flex items-center justify-center md:justify-start gap-6 sm:gap-8">
              <button
                type="button"
                onClick={() => setWpsFilter((v) => !v)}
                className="inline-flex items-center gap-2 text-[14px] font-medium text-slate-200 hover:text-white min-h-[36px] cursor-pointer whitespace-nowrap shrink-0"
              >
                {wpsFilter ? (
                  <CheckSquare className="w-5 h-5 text-[#65C445]" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
                <span>{t.wpsFilter}</span>
              </button>

              <button
                type="button"
                onClick={() => setVulnerableFilter((v) => !v)}
                className="inline-flex items-center gap-2 text-[14px] font-medium text-slate-200 hover:text-white min-h-[36px] cursor-pointer whitespace-nowrap shrink-0"
              >
                {vulnerableFilter ? (
                  <CheckSquare className="w-5 h-5 text-[#65C445]" />
                ) : (
                  <Square className="w-5 h-5 text-slate-400" />
                )}
                <span>{t.possiblyVulnerable}</span>
              </button>
            </div>

            {/* Desktop & Mobile Search + Summary */}
            <div className="flex items-center justify-between md:justify-end gap-4">
              <span className="hidden lg:inline text-xs text-slate-300 font-mono tabular-nums whitespace-nowrap">
                {stats.total} APs · {stats.wpsCount} WPS · {stats.auditableCount} Auditable
              </span>
              <div className="relative flex-1 md:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#172E4F] border border-white/15 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/30"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-6xl mx-auto sm:px-6 sm:py-5 pb-10">
        {activeTab === 'networks' && (
          <div className="bg-white sm:border sm:border-slate-200 sm:rounded-xl overflow-hidden shadow-xs">
            {filteredNetworks.length > 0 ? (
              <div>
                {filteredNetworks.map((net) => (
                  <NetworkRow
                    key={net.id}
                    network={net}
                    isSelected={net.id === selectedNetworkId}
                    onSelect={(selected) => setSelectedNetworkId(selected.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="py-16 px-4 text-center">
                <WifiOff className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">{t.noNetworksMatch}</p>
                <button
                  type="button"
                  onClick={() => {
                    setWpsFilter(false);
                    setVulnerableFilter(false);
                    setSearchQuery('');
                  }}
                  className="mt-4 px-4 py-2 rounded-lg bg-[#1B3B6F] text-white text-xs font-semibold cursor-pointer hover:bg-[#152E58]"
                >
                  {t.clearFilters}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'devices' && (
          <div className="px-3 sm:px-0 pt-3 sm:pt-0">
            <DevicesView
              devices={devices}
              language={language}
              connectedSsid={connectedNetwork?.ssid || 'Yamin Ahmed (Lab LAN)'}
              onRescan={handleRescanDevices}
              isScanning={isScanningDevices}
            />
          </div>
        )}

        {activeTab === 'channels' && (
          <div className="px-3 sm:px-0 pt-3 sm:pt-0">
            <ChannelsView
              networks={networks}
              language={language}
              onSelectNetwork={(net) => setSelectedNetworkId(net.id)}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedNetwork && (
        <NetworkModal
          network={selectedNetwork}
          language={language}
          onClose={() => setSelectedNetworkId(null)}
          onUpdateNetwork={handleUpdateNetwork}
        />
      )}

      {showAddModal && (
        <AddNetworkModal
          onClose={() => setShowAddModal(false)}
          onAdd={(newNet) => {
            setNetworks((prev) => [newNet, ...prev]);
            setActiveTab('networks');
            setSelectedNetworkId(newNet.id);
          }}
        />
      )}

      {showAboutModal && (
        <AboutModal
          language={language}
          onClose={() => setShowAboutModal(false)}
        />
      )}
    </div>
  );
}
