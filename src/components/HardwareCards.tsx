import React, { useState } from 'react';
import { useMQTT } from '../store/MQTTContext';
import { Card, Button, Input } from './UIComponents';
import { Database, Link as LinkIcon, Zap, CloudFog, Thermometer, Droplets } from 'lucide-react';

export const St25dvCard: React.FC<{ targetSerial: string }> = ({ targetSerial }) => {
    const { publish, status } = useMQTT();
    const [dppUrl, setDppUrl] = useState('');
    const [isSending, setIsSending] = useState(false);

    const handleSendToEeprom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dppUrl || !targetSerial) return;

        setIsSending(true);
        // We publish the URL to a specific EEPROM topic, or reuse the dpp_url topic.
        // Assuming custom topic for now, but can be configured later.
        publish(`incendo/dpp_url/${targetSerial}/eeprom`, dppUrl);

        // Simulate network delay for effect
        await new Promise(resolve => setTimeout(resolve, 800));
        setIsSending(false);
    };

    return (
        <Card className="border-tron-cyan/50 shadow-neon-cyan/20 p-5 bg-black/40">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2 mb-4">
                <Database size={16} className="text-tron-cyan" /> ST25DV16 EEPROM
            </h3>

            <div className="bg-black/40 p-3 rounded-lg border border-tron-cyan/10 mb-6">
                <p className="text-[10px] text-tron-muted font-mono leading-relaxed">
                    Write a DPP URL directly to the ST25DV16 dual-interface EEPROM. This will allow the board to simulate an NFC tag over its I2C connection.
                </p>
            </div>

            <form onSubmit={handleSendToEeprom} className="space-y-6">
                <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-tron-cyan">
                            <LinkIcon size={16} />
                            <span className="font-bold font-orbitron text-sm">TARGET DPP URL</span>
                        </div>
                    </div>
                    <Input
                        placeholder="https://whatt.io/device-..."
                        value={dppUrl}
                        onChange={(e: any) => setDppUrl(e.target.value)}
                        required={true}
                    />
                    <p className="text-xs text-tron-muted font-mono">*URL to be written to EEPROM</p>
                </div>

                <div className="pt-4 border-t border-tron-border/30">
                    <Button
                        type="submit"
                        variant="primary"
                        className="w-full flex justify-between items-center group"
                        disabled={status !== 'connected' || isSending || !targetSerial}
                        isLoading={isSending}
                    >
                        <span>WRITE TO EEPROM</span>
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


export const Scd30Card: React.FC<{ targetSerial: string }> = () => {
    // These values would normally be fetched from the device via MQTT state or Context
    // For now we will mock them for the purpose of the UI template based on the requirements.
    const co2 = 400; // ppm
    const temp = 22.5; // °C
    const humidity = 45; // %

    return (
        <Card className="border-tron-cyan/50 shadow-neon-cyan/20 p-5 bg-black/40">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2 mb-4">
                <CloudFog size={16} className="text-tron-cyan" /> SCD-30 SENSOR DATA
            </h3>

            <div className="bg-black/40 p-3 rounded-lg border border-tron-cyan/10 mb-6">
                 <p className="text-[10px] text-tron-muted font-mono leading-relaxed mb-4">
                    Live environmental telemetry streamed from the SCD-30 / SCD-40 module.
                </p>

                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-tron-cyan/5 border border-tron-cyan/20 rounded p-3 flex flex-col items-center justify-center">
                        <CloudFog size={20} className="text-tron-cyan mb-2" />
                        <div className="text-lg font-bold text-white font-mono">{co2 ?? '--'}</div>
                        <div className="text-[9px] text-tron-cyan/60 uppercase tracking-wider">CO2 ppm</div>
                    </div>
                    <div className="bg-tron-cyan/5 border border-tron-cyan/20 rounded p-3 flex flex-col items-center justify-center">
                        <Thermometer size={20} className="text-tron-cyan mb-2" />
                        <div className="text-lg font-bold text-white font-mono">{temp ? temp.toFixed(1) : '--'}</div>
                        <div className="text-[9px] text-tron-cyan/60 uppercase tracking-wider">Temp °C</div>
                    </div>
                    <div className="bg-tron-cyan/5 border border-tron-cyan/20 rounded p-3 flex flex-col items-center justify-center">
                        <Droplets size={20} className="text-tron-cyan mb-2" />
                        <div className="text-lg font-bold text-white font-mono">{humidity ? humidity.toFixed(0) : '--'}</div>
                        <div className="text-[9px] text-tron-cyan/60 uppercase tracking-wider">Humidity %</div>
                    </div>
                </div>
            </div>
        </Card>
    );
};
