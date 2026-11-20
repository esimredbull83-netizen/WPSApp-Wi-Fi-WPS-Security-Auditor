import React, { useMemo, useState } from 'react';
import { CheckCircle2, Radio } from 'lucide-react';
import { Language, WifiNetwork } from '../types/network';
import { STRINGS } from '../utils/i18n';

interface ChannelsViewProps {
  networks: WifiNetwork[];
  language: Language;
  onSelectNetwork: (net: WifiNetwork) => void;
}

const CURVE_PALETTE = [
  '#1B3B6F',
  '#16A34A',
  '#D97706',
  '#DC2626',
  '#0284C7',
  '#7C3AED',
  '#0D9488',
  '#EA580C',
];

export const ChannelsView: React.FC<ChannelsViewProps> = ({
  networks,
  language,
  onSelectNetwork,
}) => {
  const t = STRINGS[language];
  const [band, setBand] = useState<'2.4 GHz' | '5 GHz'>('2.4 GHz');

  const bandNetworks = useMemo(
    () => networks.filter((n) => n.band === band),
    [networks, band]
  );

  // Calculate channel congestion & best non-overlapping channel
  const channelAnalysis = useMemo(() => {
    if (band === '2.4 GHz') {
      const candidates = [1, 6, 11];
      const scores = candidates.map((ch) => {
        const interference = bandNetworks.reduce((acc, net) => {
          const dist = Math.abs(net.channel - ch);
          if (dist <= 2) {
            const weight = Math.max(0, 100 + net.rssi) * (1 - dist * 0.28);
            return acc + weight;
          }
          return acc;
        }, 0);
        return { channel: ch, interference: Math.round(interference) };
      });
      const sorted = [...scores].sort((a, b) => a.interference - b.interference);
      return { best: sorted[0]?.channel ?? 1, scores };
    } else {
      const candidates = [36, 44, 149, 157];
      const scores = candidates.map((ch) => {
        const interference = bandNetworks.reduce((acc, net) => {
          const dist = Math.abs(net.channel - ch);
          if (dist <= 4) {
            return acc + Math.max(0, 100 + net.rssi);
          }
          return acc;
        }, 0);
        return { channel: ch, interference: Math.round(interference) };
      });
      const sorted = [...scores].sort((a, b) => a.interference - b.interference);
      return { best: sorted[0]?.channel ?? 149, scores };
    }
  }, [band, bandNetworks]);

  // SVG Spectrum Plot geometry
  const width = 760;
  const height = 270;
  const padLeft = 48;
  const padRight = 24;
  const padTop = 24;
  const padBottom = 38;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const chMin = band === '2.4 GHz' ? -1 : 30;
  const chMax = band === '2.4 GHz' ? 15 : 170;

  const xForCh = (ch: number) => padLeft + ((ch - chMin) / (chMax - chMin)) * plotW;
  const yForRssi = (rssi: number) => {
    const clamped = Math.max(-100, Math.min(-30, rssi));
    const norm = (clamped - -100) / 70; // 0 at -100dBm, 1 at -30dBm
    return padTop + plotH * (1 - norm);
  };

  const xTicks =
    band === '2.4 GHz'
      ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
      : [36, 44, 52, 60, 100, 116, 132, 149, 157, 165];

  const yTicks = [-30, -50, -70, -90, -100];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-4 sm:px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#1B3B6F]" />
            <h2 className="text-sm font-bold text-slate-900">{t.channelAnalyzerTitle}</h2>
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/80 rounded-lg">
            {(['2.4 GHz', '5 GHz'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBand(b)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  band === b
                    ? 'bg-[#0F223D] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        {/* SVG Channel Overlap Graph */}
        <div className="p-3 sm:p-5 overflow-x-auto">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full min-w-[540px] h-auto select-none"
            role="img"
            aria-label={`${band} Wi-Fi channel interference spectrum`}
          >
            {/* Horizontal grid lines */}
            {yTicks.map((db) => {
              const y = yForRssi(db);
              return (
                <g key={db}>
                  <line
                    x1={padLeft}
                    x2={width - padRight}
                    y1={y}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeDasharray={db === -100 ? undefined : '4 4'}
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-500 text-[11px] font-mono"
                  >
                    {db}
                  </text>
                </g>
              );
            })}

            {/* Vertical grid lines & channel ticks */}
            {xTicks.map((ch) => {
              const x = xForCh(ch);
              const isNonOverlapping =
                band === '2.4 GHz' ? [1, 6, 11].includes(ch) : [36, 44, 149, 157].includes(ch);
              return (
                <g key={ch}>
                  <line
                    x1={x}
                    x2={x}
                    y1={padTop}
                    y2={padTop + plotH}
                    stroke={isNonOverlapping ? '#CBD5E1' : '#F1F5F9'}
                  />
                  <text
                    x={x}
                    y={height - 12}
                    textAnchor="middle"
                    className={`text-[11px] font-mono ${
                      ch === channelAnalysis.best
                        ? 'fill-emerald-700 font-bold'
                        : 'fill-slate-600'
                    }`}
                  >
                    {ch}
                  </text>
                </g>
              );
            })}

            {/* Axis Labels */}
            <text
              x={12}
              y={padTop + plotH / 2}
              transform={`rotate(-90 12 ${padTop + plotH / 2})`}
              textAnchor="middle"
              className="fill-slate-400 text-[10px] font-mono"
            >
              RSSI (dBm)
            </text>

            {/* Channel Bell Curves for each AP */}
            {bandNetworks.map((net, idx) => {
              const color = CURVE_PALETTE[idx % CURVE_PALETTE.length];
              const cx = xForCh(net.channel);
              const halfSpanCh =
                band === '2.4 GHz'
                  ? net.bandwidthMhz === 40
                    ? 4
                    : 2.1
                  : net.bandwidthMhz === 80
                  ? 8
                  : 4;
              const leftX = xForCh(net.channel - halfSpanCh);
              const rightX = xForCh(net.channel + halfSpanCh);
              const peakY = yForRssi(net.rssi);
              const baseY = padTop + plotH;

              const ctrlOffset = (rightX - leftX) * 0.25;
              const d = `M ${leftX} ${baseY} C ${leftX + ctrlOffset} ${peakY}, ${
                rightX - ctrlOffset
              } ${peakY}, ${rightX} ${baseY}`;

              return (
                <g
                  key={net.id}
                  onClick={() => onSelectNetwork(net)}
                  className="cursor-pointer group"
                >
                  <path
                    d={`${d} Z`}
                    fill={color}
                    fillOpacity={0.12}
                    className="group-hover:fill-opacity-25 transition-opacity"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.25}
                  />
                  <text
                    x={cx}
                    y={Math.max(padTop + 10, peakY - 6)}
                    textAnchor="middle"
                    fill={color}
                    className="text-[11px] font-semibold"
                  >
                    {net.ssid}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Recommendation Strip */}
        <div className="px-4 sm:px-6 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              {t.recommendedChannel}:{' '}
              <strong className="font-mono text-slate-900">
                Channel {channelAnalysis.best} ({band})
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono tabular-nums text-slate-600">
            {channelAnalysis.scores.map((item) => (
              <span
                key={item.channel}
                className={
                  item.channel === channelAnalysis.best
                    ? 'font-bold text-emerald-700'
                    : ''
                }
              >
                Ch {item.channel}: {item.interference} idx
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Band Access Point Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3 border-b border-slate-200 text-xs font-bold text-slate-700 uppercase tracking-wide bg-slate-50/70">
          {band} Access Points ({bandNetworks.length})
        </div>
        <div className="divide-y divide-slate-200">
          {bandNetworks.map((net, idx) => (
            <button
              key={net.id}
              type="button"
              onClick={() => onSelectNetwork(net)}
              className="w-full px-4 sm:px-6 py-3 flex items-center justify-between gap-4 text-left hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: CURVE_PALETTE[idx % CURVE_PALETTE.length] }}
                />
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 truncate">
                    {net.ssid}
                  </div>
                  <div className="text-xs text-slate-500 font-mono tabular-nums">
                    {net.bssid} · {net.bandwidthMhz} MHz
                  </div>
                </div>
              </div>
              <div className="text-right font-mono tabular-nums text-xs shrink-0">
                <div className="font-semibold text-slate-900">Ch {net.channel}</div>
                <div className="text-slate-500">{net.rssi} dBm</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
