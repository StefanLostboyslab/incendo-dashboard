
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Device, DeviceContextType, DeviceStatus } from './types';

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const useDevices = () => {
    const context = useContext(DeviceContext);
    if (!context) {
        throw new Error('useDevices must be used within a DeviceProvider');
    }
    return context;
};

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [devices, setDevices] = useState<Device[]>(() => {
        const saved = localStorage.getItem('incendo_devices');
        return saved ? JSON.parse(saved) : [];
    });

    useEffect(() => {
        localStorage.setItem('incendo_devices', JSON.stringify(devices));
    }, [devices]);

    const addDevice = (device: Device) => {
        setDevices(prev => {
            if (prev.some(d => d.serialNumber === device.serialNumber)) return prev;
            return [...prev, { ...device, status: 'offline', lastSeen: new Date().toISOString() }];
        });
    };

    const removeDevice = (serialNumber: string) => {
        setDevices(prev => prev.filter(d => d.serialNumber !== serialNumber));
    };

    const updateDeviceStatus = (serialNumber: string, status: DeviceStatus) => {
        setDevices(prev => prev.map(d =>
            d.serialNumber === serialNumber
                ? { ...d, status, lastSeen: new Date().toISOString() }
                : d
        ));
    };

    const getDevice = (serialNumber: string) => devices.find(d => d.serialNumber === serialNumber);

    return (
        <DeviceContext.Provider value={{ devices, addDevice, removeDevice, updateDeviceStatus, getDevice }}>
            {children}
        </DeviceContext.Provider>
    );
};
