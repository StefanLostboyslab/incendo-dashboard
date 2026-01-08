import { useEffect } from 'react';
import { useMQTT } from '../store/MQTTContext';
import { useDevices } from '../store/DeviceContext';
import type { Device } from '../store/types';

export const useDiscovery = () => {
    const { client, subscribe, lastMessage } = useMQTT();
    const { devices, addDevice, updateDeviceStatus } = useDevices();

    // Subscribe to discovery topic
    useEffect(() => {
        if (client?.connected) {
            console.log('[Discovery] Subscribing to incendo/discovery/#');
            subscribe('incendo/discovery/#');
        }
    }, [client?.connected, subscribe]);

    // Handle incoming discovery messages
    useEffect(() => {
        if (lastMessage) {
            const { topic, payload } = lastMessage;

            // Match incendo/discovery/<id>
            if (topic.startsWith('incendo/discovery/')) {
                try {
                    const data = JSON.parse(payload);
                    console.log('[Discovery] Discovered device:', data);

                    // Required fields check
                    if (data.id && data.mac) {
                        const newDevice: Device = {
                            serialNumber: data.id,
                            name: data.name || `Device ${data.id.substr(-6)}`,
                            status: 'online',
                            deviceType: data.type || 'unknown',
                            location: 'Discovered', // Default location could be updated via another message
                            ipAddress: data.ip || '0.0.0.0',
                            lastSeen: new Date().toISOString()
                        };

                        const existing = devices.find(d => d.serialNumber === newDevice.serialNumber);

                        if (!existing) {
                            addDevice(newDevice);
                        } else {
                            // If device exists, just mark it online and update IP/Location if changed
                            // For now just status to keep it simple
                            if (existing.status !== 'online') {
                                updateDeviceStatus(newDevice.serialNumber, 'online');
                            }
                        }
                    }
                } catch (e) {
                    console.error('[Discovery] Invalid payload:', e);
                }
            }
        }
    }, [lastMessage, addDevice]);
};
