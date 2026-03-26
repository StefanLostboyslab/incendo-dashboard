import { useEffect, useRef } from 'react';
import { useMQTT } from '../store/MQTTContext';
import { useDevices } from '../store/DeviceContext';
import type { Device } from '../store/types';

export const useDiscovery = () => {
    const { client, subscribe, lastMessage } = useMQTT();
    const { devices, addDevice, updateDeviceDetails } = useDevices();

    // Subscribe to discovery topic
    useEffect(() => {
        if (client?.connected) {
            console.log('[Discovery] Subscribing to incendo/discovery/#');
            subscribe('incendo/discovery/#');
            subscribe('incendo/nfc_scan/#');
        }
    }, [client?.connected, subscribe]);

    const lastProcessedMessage = useRef<{topic: string; payload: string} | null>(null);

    // Handle incoming discovery messages
    useEffect(() => {
        if (lastMessage && lastMessage !== lastProcessedMessage.current) {
            lastProcessedMessage.current = lastMessage;
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
                                deviceType: data.epcis?.ilmd?.deviceType || data.type || 'unknown',
                                location: data.epcis?.bizLocation?.id || 'Discovered',
                                ipAddress: data.ip || '0.0.0.0',
                                macAddress: data.mac || '00:00:00:00:00:00',
                                lastSeen: new Date().toISOString(),
                                version: data.epcis?.ilmd?.firmwareVersion || data.version,
                                epcis: {
                                    readPoint: data.epcis?.readPoint?.id,
                                    bizLocation: data.epcis?.bizLocation?.id,
                                    deviceType: data.epcis?.ilmd?.deviceType
                                }
                            };

                        const existing = devices.find((d: Device) => d.serialNumber === newDevice.serialNumber);

                        if (!existing) {
                            addDevice(newDevice);
                        } else {
                            // Completely merge the incoming telemetry for existing devices
                            updateDeviceDetails(newDevice.serialNumber, {
                                ...newDevice
                            });
                        }
                    }
                } catch (e) {
                    console.error('[Discovery] Invalid payload:', e);
                }
            } else if (topic.startsWith('incendo/nfc_scan/')) {
                const parts = topic.split('/');
                if (parts.length >= 3) {
                    const deviceId = parts[2];
                    try {
                        const eventData = JSON.parse(payload);
                        console.log(`[NFC Event] Device ${deviceId} scanned:`, eventData);
                        const device = devices.find((d: Device) => d.serialNumber === deviceId);
                        if (device) {
                            const newEvent = {
                                uid: eventData.uid || 'UNKNOWN',
                                readPoint: eventData.readPoint,
                                dpp_url: eventData.dpp_url,
                                token: eventData.token,
                                timestamp: Date.now()
                            };
                            const updatedHistory = [newEvent, ...(device.nfcHistory || [])].slice(0, 10);
                            updateDeviceDetails(deviceId, { nfcHistory: updatedHistory });
                        }
                    } catch (e) {
                        console.error('[NFC Event] Invalid payload:', e);
                    }
                }
            }
        }
    }, [lastMessage, addDevice, devices, updateDeviceDetails]);
};
