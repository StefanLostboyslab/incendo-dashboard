import React, { useState, useEffect } from 'react';
import { Card, StatusBadge, Button, Input } from './UIComponents';
import { Monitor, Wifi, MapPin, Trash2, Activity, Pencil, X, Save } from 'lucide-react';
import { useDevices } from '../store/DeviceContext';
import { useMQTT } from '../store/MQTTContext';
import { cn } from '../lib/utils';
import type { Device } from '../store/types';

interface DeviceCardProps {
    device: Device;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({ device }) => {
    const { removeDevice, updateDeviceDetails } = useDevices();
    const { publish, subscribe, unsubscribe, lastMessage, status } = useMQTT();

    const [isPinging, setIsPinging] = useState(false);
    const [latency, setLatency] = useState<number | null>(null);
    const [pingStatus, setPingStatus] = useState<'idle' | 'success' | 'timeout'>('idle');
    const [showEditModal, setShowEditModal] = useState(false);

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

    const displayName = device.customName || device.name;
    const displayLocation = device.customLocation || device.location;

    return (
        <>
            <Card className="hover:border-tron-cyan/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-tron-cyan/5 border border-tron-cyan/20">
                            <Monitor className="text-tron-cyan" size={20} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-lg leading-none">{displayName}</h4>
                                <button
                                    onClick={() => setShowEditModal(true)}
                                    className="text-tron-muted hover:text-tron-cyan transition-colors p-1"
                                    title="Edit Device Details"
                                    data-testid="edit-device-btn"
                                >
                                    <Pencil size={14} />
                                </button>
                            </div>
                            <span className="text-xs font-mono text-tron-muted">{device.serialNumber}</span>
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
                        <span>{device.ipAddress || 'Unknown IP'}</span>
                    </div>
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

                <div className="flex gap-2 pt-2">
                    <Button
                        variant={pingStatus === 'timeout' ? 'danger' : 'secondary'}
                        className="flex-1 text-xs py-2"
                        onClick={clickPing}
                        isLoading={isPinging}
                        disabled={status !== 'connected'}
                    >
                        {pingStatus === 'timeout' ? 'TIMEOUT' : 'PING'}
                    </Button>
                    <Button variant="primary" className="flex-1 text-xs py-2">CONTROL</Button>

                    <DeleteButton onDelete={() => removeDevice(device.serialNumber)} />
                </div >
            </Card >

            {showEditModal && (
                <EditDeviceModal
                    device={device}
                    onClose={() => setShowEditModal(false)}
                    onSave={(details) => {
                        updateDeviceDetails(device.serialNumber, details);
                        setShowEditModal(false);
                    }}
                />
            )}
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

// Edit Modal Component
const EditDeviceModal: React.FC<{
    device: Device;
    onClose: () => void;
    onSave: (details: Partial<Device>) => void
}> = ({ device, onClose, onSave }) => {
    const [name, setName] = useState(device.customName || device.name);
    const [location, setLocation] = useState(device.customLocation || device.location);

    // EPCIS Fields
    const [gln, setGln] = useState(device.epcis?.gln || '');
    const [sgtin, setSgtin] = useState(device.epcis?.sgtin || '');
    const [readPoint, setReadPoint] = useState(device.epcis?.readPoint || '');
    const [bizLocation, setBizLocation] = useState(device.epcis?.bizLocation || '');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#0a0f18] border border-tron-cyan/30 rounded-xl w-full max-w-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h2 className="text-xl font-orbitron font-bold text-white tracking-widest flex items-center gap-2">
                        <Pencil className="text-tron-cyan" size={20} />
                        EDIT DEVICE
                    </h2>
                    <button onClick={onClose} className="text-tron-muted hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto">
                    {/* General Settings */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider">General Information</h3>
                        <Input
                            label="Device Name (Alias)"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Living Room Node"
                        />
                        <Input
                            label="Location"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="e.g. First Floor / Kitchen"
                        />
                    </div>

                    {/* EPCIS Settings */}
                    <div className="space-y-4 pt-4 border-t border-white/5">
                        <h3 className="text-sm font-bold text-tron-cyan/90 uppercase tracking-wider flex items-center gap-2">
                            <Activity size={14} />
                            EPCIS Configuration
                        </h3>
                        <p className="text-xs text-tron-muted">
                            Configure GS1/EPCIS identification keys for supply chain integration.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-tron-muted tracking-wider">GLN / Geo URI</label>
                                <Input
                                    value={gln}
                                    onChange={e => setGln(e.target.value)}
                                    placeholder="geo:55.60587,13.00073"
                                    className="font-mono text-xs"
                                />
                                <p className="text-[10px] text-tron-muted/70 italic flex items-center gap-1">
                                    <span className="text-tron-cyan font-bold">Format:</span> geo:latitude,longitude
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-tron-muted tracking-wider">Business Location ID</label>
                                <Input
                                    value={bizLocation}
                                    onChange={e => setBizLocation(e.target.value)}
                                    placeholder="whattio:bizloc:Vellinge"
                                    className="font-mono text-xs"
                                />
                                <p className="text-[10px] text-tron-muted/70 italic flex items-center gap-1">
                                    <span className="text-tron-cyan font-bold">Format:</span> whattio:bizloc:CityName
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-tron-muted tracking-wider">Read Point ID</label>
                                <Input
                                    value={readPoint}
                                    onChange={e => setReadPoint(e.target.value)}
                                    placeholder="whattio:readpoint:bjarred/motorcourt"
                                    className="font-mono text-xs"
                                />
                                <p className="text-[10px] text-tron-muted/70 italic flex items-center gap-1">
                                    <span className="text-tron-cyan font-bold">Format:</span> whattio:readpoint:City/Zone
                                </p>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] uppercase font-bold text-tron-muted tracking-wider">Product DPP URL (SGTIN)</label>
                                <Input
                                    value={sgtin}
                                    onChange={e => setSgtin(e.target.value)}
                                    placeholder="https://whatt.io/2095/04:12..."
                                    className="font-mono text-xs"
                                />
                                <p className="text-[10px] text-tron-muted/70 italic flex items-center gap-1">
                                    <span className="text-tron-cyan font-bold">Format:</span> https://whatt.io/PrdID/DevID
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 flex gap-3 justify-end bg-black/20 rounded-b-xl">
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={() => onSave({
                            customName: name,
                            customLocation: location,
                            epcis: { gln, sgtin, readPoint, bizLocation }
                        })}
                    >
                        <Save size={16} className="mr-2" />
                        Save Changes
                    </Button>
                </div>
            </div>
        </div>
    );
};
