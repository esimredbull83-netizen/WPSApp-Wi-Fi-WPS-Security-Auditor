/**
 * Real WPS 8th-digit checksum & MAC-derived PIN calculation utilities.
 * Used for educational auditing and router PIN verification.
 */

export function parseMacBytes(mac: string): number[] | null {
  const cleaned = mac.replace(/[^0-9a-fA-F]/g, '');
  if (cleaned.length !== 12) return null;
  const bytes: number[] = [];
  for (let i = 0; i < 12; i += 2) {
    bytes.push(parseInt(cleaned.slice(i, i + 2), 16));
  }
  return bytes;
}

export function formatMac(raw: string): string {
  const cleaned = raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase().slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < cleaned.length; i += 2) {
    parts.push(cleaned.slice(i, i + 2));
  }
  return parts.join(':');
}

/**
 * Standard Wi-Fi Protected Setup (WPS) 8th-digit checksum calculation.
 */
export function computeWpsChecksum(pin7: number): number {
  let accum = 0;
  let val = Math.abs(Math.floor(pin7)) % 10000000;
  for (let i = 0; i < 7; i++) {
    const digit = val % 10;
    accum += i % 2 === 0 ? 3 * digit : digit;
    val = Math.floor(val / 10);
  }
  return (10 - (accum % 10)) % 10;
}

export function formatPin8(pin7: number): string {
  const base = Math.abs(Math.floor(pin7)) % 10000000;
  const check = computeWpsChecksum(base);
  return `${base.toString().padStart(7, '0')}${check}`;
}

export function verifyWpsPinChecksum(pin8: string): boolean {
  if (!/^\d{8}$/.test(pin8)) return false;
  const pin7 = parseInt(pin8.slice(0, 7), 10);
  const expected = computeWpsChecksum(pin7);
  return parseInt(pin8[7], 10) === expected;
}

/**
 * Arcadyan / EasyBox MAC-based WPS PIN derivation algorithm.
 */
export function calculateArcadyanPin(mac: string): { pin: string; steps: string[] } {
  const bytes = parseMacBytes(mac);
  if (!bytes) {
    return { pin: '00000000', steps: ['Invalid MAC address format'] };
  }

  const nic = (bytes[3] << 16) | (bytes[4] << 8) | bytes[5];
  const serial = nic.toString().padStart(5, '0').slice(-4);
  const sn = [
    parseInt(serial[0], 10),
    parseInt(serial[1], 10),
    parseInt(serial[2], 10),
    parseInt(serial[3], 10),
  ];

  const macNibbles = [
    (bytes[4] >> 4) & 0xf,
    bytes[4] & 0xf,
    (bytes[5] >> 4) & 0xf,
    bytes[5] & 0xf,
  ];

  const k1 = (sn[2] + sn[3] + macNibbles[2] + macNibbles[3]) & 0xf;
  const k2 = (sn[0] + sn[1] + macNibbles[0] + macNibbles[1]) & 0xf;

  const h1 = k1 ^ sn[3];
  const h2 = k1 ^ sn[2];
  const h3 = k2 ^ macNibbles[1];
  const h4 = k2 ^ macNibbles[2];
  const h5 = macNibbles[2] ^ sn[3];
  const h6 = macNibbles[3] ^ sn[2];
  const h7 = k1 ^ sn[1];

  const hex7 = [h1, h2, h3, h4, h5, h6, h7].map((n) => (n % 10).toString()).join('');
  const pin7 = parseInt(hex7, 10);
  const pin8 = formatPin8(pin7);

  return {
    pin: pin8,
    steps: [
      `NIC 24-bit integer: 0x${nic.toString(16).toUpperCase().padStart(6, '0')} (${nic})`,
      `Derived serial digits: [${sn.join(', ')}]`,
      `XOR keys k1 = ${k1.toString(16).toUpperCase()}, k2 = ${k2.toString(16).toUpperCase()}`,
      `7-digit base PIN: ${pin7.toString().padStart(7, '0')}`,
      `WPS Checksum digit: ${pin8[7]} -> Final PIN: ${pin8}`,
    ],
  };
}

/**
 * Belkin MAC-based WPS PIN derivation algorithm.
 */
export function calculateBelkinPin(mac: string): { pin: string; steps: string[] } {
  const bytes = parseMacBytes(mac);
  if (!bytes) {
    return { pin: '00000000', steps: ['Invalid MAC address format'] };
  }

  const nicHex = bytes
    .slice(3)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const nicVal = parseInt(nicHex, 16);
  const charTable = [0, 3, 6, 9, 2, 5, 8, 1, 4, 7];
  const shifted = (nicVal ^ 0x3b5c7d) % 10000000;
  const digits = shifted
    .toString()
    .padStart(7, '0')
    .split('')
    .map((d, idx) => charTable[(parseInt(d, 10) + idx) % 10])
    .join('');

  const pin7 = parseInt(digits, 10);
  const pin8 = formatPin8(pin7);

  return {
    pin: pin8,
    steps: [
      `Target NIC suffix: ${nicHex} (dec ${nicVal})`,
      `Bitmask XOR 0x3B5C7D -> ${shifted.toString().padStart(7, '0')}`,
      `Belkin nibble substitution -> ${digits}`,
      `WPS Checksum digit: ${pin8[7]} -> Final PIN: ${pin8}`,
    ],
  };
}

/**
 * ComputePIN / ZhaoChesung 24-bit NIC modulo 10^7 algorithm (common on Netis, Tenda, D-Link).
 */
export function calculateComputePin(mac: string): { pin: string; steps: string[] } {
  const bytes = parseMacBytes(mac);
  if (!bytes) {
    return { pin: '00000000', steps: ['Invalid MAC address format'] };
  }
  const nic = (bytes[3] << 16) | (bytes[4] << 8) | bytes[5];
  const pin7 = nic % 10000000;
  const pin8 = formatPin8(pin7);

  return {
    pin: pin8,
    steps: [
      `NIC bytes [3..5]: 0x${nic.toString(16).toUpperCase().padStart(6, '0')}`,
      `Decimal mod 10^7: ${pin7.toString().padStart(7, '0')}`,
      `WPS Checksum digit: ${pin8[7]} -> Final PIN: ${pin8}`,
    ],
  };
}

export function getSuggestedPinsForNetwork(
  mac: string,
  vendor: string,
  extraPins: { pin: string; source: string }[] = []
): { pin: string; source: string }[] {
  const compute = calculateComputePin(mac);
  const arcadyan = calculateArcadyanPin(mac);
  const belkin = calculateBelkinPin(mac);

  const list: { pin: string; source: string }[] = [
    ...extraPins,
    { pin: compute.pin, source: `ComputePIN (${vendor})` },
    { pin: arcadyan.pin, source: 'Arcadyan Algorithm' },
    { pin: belkin.pin, source: 'Belkin Algorithm' },
    { pin: '12345670', source: 'Common Default PIN' },
    { pin: '00000000', source: 'Null Default PIN' },
    { pin: '88888880', source: 'Vendor Fallback PIN' },
  ];

  const seen = new Set<string>();
  return list.filter((item) => {
    if (seen.has(item.pin)) return false;
    seen.add(item.pin);
    return true;
  });
}
