export type MainTab = 'networks' | 'devices' | 'channels';
export type Language = 'en' | 'bn';
export type SortMode = 'signal' | 'channel' | 'ssid' | 'vulnerable';

export type VulnerableStatus = 'unknown' | 'vulnerable' | 'not_vulnerable' | 'locked';

export interface WifiNetwork {
  id: string;
  ssid: string;
  bssid: string;
  rssi: number;
  channel: number;
  bandwidthMhz: 20 | 40 | 80;
  band: '2.4 GHz' | '5 GHz';
  security: string[];
  vendor: string;
  wpsEnabled: boolean;
  wpsLocked: boolean;
  wpsVersion: '1.0' | '2.0' | null;
  wpsConfigMethods: string[];
  vulnerableStatus: VulnerableStatus;
  pixieDustVulnerable: boolean;
  defaultPins: { pin: string; source: string }[];
  validAuditPin: string | null;
  simulatedPsk: string;
  recoveredPassword: string | null;
  verifiedPin: string | null;
  isConnected: boolean;
  modelName: string;
  modelNumber: string;
  serialNumber: string;
  uuid: string;
}

export interface LanDevice {
  id: string;
  hostname: string;
  ip: string;
  mac: string;
  vendor: string;
  category: 'router' | 'phone' | 'laptop' | 'iot' | 'tv';
  latencyMs: number;
  linkSpeedMbps: number;
  openPorts: number[];
  isGateway?: boolean;
  isSelf?: boolean;
}

export interface AuditStep {
  id: string;
  stage: string;
  detail: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
}
