import React, { useState } from 'react';
import { useMQTT } from '../store/MQTTContext';
import { useDevices } from '../store/DeviceContext';
import { Card, Button, Input } from './UIComponents';
import { Zap, Link as LinkIcon } from 'lucide-react';

export const CommandPanel: React.FC = () => {
    const { publish, status } = useMQTT();
    const { devices } = useDevices();
    const [targetType, setTargetType] = useState<'all' | 'specific'>('all');
    const [selectedDevice, setSelectedDevice] = useState<string>('');
    const [dppUrl, setDppUrl] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleBurn = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dppUrl) return;

        setIsSending(true);

        const payload = JSON.stringify({
            command: 'burn_nfc',
            url: dppUrl,
            timestamp: new Date().toISOString()
        });

        if (targetType === 'all') {
            // Broadcast to all devices listening on the proper topic
            // Assuming a general command topic or iterating through devices
            // For now, let's iterate to be safe if no group topic exists
            devices.forEach(device => {
                publish(`incendo/devices/${device.serialNumber}/command`, payload);
            });
        } else if (selectedDevice) {
            publish(`incendo/devices/${selectedDevice}/command`, payload);
        }

        // Simulate network delay for effect
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsSending(false);
        setDppUrl('');
    };

    return (
        <Card title="COMMAND & CONTROL" className="h-full border-tron-cyan/50 shadow-neon-cyan/20">
            <form onSubmit={handleBurn} className="space-y-6">

                {/* Target Selection */}
                <div className="space-y-3">
                    <label className="text-xs font-mono text-tron-muted uppercase tracking-wider">TARGET DEVICES</label>
                    <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="target"
                                checked={targetType === 'all'}
                                onChange={() => setTargetType('all')}
                                className="accent-tron-cyan"
                            />
                            <span className="text-sm font-mono group-hover:text-tron-cyan transition-colors">ALL FLEET</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                            <input
                                type="radio"
                                name="target"
                                checked={targetType === 'specific'}
                                onChange={() => setTargetType('specific')}
                                className="accent-tron-cyan"
                            />
                            <span className="text-sm font-mono group-hover:text-tron-cyan transition-colors">SPECIFIC_ID</span>
                        </label>
                    </div>

                    {targetType === 'specific' && (
                        <select
                            className="tron-input w-full mt-2"
                            value={selectedDevice}
                            onChange={(e) => setSelectedDevice(e.target.value)}
                            required
                        >
                            <option value="">-- SELECT ID --</option>
                            {devices.map(d => (
                                <option key={d.serialNumber} value={d.serialNumber}>
                                    {d.name} ({d.serialNumber})
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Command Parameter */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2 text-tron-cyan mb-1">
                        <LinkIcon size={16} />
                        <span className="font-bold font-orbitron text-sm">DPP SOURCE URL</span>
                    </div>
                    <Input
                        placeholder="https://dpp.whatt.io/..."
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
                        disabled={status !== 'connected' || isSending}
                        isLoading={isSending}
                    >
                        <span>EXECUTE BURN</span>
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
