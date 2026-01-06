import React, { useState } from 'react';
import type { Device } from '../store/types';
import { useDevices } from '../store/DeviceContext';
import { Input, Button } from './UIComponents';
import { X } from 'lucide-react';

interface AddDeviceModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddDeviceModal: React.FC<AddDeviceModalProps> = ({ isOpen, onClose }) => {
    const { addDevice } = useDevices();
    const [formData, setFormData] = useState<Partial<Device>>({
        name: '',
        serialNumber: '',
        deviceType: 'Arduino R4 WiFi',
        location: '',
        ipAddress: '',
    });

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name && formData.serialNumber && formData.location) {
            addDevice({
                ...formData as Device,
                status: 'offline', // Default status
            });
            onClose();
            setFormData({ name: '', serialNumber: '', deviceType: 'Arduino R4 WiFi', location: '', ipAddress: '' });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="tron-panel w-full max-w-md p-6 relative animate-in fade-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-tron-muted hover:text-tron-cyan transition-colors"
                >
                    <X size={20} />
                </button>

                <h2 className="text-xl font-orbitron font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-6 bg-tron-cyan shadow-neon-cyan" />
                    ADD NEW DEVICE
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                        label="Device Name *"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        required
                        placeholder="e.g. Line 1 Controller"
                    />

                    <Input
                        label="Serial Number (ID) *"
                        value={formData.serialNumber}
                        onChange={e => setFormData({ ...formData, serialNumber: e.target.value })}
                        required
                        placeholder="e.g. SN-883920"
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <Input
                            label="Location *"
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            required
                            placeholder="e.g. Warehouse A"
                        />
                        <Input
                            label="Device Type"
                            value={formData.deviceType}
                            onChange={e => setFormData({ ...formData, deviceType: e.target.value })}
                            placeholder="Arduino R4 WiFi"
                        />
                    </div>

                    <Input
                        label="IP Address (Optional)"
                        value={formData.ipAddress}
                        onChange={e => setFormData({ ...formData, ipAddress: e.target.value })}
                        placeholder="192.168.1.x"
                    />

                    <div className="pt-4 flex gap-3">
                        <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                            CANCEL
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1">
                            CREATE DEVICE
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};
