import React, { useState } from 'react';
import { X } from 'lucide-react';
import { WifiNetwork } from '../types/network';
import { formatMac, getSuggestedPinsForNetwork, parseMacBytes } from '../utils/wpsAlgorithms';

interface AddNetworkModalProps {
  onClose: () => void;
  onAdd: (network: WifiNetwork) => void;
}

export const AddNetworkModal: React.FC<AddNetworkModalProps> = ({ onClose, onAdd }) => {
  const [ssid, setSsid] = useState('');
  const [bssid, setBssid] = useState('DC:8E:8D:44:12:A8');
  const [vendor, setVendor] = useState('Custom Router');
  const [channel, setChannel] = useState(6);
  const [rssi, setRssi] = useState(-62);
  const [wpsEnabled, setWpsEnabled] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = formatMac(bssid);
    if (!parseMacBytes(formatted)) {
      setError('Enter a valid 12-hex-digit MAC address (e.g. DC:8E:8D:2D:99:63).');
      return;
    }
    if (!ssid.trim()) {
      setError('Enter an SSID name.');
      return;
    }

    const pins = getSuggestedPinsForNetwork(formatted, vendor.trim() || 'Custom Router');
    const newNet: WifiNetwork = {
      id: `custom-${Date.now()}`,
      ssid: ssid.trim(),
      bssid: formatted,
      rssi,
      channel,
      bandwidthMhz: 20,
      band: channel > 14 ? '5 GHz' : '2.4 GHz',
      security: wpsEnabled ? ['WPA2-PSK', 'WPS'] : ['WPA2-PSK'],
      vendor: vendor.trim() || 'Custom Router',
      wpsEnabled,
      wpsLocked: false,
      wpsVersion: wpsEnabled ? '1.0' : null,
      wpsConfigMethods: wpsEnabled ? ['Label', 'PushButton'] : [],
      vulnerableStatus: wpsEnabled ? 'unknown' : 'not_vulnerable',
      pixieDustVulnerable: wpsEnabled,
      defaultPins: pins,
      validAuditPin: wpsEnabled ? pins[0].pin : null,
      simulatedPsk: `LabKey_${formatted.slice(-5).replace(':', '')}`,
      recoveredPassword: null,
      verifiedPin: null,
      isConnected: false,
      modelName: 'Custom AP Target',
      modelNumber: 'LAB-100',
      serialNumber: `SN-${formatted.slice(-5).replace(':', '')}`,
      uuid: `00000000-0000-4000-8000-${formatted.replace(/:/g, '').toLowerCase()}`,
    };

    onAdd(newNet);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Add Custom AP / MAC Target</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              SSID (Network Name)
            </label>
            <input
              type="text"
              value={ssid}
              onChange={(e) => setSsid(e.target.value)}
              placeholder="e.g. LabRouter_Test"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              BSSID (MAC Address)
            </label>
            <input
              type="text"
              value={bssid}
              onChange={(e) => setBssid(e.target.value)}
              placeholder="DC:8E:8D:2D:99:63"
              className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Channel
              </label>
              <select
                value={channel}
                onChange={(e) => setChannel(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
              >
                {[1, 3, 6, 9, 11, 36, 44, 149].map((ch) => (
                  <option key={ch} value={ch}>
                    Ch {ch} ({ch > 14 ? '5 GHz' : '2.4 GHz'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Signal (dBm)
              </label>
              <input
                type="number"
                min={-95}
                max={-30}
                value={rssi}
                onChange={(e) => setRssi(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Vendor / Manufacturer
            </label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="e.g. Netis Technology"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
            />
          </div>

          <label className="flex items-center gap-2.5 pt-1 cursor-pointer">
            <input
              type="checkbox"
              checked={wpsEnabled}
              onChange={(e) => setWpsEnabled(e.target.checked)}
              className="w-4 h-4 accent-[#1B3B6F] rounded"
            />
            <span className="text-sm text-slate-700">WPS Enabled on AP</span>
          </label>

          {error && <p className="text-xs font-medium text-rose-600">{error}</p>}

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-[#1B3B6F] hover:bg-[#152E58] text-white rounded-lg cursor-pointer"
            >
              Add &amp; Compute PINs
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
