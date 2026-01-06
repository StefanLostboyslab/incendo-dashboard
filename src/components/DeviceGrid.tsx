import React, { useState } from 'react';
import { useDevices } from '../store/DeviceContext';
import { Card, StatusBadge, Button, Input } from './UIComponents';
import { Monitor, Wifi, MapPin } from 'lucide-react';

export const DeviceGrid: React.FC = () => {
    const { devices } = useDevices();
    const [filter, setFilter] = useState('');

    const filteredDevices = devices.filter(d =>
        d.name.toLowerCase().includes(filter.toLowerCase()) ||
        d.location.toLowerCase().includes(filter.toLowerCase()) ||
        d.serialNumber.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-orbitron font-bold text-white tracking-widest">
                    CONNECTED UNITS
                    <span className="ml-3 text-sm text-tron-cyan opacity-80 font-mono">[{devices.length}]</span>
                </h2>
                <div className="w-64">
                    <Input
                        placeholder="SEARCH ID / LOCATION..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        className="bg-black/60"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredDevices.map(device => (
                    <Card key={device.serialNumber} className="hover:border-tron-cyan/50 transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-tron-cyan/5 border border-tron-cyan/20">
                                    <Monitor className="text-tron-cyan" size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-lg leading-none">{device.name}</h4>
                                    <span className="text-xs font-mono text-tron-muted">{device.serialNumber}</span>
                                </div>
                            </div>
                            <StatusBadge status={device.status} />
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-sm text-tron-muted">
                                <MapPin size={14} />
                                <span>{device.location}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-tron-muted">
                                <Wifi size={14} />
                                <span>{device.ipAddress || 'Unknown IP'}</span>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-auto">
                            <Button variant="secondary" className="flex-1 text-xs py-2">PING</Button>
                            <Button variant="primary" className="flex-1 text-xs py-2">CONTROL</Button>
                        </div>
                    </Card>
                ))}

                {filteredDevices.length === 0 && (
                    <div className="col-span-full py-12 text-center text-tron-muted border border-dashed border-tron-border rounded-xl">
                        No devices found matching your criteria.
                    </div>
                )}
            </div>
        </div>
    );
};
