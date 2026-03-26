export type DeviceStatus = 'online' | 'offline' | 'busy';

export interface EPCISData {
    gln?: string;
    sgtin?: string;
    readPoint?: string;
    bizLocation?: string;
    deviceType?: string;
}

export interface NFCReadEvent {
    uid: string;
    readPoint?: string;
    productName?: string;
    dpp_url?: string;
    token?: string;
    timestamp: number; // ms since boot, or Date.now() from dashboard
}

export interface Device {
    serialNumber: string; // Used as ID (Immutable)
    name: string; // Firmware name
    customName?: string; // User alias
    deviceType: string;
    location: string; // Firmware location
    customLocation?: string; // User alias
    epcis?: {
        gln?: string;        // Geo URI or GLN
        sgtin?: string;      // Product URL
        readPoint?: string;  // Generated Uniform Resource Identifier
        bizLocation?: string;// Global Business Location
        deviceType?: string; // whatt.io incendo NFC
    };
    hardwareModules?: {
        motherboard?: 'r2' | 'r4';
        display?: 'st7789' | 'st7735' | 'oled1306' | 'none';
        pn532?: boolean;
        st25dv?: boolean;
        scd30?: boolean;
        qrReader?: boolean;
        dfRobotRgb?: boolean;
        elektrokitMosfet?: boolean;
    };
    hardwareModuleUrls?: Record<string, string>;
    provisionedDppUrl?: string;
    productMetadata?: {
        name: string;
        productCode: string;
        imageUrl: string;
        team?: string;
        category?: string;
    };
    status: DeviceStatus;
    ipAddress?: string;
    macAddress?: string;
    ssid?: string;
    version?: string;
    lastSeen?: string; // ISO date string
    activeMode?: 'idle' | 'read' | 'write';
    nfcHistory?: NFCReadEvent[];
}

export interface DeviceContextType {
    devices: Device[];
    addDevice: (device: Device) => void;
    removeDevice: (serialNumber: string) => void;
    updateDeviceStatus: (serialNumber: string, status: DeviceStatus) => void;
    updateDeviceDetails: (serialNumber: string, details: Partial<Device>) => void; // New
    getDevice: (serialNumber: string) => Device | undefined;
}
