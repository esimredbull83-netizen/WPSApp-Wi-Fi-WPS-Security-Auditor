import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Info,
  KeyRound,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Terminal,
  X,
} from 'lucide-react';
import { AuditStep, Language, WifiNetwork } from '../types/network';
import {
  calculateArcadyanPin,
  calculateBelkinPin,
  computeWpsChecksum,
  verifyWpsPinChecksum,
} from '../utils/wpsAlgorithms';
import { STRINGS } from '../utils/i18n';

interface NetworkModalProps {
  network: WifiNetwork;
  language: Language;
  onClose: () => void;
  onUpdateNetwork: (updated: WifiNetwork) => void;
}

type ActiveSubPanel =
  | null
  | 'connect_key'
  | 'connect_pin'
  | 'custom_pin'
  | 'arcadyan'
  | 'belkin'
  | 'wps_info'
  | 'pixie_dust';

export const NetworkModal: React.FC<NetworkModalProps> = ({
  network,
  language,
  onClose,
  onUpdateNetwork,
}) => {
  const t = STRINGS[language];
  const [selectedPin, setSelectedPin] = useState<string>(
    network.verifiedPin || network.defaultPins[0]?.pin || '29883875'
  );
  const [activePanel, setActivePanel] = useState<ActiveSubPanel>(null);

  // Connect with Key state
  const [keyInput, setKeyInput] = useState(network.recoveredPassword || '');
  const [showKey, setShowKey] = useState(false);
  const [keyFeedback, setKeyFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  // Custom PIN state
  const [customPinInput, setCustomPinInput] = useState('');

  // Algorithm result state
  const [algoResult, setAlgoResult] = useState<{
    title: string;
    pin: string;
    steps: string[];
  } | null>(null);

  // Handshake / Pixie Dust simulation state
  const [auditSteps, setAuditSteps] = useState<AuditStep[]>([]);
  const [isAuditing, setIsAuditing] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleCopy = (value: string) => {
    navigator.clipboard?.writeText(value);
    setCopiedText(value);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const runPinHandshake = (pinToTest: string) => {
    setActivePanel('connect_pin');
    setIsAuditing(true);

    if (!network.wpsEnabled) {
      setAuditSteps([
        {
          id: '1',
          stage: 'Probe',
          detail: `Scanning ${network.bssid} for WPS Information Element...`,
          status: 'warning',
        },
        {
          id: '2',
          stage: 'Abort',
          detail: 'Target AP does not advertise WPS (WPS IE absent). PIN authentication unavailable.',
          status: 'error',
        },
      ]);
      setIsAuditing(false);
      return;
    }

    if (network.wpsLocked) {
      setAuditSteps([
        {
          id: '1',
          stage: 'EAPOL-Start',
          detail: `Associating with ${network.ssid} (${network.bssid})...`,
          status: 'success',
        },
        {
          id: '2',
          stage: 'M1 Check',
          detail: 'AP reports AP-Setup-Locked = 0x01 (WPS rate-limit lock active).',
          status: 'error',
        },
      ]);
      setIsAuditing(false);
      return;
    }

    const isPinMatch =
      network.validAuditPin !== null &&
      pinToTest.trim() === network.validAuditPin.trim();

    const baseSteps: AuditStep[] = [
      {
        id: '1',
        stage: 'Associate',
        detail: `802.11 Auth & Association with ${network.ssid} on Ch ${network.channel}`,
        status: 'pending',
      },
      {
        id: '2',
        stage: 'M1 / M2',
        detail: `Exchanging Diffie-Hellman public keys (PKE/PKR) for PIN ${pinToTest}`,
        status: 'pending',
      },
      {
        id: '3',
        stage: 'M3 / M4',
        detail: 'Validating first 4-digit PIN half hash (E-Hash1 / R-Hash1)',
        status: 'pending',
      },
      {
        id: '4',
        stage: isPinMatch ? 'M5–M8' : 'WSC_NACK',
        detail: isPinMatch
          ? `PIN verified! Decrypting Credential TLV -> PSK: ${network.simulatedPsk}`
          : 'Received WSC_NACK from registrar: PIN mismatch at M4 verification.',
        status: 'pending',
      },
    ];

    setAuditSteps(baseSteps);

    baseSteps.forEach((step, index) => {
      setTimeout(() => {
        setAuditSteps((prev) =>
          prev.map((s, i) => {
            if (i < index) return s;
            if (i === index) {
              const finalStatus =
                index === baseSteps.length - 1
                  ? isPinMatch
                    ? 'success'
                    : 'error'
                  : 'success';
              return { ...s, status: finalStatus };
            }
            if (i === index + 1) {
              return { ...s, status: 'running' };
            }
            return s;
          })
        );

        if (index === baseSteps.length - 1) {
          setIsAuditing(false);
          if (isPinMatch) {
            onUpdateNetwork({
              ...network,
              verifiedPin: pinToTest,
              recoveredPassword: network.simulatedPsk,
              vulnerableStatus: 'vulnerable',
              isConnected: true,
            });
          }
        }
      }, 360 * (index + 1));
    });
  };

  const runPixieDustAudit = () => {
    setActivePanel('pixie_dust');
    setIsAuditing(true);

    if (!network.wpsEnabled) {
      setAuditSteps([
        {
          id: 'p1',
          stage: 'WPS Check',
          detail: 'WPS is disabled on this Access Point. Pixie Dust does not apply.',
          status: 'error',
        },
      ]);
      setIsAuditing(false);
      return;
    }

    const vulnerable = network.pixieDustVulnerable && network.validAuditPin !== null;

    const steps: AuditStep[] = [
      {
        id: 'p1',
        stage: 'M1 / M2 Capture',
        detail: `Captured PKE (192B), PKR (192B), E-Nonce & R-Nonce from ${network.bssid}`,
        status: 'pending',
      },
      {
        id: 'p2',
        stage: 'M3 Extraction',
        detail: 'Extracted E-Hash1 & E-Hash2 commitments (offline analysis started)',
        status: 'pending',
      },
      {
        id: 'p3',
        stage: 'PRNG Audit',
        detail: vulnerable
          ? `Weak LCG/timestamp PRNG seed detected (${network.vendor}) — E-S1/E-S2 recovered in 42ms`
          : 'Strong cryptographic PRNG (CSPRNG) detected — E-S1/E-S2 nonces are unpredictable',
        status: 'pending',
      },
      {
        id: 'p4',
        stage: vulnerable ? 'PIN Recovered' : 'Patched / Immune',
        detail: vulnerable
          ? `Offline audit recovered WPS PIN: ${network.validAuditPin} (PSK: ${network.simulatedPsk})`
          : 'Pixie Dust offline recovery failed: Target firmware is patched against CVE-2014-xxxx.',
        status: 'pending',
      },
    ];

    setAuditSteps(steps);

    steps.forEach((step, index) => {
      setTimeout(() => {
        setAuditSteps((prev) =>
          prev.map((s, i) => {
            if (i === index) {
              const isLast = index === steps.length - 1;
              return {
                ...s,
                status: isLast ? (vulnerable ? 'success' : 'warning') : 'success',
              };
            }
            if (i === index + 1) return { ...s, status: 'running' };
            return s;
          })
        );

        if (index === steps.length - 1) {
          setIsAuditing(false);
          if (vulnerable && network.validAuditPin) {
            setSelectedPin(network.validAuditPin);
            onUpdateNetwork({
              ...network,
              verifiedPin: network.validAuditPin,
              recoveredPassword: network.simulatedPsk,
              vulnerableStatus: 'vulnerable',
            });
          }
        }
      }, 420 * (index + 1));
    });
  };

  const handleArcadyan = () => {
    const res = calculateArcadyanPin(network.bssid);
    setAlgoResult({
      title: 'Arcadyan / EasyBox PIN Derivation',
      pin: res.pin,
      steps: res.steps,
    });
    setActivePanel('arcadyan');
  };

  const handleBelkin = () => {
    const res = calculateBelkinPin(network.bssid);
    setAlgoResult({
      title: 'Belkin MAC-to-PIN Derivation',
      pin: res.pin,
      steps: res.steps,
    });
    setActivePanel('belkin');
  };

  const handleConnectWithKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) return;
    if (keyInput.trim() === network.simulatedPsk || keyInput.trim().length >= 8) {
      const exactMatch = keyInput.trim() === network.simulatedPsk;
      if (exactMatch) {
        setKeyFeedback({
          ok: true,
          msg: `4-Way Handshake complete. Associated with ${network.ssid}.`,
        });
        onUpdateNetwork({
          ...network,
          recoveredPassword: keyInput.trim(),
          isConnected: true,
        });
      } else {
        setKeyFeedback({
          ok: false,
          msg: `MIC verification failed (Simulated Lab Key hint: ${network.simulatedPsk})`,
        });
      }
    } else {
      setKeyFeedback({
        ok: false,
        msg: 'WPA2/WPA3 passphrases must be at least 8 characters.',
      });
    }
  };

  const securityLabel = network.security.map((s) => `[${s}]`).join(' + ');

  const customDigits = customPinInput.replace(/\D/g, '').slice(0, 8);
  const isCustom8Valid = customDigits.length === 8 && verifyWpsPinChecksum(customDigits);
  const autoChecksumDigit =
    customDigits.length === 7
      ? computeWpsChecksum(parseInt(customDigits, 10))
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="network-modal-title"
    >
      <div
        className="w-full max-w-[440px] max-h-[92vh] overflow-y-auto bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 sm:p-5 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="relative flex flex-col items-center text-center pb-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="absolute right-0 top-0 w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <h2
            id="network-modal-title"
            className="text-[20px] font-bold text-slate-900 leading-tight px-8"
          >
            {network.ssid}
          </h2>
          <p className="text-[14px] text-slate-600 font-mono tabular-nums mt-1">
            {network.bssid}
          </p>
          <p className="text-[12px] text-slate-500 mt-0.5">{securityLabel}</p>
        </div>

        {/* Status Banners (matching screenshot red/green stacked bars) */}
        <div className="space-y-1.5">
          {network.recoveredPassword ? (
            <div className="w-full rounded-md bg-[#16A34A] text-white py-2 px-3 text-center flex items-center justify-center gap-2">
              <span className="text-[13px] font-bold tracking-wide uppercase">
                {t.connectedPassword}: <span className="font-mono">{network.recoveredPassword}</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopy(network.recoveredPassword!)}
                className="p-1 rounded hover:bg-white/20 transition-colors cursor-pointer"
                title="Copy password"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="w-full rounded-md bg-[#F05252] text-white py-2 px-3 text-center text-[13px] font-bold tracking-wide uppercase">
              {t.unknownPassword}
            </div>
          )}

          {network.wpsLocked ? (
            <div className="w-full rounded-md bg-amber-500 text-white py-2 px-3 text-center text-[13px] font-bold tracking-wide uppercase">
              {t.wpsLocked}
            </div>
          ) : network.wpsEnabled ? (
            <div className="w-full rounded-md bg-[#65C445] text-white py-2 px-3 text-center text-[13px] font-bold tracking-wide uppercase">
              {t.wpsEnabled}
            </div>
          ) : (
            <div className="w-full rounded-md bg-[#E11D48] text-white py-2 px-3 text-center text-[13px] font-bold tracking-wide uppercase">
              {t.wpsDisabled}
            </div>
          )}
        </div>

        {/* PIN Information Box */}
        <div className="mt-2 bg-slate-50 border border-slate-200/80 rounded-lg py-2.5 px-3 text-center">
          <p className="text-[13px] font-medium text-slate-600 uppercase tracking-wide">
            {network.verifiedPin
              ? `${t.verifiedPin}: ${network.verifiedPin}`
              : t.unknownPin}
          </p>
          <p className="text-[14px] text-slate-700 mt-0.5">{t.tryCommonPins}</p>
        </div>

        {/* Common PIN Dropdown Selector */}
        <div className="mt-3 relative">
          <select
            aria-label="Select WPS PIN"
            value={selectedPin}
            onChange={(e) => setSelectedPin(e.target.value)}
            className="w-full appearance-none bg-[#EAECEF] hover:bg-[#E2E6EC] border border-slate-300 rounded-lg py-2.5 pl-4 pr-10 text-center text-[18px] font-semibold font-mono tabular-nums text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1B3B6F] cursor-pointer transition-colors"
          >
            {network.defaultPins.map((item) => (
              <option key={item.pin} value={item.pin}>
                {item.pin} — {item.source}
              </option>
            ))}
          </select>
          <ChevronDown className="w-5 h-5 text-slate-700 pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
        </div>

        {/* Sub-Panel Inspector (Shown when user interacts with any action button) */}
        {activePanel !== null && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-left">
            <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-slate-200">
              <button
                type="button"
                onClick={() => setActivePanel(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3B6F] hover:underline cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Actions
              </button>
              {copiedText && (
                <span className="text-[11px] font-medium text-emerald-700">
                  Copied {copiedText}
                </span>
              )}
            </div>

            {activePanel === 'connect_key' && (
              <form onSubmit={handleConnectWithKey} className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Enter WPA2/WPA3 Key for {network.ssid}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    placeholder="8–63 character passphrase..."
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    aria-label="Toggle key visibility"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500">
                  Lab reference key: <span className="font-mono select-all">{network.simulatedPsk}</span>
                </p>
                {keyFeedback && (
                  <p
                    className={`text-xs font-medium ${
                      keyFeedback.ok ? 'text-emerald-700' : 'text-rose-600'
                    }`}
                  >
                    {keyFeedback.msg}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-[#1B3B6F] hover:bg-[#152E58] text-white text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer"
                >
                  Verify &amp; Connect
                </button>
              </form>
            )}

            {(activePanel === 'connect_pin' || activePanel === 'pixie_dust') && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
                  <span className="inline-flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#1B3B6F]" />
                    {activePanel === 'pixie_dust'
                      ? 'Pixie Dust Offline Audit'
                      : `WPS Handshake (${selectedPin})`}
                  </span>
                  {isAuditing && (
                    <span className="text-[11px] text-[#1B3B6F] font-mono">Running...</span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {auditSteps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-start gap-2 text-xs bg-white border border-slate-200 rounded-lg p-2"
                    >
                      {step.status === 'success' && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      )}
                      {step.status === 'error' && (
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      )}
                      {step.status === 'warning' && (
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      )}
                      {(step.status === 'pending' || step.status === 'running') && (
                        <span className="w-3.5 h-3.5 rounded-full border-2 border-[#1B3B6F] border-t-transparent animate-spin shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <span className="font-mono font-semibold text-slate-800">
                          {step.stage}:{' '}
                        </span>
                        <span className="text-slate-600 break-words">{step.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activePanel === 'custom_pin' && (
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Enter Custom 8-Digit WPS PIN
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={8}
                  value={customDigits}
                  onChange={(e) => setCustomPinInput(e.target.value)}
                  placeholder="e.g. 12345670"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base font-mono tabular-nums tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-[#1B3B6F]"
                />
                <div className="flex items-center justify-between text-xs">
                  {customDigits.length === 7 && autoChecksumDigit !== null ? (
                    <button
                      type="button"
                      onClick={() => setCustomPinInput(`${customDigits}${autoChecksumDigit}`)}
                      className="text-[#1B3B6F] font-semibold hover:underline cursor-pointer"
                    >
                      Auto-fill 8th checksum digit ({autoChecksumDigit})
                    </button>
                  ) : customDigits.length === 8 ? (
                    <span
                      className={`font-medium ${
                        isCustom8Valid ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {isCustom8Valid
                        ? 'Valid WPS 8-digit checksum'
                        : 'Warning: Invalid WPS 8th checksum digit'}
                    </span>
                  ) : (
                    <span className="text-slate-500">Enter 7 digits to compute checksum</span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={customDigits.length !== 8}
                  onClick={() => {
                    setSelectedPin(customDigits);
                    runPinHandshake(customDigits);
                  }}
                  className="w-full py-2 rounded-lg bg-[#1B3B6F] disabled:bg-slate-300 text-white text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  Test Custom PIN
                </button>
              </div>
            )}

            {(activePanel === 'arcadyan' || activePanel === 'belkin') && algoResult && (
              <div className="space-y-2.5">
                <p className="text-xs font-bold text-slate-800">{algoResult.title}</p>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-2">
                  <span className="text-xs text-slate-500">Calculated PIN</span>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold font-mono tabular-nums text-[#1B3B6F]">
                      {algoResult.pin}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(algoResult.pin)}
                      className="p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
                      aria-label="Copy calculated PIN"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-lg p-2.5 space-y-1 font-mono text-[11px] text-slate-600">
                  {algoResult.steps.map((line, i) => (
                    <div key={i}>{line}</div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPin(algoResult.pin);
                    runPinHandshake(algoResult.pin);
                  }}
                  className="w-full py-2 rounded-lg bg-[#1B3B6F] hover:bg-[#152E58] text-white text-xs font-semibold uppercase tracking-wide transition-colors cursor-pointer"
                >
                  Apply &amp; Test PIN {algoResult.pin}
                </button>
              </div>
            )}

            {activePanel === 'wps_info' && (
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Info className="w-4 h-4 text-[#1B3B6F]" />
                  WPS Information Element (802.11 Probe Response)
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 bg-white border border-slate-200 rounded-lg p-2.5">
                  <dt className="text-slate-500">WPS Version</dt>
                  <dd className="font-mono text-slate-800 text-right">
                    {network.wpsVersion || 'N/A (Disabled)'}
                  </dd>
                  <dt className="text-slate-500">AP Setup Locked</dt>
                  <dd className="font-mono text-slate-800 text-right">
                    {network.wpsLocked ? 'True (0x01)' : 'False (0x00)'}
                  </dd>
                  <dt className="text-slate-500">Config Methods</dt>
                  <dd className="font-mono text-slate-800 text-right truncate">
                    {network.wpsConfigMethods.length > 0
                      ? network.wpsConfigMethods.join(', ')
                      : 'None'}
                  </dd>
                  <dt className="text-slate-500">Model</dt>
                  <dd className="font-mono text-slate-800 text-right truncate">
                    {network.modelName} ({network.modelNumber})
                  </dd>
                  <dt className="text-slate-500">Serial</dt>
                  <dd className="font-mono text-slate-800 text-right">
                    {network.serialNumber}
                  </dd>
                  <dt className="text-slate-500">UUID-E</dt>
                  <dd className="font-mono text-slate-800 text-right truncate" title={network.uuid}>
                    {network.uuid.slice(0, 18)}...
                  </dd>
                </dl>
                <div className="flex items-start gap-2 text-[11px] text-slate-600 bg-white border border-slate-200 rounded-lg p-2">
                  {network.wpsEnabled && !network.wpsLocked ? (
                    <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {network.wpsEnabled
                      ? 'Recommendation: Disable WPS PIN mode in router administration and enforce WPA2-AES / WPA3-SAE.'
                      : 'This network has WPS disabled and is hardened against WPS PIN brute-force or Pixie Dust audits.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary Action Buttons (Exact screenshot layout) */}
        <div className="mt-3.5 space-y-2">
          <button
            type="button"
            onClick={() => {
              setKeyFeedback(null);
              setActivePanel('connect_key');
            }}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] active:scale-[0.99] text-white text-[14px] font-medium tracking-wide uppercase transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4 opacity-80" />
            <span>{t.connectWithKey}</span>
          </button>

          <button
            type="button"
            onClick={() => runPinHandshake(selectedPin)}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] active:scale-[0.99] text-white text-[14px] font-medium tracking-wide uppercase transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4 opacity-80" />
            <span>{t.connectWithPin}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePanel('custom_pin')}
            className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] active:scale-[0.99] text-white text-[14px] font-medium tracking-wide uppercase transition-all cursor-pointer"
          >
            {t.customPin}
          </button>

          {/* 2-Column Algorithm & Audit Grid */}
          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <button
              type="button"
              onClick={handleArcadyan}
              className="min-h-[48px] py-2 px-3 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] active:scale-[0.99] text-white text-[12px] sm:text-[13px] font-medium leading-tight uppercase transition-all cursor-pointer text-center"
            >
              {t.arcadyanAlgorithm}
            </button>

            <button
              type="button"
              onClick={handleBelkin}
              className="min-h-[48px] py-2 px-3 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] active:scale-[0.99] text-white text-[12px] sm:text-[13px] font-medium leading-tight uppercase transition-all cursor-pointer text-center"
            >
              {t.belkinAlgorithm}
            </button>

            <button
              type="button"
              onClick={() => setActivePanel('wps_info')}
              className="min-h-[44px] py-2 px-3 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] active:scale-[0.99] text-white text-[12px] sm:text-[13px] font-medium leading-tight uppercase transition-all cursor-pointer text-center"
            >
              {t.wpsInformation}
            </button>

            <button
              type="button"
              onClick={runPixieDustAudit}
              className="min-h-[44px] py-2 px-3 rounded-xl bg-[#1B3B6F] hover:bg-[#152E58] active:scale-[0.99] text-white text-[12px] sm:text-[13px] font-medium leading-tight uppercase transition-all cursor-pointer text-center"
            >
              {t.pixieDustAttack}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
