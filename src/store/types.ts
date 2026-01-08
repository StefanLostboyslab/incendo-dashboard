export type DeviceStatus = 'online' | 'offline' | 'busy';

export interface EPCISData {
    gln?: string;
    sgtin?: string;
    readPoint?: string;
    bizLocation?: string;
}

export interface Device {
    serialNumber: string; // Used as ID (Immutable)
    name: string; // Firmware name
    customName?: string; // User alias
    deviceType: string;
    location: string; // Firmware location
    customLocation?: string; // User alias
    provisionedDppUrl?: string;
    productMetadata?: {
        name: string;
        productCode: string;
        imageUrl: string;
    };
    status: DeviceStatus;
    ipAddress?: string;
    macAddress?: string;
    ssid?: string;
    version?: string;
    lastSeen?: string; // ISO date string
    epcis?: EPCISData; // New EPCIS metadata
}

export interface DeviceContextType {
    devices: Device[];
    addDevice: (device: Device) => void;
    removeDevice: (serialNumber: string) => void;
    updateDeviceStatus: (serialNumber: string, status: DeviceStatus) => void;
    updateDeviceDetails: (serialNumber: string, details: Partial<Device>) => void; // New
    getDevice: (serialNumber: string) => Device | undefined;
}
