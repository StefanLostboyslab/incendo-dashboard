export type DeviceStatus = 'online' | 'offline' | 'busy';

export interface Device {
    serialNumber: string; // Used as ID
    name: string;
    deviceType: string;
    location: string;
    status: DeviceStatus;
    ipAddress?: string;
    macAddress?: string;
    ssid?: string;
    version?: string;
    lastSeen?: string; // ISO date string
}

export interface DeviceContextType {
    devices: Device[];
    addDevice: (device: Device) => void;
    removeDevice: (serialNumber: string) => void;
    updateDeviceStatus: (serialNumber: string, status: DeviceStatus) => void;
    getDevice: (serialNumber: string) => Device | undefined;
}
