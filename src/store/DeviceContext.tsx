
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
    // Only call this inside a component that is a child of MQTTProvider? 
    // Wait, DeviceProvider is a child of MQTTProvider in App.tsx? Yes.
    // BUT we need to make sure useDiscovery is called where it has access to MQTT context.
    // If DeviceProvider is inside MQTTProvider, useDevices is not available inside DeviceProvider itself.
    // Actually, useDiscovery uses useDevices, so it must be a child of DeviceProvider.

    // Changing approach: useDiscovery should be called in a reliable child component, OR 
    // DeviceContext should expose the dispatcher and we run useDiscovery in a separate component/layer.

    // Simpler: Let's create a DiscoveryService component that sits inside both providers.

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
            // Use the passed status, defaulting to 'online' if not specified, but respect the incoming object
            return [...prev, { ...device, lastSeen: new Date().toISOString() }];
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

    const updateDeviceDetails = (serialNumber: string, details: Partial<Device>) => {
        setDevices(prev => prev.map(d =>
            d.serialNumber === serialNumber
                ? { ...d, ...details } // shallow merge
                : d
        ));
    };

    const getDevice = (serialNumber: string) => devices.find(d => d.serialNumber === serialNumber);

    return (
        <DeviceContext.Provider value={{ devices, addDevice, removeDevice, updateDeviceStatus, updateDeviceDetails, getDevice }}>
            {children}
        </DeviceContext.Provider>
    );
};
