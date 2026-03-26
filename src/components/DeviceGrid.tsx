import { useState } from 'react';
import { useDevices } from '../store/DeviceContext';
import { Input } from './UIComponents';
import { DeviceCard } from './DeviceCard';

interface DeviceGridProps {
    onDeviceClick?: (serialNumber: string) => void;
}

export const DeviceGrid: React.FC<DeviceGridProps> = ({ onDeviceClick }) => {
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
                    CONNECTED DEVICES
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
                    <DeviceCard 
                        key={device.serialNumber} 
                        device={device} 
                        onClick={onDeviceClick ? () => onDeviceClick(device.serialNumber) : undefined} 
                    />
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

