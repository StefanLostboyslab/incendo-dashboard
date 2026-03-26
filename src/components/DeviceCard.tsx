import React, { useState, useEffect } from 'react';
import { Card, StatusBadge, Button } from './UIComponents';
import { Monitor, Wifi, MapPin, Trash2, Activity } from 'lucide-react';
import { useDevices } from '../store/DeviceContext';
import { useMQTT } from '../store/MQTTContext';
import { cn } from '../lib/utils';
import type { Device } from '../store/types';

interface DeviceCardProps {
    device: Device;
    onClick?: () => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device, onClick }) => {
    const { removeDevice, updateDeviceDetails } = useDevices();
    const { publish, subscribe, unsubscribe, lastMessage, status } = useMQTT();

    const [isPinging, setIsPinging] = useState(false);
    const [latency, setLatency] = useState<number | null>(null);
    const [pingStatus, setPingStatus] = useState<'idle' | 'success' | 'timeout'>('idle');

    // Handle incoming PONG
    useEffect(() => {
        if (!isPinging || !lastMessage) return;

        const { topic } = lastMessage;
        if (topic === `incendo/devices/${device.serialNumber}/pong`) {
            setIsPinging(false);
            setPingStatus('success');
        }
    }, [lastMessage, isPinging, device.serialNumber]);

    const handlePing = async () => {
        setIsPinging(true);
        setPingStatus('idle');
        setLatency(null);

        const topic = `incendo/devices/${device.serialNumber}/ping`;
        const pongTopic = `incendo/devices/${device.serialNumber}/pong`;
        const start = Date.now();

        subscribe(pongTopic);
        publish(topic, JSON.stringify({ timestamp: start }));

        setTimeout(() => {
            setIsPinging(prev => {
                if (prev) {
                    setPingStatus('timeout');
                    unsubscribe(pongTopic);
                    return false;
                }
                return false;
            });
        }, 3000);
    };

    const [pingStart, setPingStart] = useState<number>(0);

    useEffect(() => {
        if (pingStatus === 'success' && pingStart > 0) {
            setLatency(Date.now() - pingStart);
        }
    }, [pingStatus, pingStart]);

    const clickPing = () => {
        setPingStart(Date.now());
        handlePing();
    };

    const handleSetMode = (mode: 'idle' | 'read' | 'write', url?: string, level?: string) => {
        updateDeviceDetails(device.serialNumber, { activeMode: mode });
        const payload: any = { mode: mode.toUpperCase() };
        if (url) payload.url = url;
        if (level) payload.level = level;
        publish(`incendo/devices/${device.serialNumber}/mode`, JSON.stringify(payload));
    };

    // Helper to format the displayed readpoint name (strips GS1 formatting if present)
    const formatReadPointTitle = (rp?: string) => {
        if (!rp) return device.name || device.serialNumber;
        const parts = rp.split('whattio:readpoint:');
        if (parts.length > 1) {
             const subParts = parts[1].split('/');
             return subParts.length > 1 ? subParts[1] : subParts[0];
        }
        return rp;
    };

    const displayName = formatReadPointTitle(device.epcis?.readPoint);
    const displayLocation = device.customLocation || device.location;
    const subText = device.epcis?.readPoint ? device.serialNumber : "";

    return (
        <>
            <Card 
                onClick={onClick}
                className={cn(
                "transition-all duration-300",
                onClick && "cursor-pointer hover:-translate-y-1 hover:shadow-neon-cyan/20 cursor-pointer",
                device.activeMode === 'write' ? "border-pink-500/50 shadow-[0_0_15px_rgba(236,72,153,0.1)]" : 
                device.activeMode === 'read' ? "hover:border-tron-cyan/50" : 
                device.status === 'online' ? "border-[#4ade80]/60 shadow-[0_0_20px_rgba(74,222,128,0.3),inset_0_0_10px_rgba(74,222,128,0.1)] hover:shadow-[0_0_30px_rgba(74,222,128,0.5),inset_0_0_15px_rgba(74,222,128,0.2)]" :
                "border-red-500/30 opacity-70 hover:opacity-100 hover:border-red-500/50 bg-black/60"
            )}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg border",
                            device.activeMode === 'write' ? "bg-pink-500/10 border-pink-500/20 text-pink-500" :
                            "bg-tron-cyan/5 border-tron-cyan/20 text-tron-cyan"
                        )}>
                            <Monitor size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className={cn(
                                    "font-bold text-lg leading-none",
                                    device.epcis?.readPoint ? "text-tron-cyan" : "text-white"
                                )}>
                                    {displayName}
                                </h4>
                            </div>
                            <span className="text-xs font-mono text-tron-muted">{subText || device.serialNumber}</span>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <StatusBadge status={device.status} />
                        {latency !== null && (
                            <span className="text-[10px] font-mono text-tron-success flex items-center gap-1">
                                <Activity size={10} /> {latency}ms
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-2 mb-6">
                    <div className="flex items-center gap-2 text-sm text-tron-muted">
                        <MapPin size={14} />
                        <span>{displayLocation}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-tron-muted">
                        <Wifi size={14} />
                        <span className="font-mono">
                            {device.ipAddress || 'Unknown IP'} 
                            <span className="text-tron-muted/30 mx-2">•</span> 
                            MAC: {device.macAddress || 'N/A'}
                        </span>
                    </div>
                    {device.version && (
                        <div className="flex items-center gap-2 text-sm text-tron-muted">
                            <Activity size={14} />
                            <span className="font-mono text-xs">V{device.version} / {device.epcis?.deviceType || 'Unknown Type'}</span>
                        </div>
                    )}
                </div>

                {/* Provisioned URL/Product Indicator */}
                {(device.provisionedDppUrl) && (
                    <div className="mt-3 bg-tron-cyan/5 border border-tron-cyan/20 rounded p-2 flex items-start gap-3 overflow-hidden transition-all hover:bg-tron-cyan/10">
                        {device.productMetadata?.imageUrl ? (
                            <img
                                src={device.productMetadata.imageUrl}
                                alt="Product"
                                className="w-10 h-10 object-cover rounded border border-tron-cyan/30"
                            />
                        ) : (
                            <Monitor size={14} className="text-tron-cyan shrink-0 mt-0.5" />
                        )}

                        <div className="min-w-0 flex-1">
                            <p className="text-[10px] uppercase font-bold text-tron-muted leading-none mb-1">Provisioned Product</p>
                            {device.productMetadata ? (
                                <>
                                    <p className="text-xs font-bold text-white leading-tight truncate" title={device.productMetadata.name}>
                                        {device.productMetadata.name}
                                    </p>
                                    <p className="text-[10px] font-mono text-tron-cyan opacity-80">
                                        {device.productMetadata.productCode}
                                    </p>
                                </>
                            ) : (
                                <p className="text-xs font-mono text-tron-cyan truncate" title={device.provisionedDppUrl}>
                                    {device.provisionedDppUrl}
                                </p>
                            )}
                        </div>
                    </div>
                )}



                <div className="space-y-2 pt-2 mt-4 border-t border-white/5">
                    <div className="flex gap-2">
                        <Button
                            variant={device.activeMode === 'read' ? 'primary' : 'secondary'}
                            className={cn(
                                "flex-1 text-xs py-2 transition-colors flex items-center justify-center gap-2", 
                                device.activeMode === 'read' ? "bg-tron-cyan text-black border-tron-cyan" : "text-tron-cyan border-tron-cyan/30"
                            )}
                            onClick={(e) => { e.stopPropagation(); handleSetMode(device.activeMode === 'read' ? 'idle' : 'read'); }}
                            disabled={status !== 'connected'}
                        >
                            <Activity size={14} />
                            {device.activeMode === 'read' ? 'STOP READER' : 'RFID SCANNER LOGS'}
                        </Button>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant={pingStatus === 'timeout' ? 'danger' : 'secondary'}
                            className="flex-1 text-xs py-1.5 opacity-70 hover:opacity-100"
                            onClick={clickPing}
                            isLoading={isPinging}
                            disabled={status !== 'connected'}
                        >
                            {pingStatus === 'timeout' ? 'TIMEOUT' : 'PING'}
                        </Button>
                        <DeleteButton onDelete={() => removeDevice(device.serialNumber)} />
                    </div>
                </div>
            </Card>
        </>
    );
};

const DeleteButton: React.FC<{ onDelete: () => void }> = ({ onDelete }) => {
    const [confirming, setConfirming] = useState(false);

    useEffect(() => {
        if (confirming) {
            const timer = setTimeout(() => setConfirming(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [confirming]);

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                if (confirming) {
                    onDelete();
                    setConfirming(false);
                } else {
                    setConfirming(true);
                }
            }}
            className={cn(
                "p-2 transition-all duration-300 rounded-lg",
                confirming
                    ? "text-black bg-tron-error hover:bg-red-500 w-24 text-center"
                    : "text-tron-muted hover:text-tron-error hover:bg-tron-error/10"
            )}
            title="Forget Device"
        >
            {confirming ? (
                <span className="text-[10px] font-bold font-orbitron">CONFIRM?</span>
            ) : (
                <Trash2 size={16} />
            )}
        </button>
    );
};



