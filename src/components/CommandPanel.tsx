import React, { useState, useEffect } from 'react';
import { useMQTT } from '../store/MQTTContext';
import { useDevices } from '../store/DeviceContext';
import { Card, Button, Input } from './UIComponents';
import { Zap, Link as LinkIcon, ChevronDown, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';
import { fetchWhattProduct } from '../lib/whatt';

import { useActivity } from '../store/ActivityContext';

export const CommandPanel: React.FC = () => {
    const { publish, status } = useMQTT();
    const { devices, updateDeviceDetails } = useDevices();
    const { addLog } = useActivity();

    const [dppUrl, setDppUrl] = useState('');
    const [selectedDeviceSerial, setSelectedDeviceSerial] = useState<string>('');
    const [isSending, setIsSending] = useState(false);

    // Auto-select first device if none selected and devices exist
    useEffect(() => {
        if (!selectedDeviceSerial && devices.length > 0) {
            setSelectedDeviceSerial(devices[0].serialNumber);
        }
    }, [devices, selectedDeviceSerial]);

    const handleSendConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dppUrl || !selectedDeviceSerial) return;

        setIsSending(true);
        addLog('system', `Provisioning Device ${selectedDeviceSerial}`, `URL: ${dppUrl}`);

        const topic = `incendo/dpp_url/${selectedDeviceSerial}`;

        // Publish URL to specific device topic
        publish(topic, dppUrl);

        try {
            // Fetch Rich Metadata
            const productData = await fetchWhattProduct(dppUrl);

            // Update local device state
            updateDeviceDetails(selectedDeviceSerial, {
                provisionedDppUrl: dppUrl,
                productMetadata: productData ? {
                    name: productData.name,
                    productCode: productData.product_number,
                    imageUrl: productData.main_image
                } : undefined
            });
            addLog('success', `Provisioned ${selectedDeviceSerial}`, productData ? `Product: ${productData.name}` : undefined);
        } catch (err) {
            addLog('error', `Failed to fetch product data`, String(err));
            console.error('Failed to update device details', err);
            // Fallback to just URL if fetch fails
            updateDeviceDetails(selectedDeviceSerial, { provisionedDppUrl: dppUrl });
        }

        // Simulate network delay for effect
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsSending(false);
        setDppUrl('');
    };

    const selectedDevice = devices.find(d => d.serialNumber === selectedDeviceSerial);

    return (
        <Card title="DEVICE PROVISIONING" className="h-full border-tron-cyan/50 shadow-neon-cyan/20">
            <form onSubmit={handleSendConfig} className="space-y-6">

                {/* Device Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-tron-muted uppercase tracking-wider block">Target Device</label>
                    <div className="relative">
                        <select
                            value={selectedDeviceSerial}
                            onChange={(e) => setSelectedDeviceSerial(e.target.value)}
                            className="w-full bg-black/40 border border-tron-cyan/30 rounded-lg p-3 text-sm text-white appearance-none focus:outline-none focus:border-tron-cyan/80 font-mono"
                            disabled={devices.length === 0}
                        >
                            {devices.length === 0 ? (
                                <option>No devices connected</option>
                            ) : (
                                devices.map(device => (
                                    <option key={device.serialNumber} value={device.serialNumber}>
                                        {device.customName || device.name} ({device.serialNumber})
                                    </option>
                                ))
                            )}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-tron-cyan pointer-events-none" size={16} />
                    </div>

                    {/* Topic Preview */}
                    {selectedDeviceSerial && (
                        <div className="p-2 bg-tron-cyan/5 border border-dashed border-tron-cyan/20 rounded text-[10px] font-mono text-tron-cyan/80 flex items-center gap-2">
                            <span className="opacity-50">TOPIC:</span>
                            incendo/dpp_url/{selectedDeviceSerial}
                        </div>
                    )}
                </div>

                {/* Command Parameter */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-tron-cyan mb-1">
                        <LinkIcon size={16} />
                        <span className="font-bold font-orbitron text-sm">DPP SOURCE URL</span>
                    </div>
                    <Input
                        placeholder="https://whatt.io/device-..."
                        value={dppUrl}
                        onChange={(e) => setDppUrl(e.target.value)}
                        required={true}
                    />
                    <p className="text-xs text-tron-muted font-mono">*URL to be written to NFC tag</p>
                </div>

                {/* Action Trigger */}
                <div className="pt-4 border-t border-tron-border/30">
                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full flex justify-between items-center group"
                        disabled={status !== 'connected' || isSending || !selectedDeviceSerial}
                        isLoading={isSending}
                    >
                        <span>SEND CONFIGURATION</span>
                        <Zap size={18} className="group-hover:text-black text-tron-cyan transition-colors" />
                    </Button>
                    {status !== 'connected' && (
                        <p className="text-xs text-tron-error mt-2 text-center font-mono">
                            ⚠ SYSTEM OFFLINE
                        </p>
                    )}
                </div>
            </form>
        </Card>
    );
};
