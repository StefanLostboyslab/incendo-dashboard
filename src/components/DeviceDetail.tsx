import React, { useState } from 'react';
import { useDevices } from '../store/DeviceContext';
import { useMQTT } from '../store/MQTTContext';
import { ArrowLeft, Monitor, Trash2, Pencil, Activity, MapPin, Cpu, Bot, Copy, Check, LayoutTemplate, Download } from 'lucide-react';
import { DppWidget } from './DppWidget';
import { CommandPanel } from './CommandPanel';
import { St25dvCard, Scd30Card } from './HardwareCards';
import { Button, Input, StatusBadge } from './UIComponents';
import { fetchWhattProduct } from '../lib/whatt';
import { useEffect } from 'react';

const LatestReadCard = ({ event, onClone, onProductLoaded }: { event: any, onClone: (url: string) => void, onProductLoaded: (product: any) => void }) => {
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (event?.dpp_url) {
            setLoading(true);
            let safeUrl = event.dpp_url;
            if (safeUrl.endsWith('#')) safeUrl = safeUrl.slice(0, -1);
            
            let fetchUrl = safeUrl;
            const parts = fetchUrl.split('/');
            if (fetchUrl.includes('whatt.io/') && parts.length > 4) {
                parts.pop();
                fetchUrl = parts.join('/');
            }
            
            fetchWhattProduct(fetchUrl)
                .then(data => {
                    setProduct(data);
                    if (data) onProductLoaded(data);
                })
                .catch(() => setProduct(null))
                .finally(() => setLoading(false));
        } else {
            setProduct(null);
        }
    }, [event?.dpp_url, event?.timestamp, onProductLoaded]);

    if (!event) return null;

    return (
        <div className="tron-panel p-5 border-tron-cyan/30 bg-black/40 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-tron-cyan/0 via-tron-cyan to-tron-cyan/0 opacity-50" />
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2 mb-4">
               <Activity size={16} className="text-tron-cyan animate-pulse" /> Latest Scan
            </h3>
            
            {loading ? (
                <div className="flex justify-center py-6 text-tron-cyan/50"><Activity className="animate-spin" /></div>
            ) : product ? (
                <div className="space-y-4">
                    <div className="flex gap-4 items-start">
                        {product.main_image ? (
                           <img src={product.main_image} alt={product.name} className="w-16 h-16 rounded object-cover border border-tron-cyan/30 bg-black/50" />
                        ) : (
                           <div className="w-16 h-16 rounded border border-tron-cyan/30 bg-black/50 flex items-center justify-center text-tron-cyan/30">
                               <MapPin size={24} />
                           </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <h4 className="text-white font-bold truncate text-sm">{product.name}</h4>
                            <div className="text-[10px] text-tron-cyan font-mono uppercase tracking-wider mb-1 flex items-center gap-2 mt-1">
                                <span className="bg-tron-cyan/10 px-1.5 py-0.5 rounded border border-tron-cyan/20">{product.team || 'whatt.io'}</span>
                                <span className="text-tron-muted truncate">{product.category || 'Product'}</span>
                            </div>
                            <p className="text-[10px] text-tron-muted font-mono truncate mt-1" title={event.dpp_url}>{event.dpp_url}</p>
                        </div>
                    </div>
                    
                    <Button 
                        type="button"
                        variant="primary" 
                        title="Copy this product's base URL into your Configurator to flash copies to new tags."
                        className="w-full text-xs py-2 bg-tron-cyan/10 hover:bg-tron-cyan/20 border-tron-cyan/40"
                        onClick={() => {
                            let url = event.dpp_url;
                            const parts = url.split('/');
                            if (parts.length > 4 && url.includes('whatt.io/')) {
                                // Peel off the UID to retain just the model URL!
                                parts.pop();
                                url = parts.join('/');
                            }
                            onClone(url);
                        }}
                    >
                        <Copy size={14} className="mr-2" /> CLONE TO PROVISIONER
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="text-sm text-tron-cyan font-bold truncate">
                        {event.dpp_url ? event.dpp_url.replace(/#$/, '') : 'Unknown Payload'}
                    </div>
                    <p className="text-[10px] text-tron-muted font-mono truncate">UID: {event.uid}</p>
                    {event.dpp_url && (
                        <Button 
                            type="button"
                            variant="primary" 
                            className="w-full text-xs py-2 bg-tron-cyan/10 hover:bg-tron-cyan/20 border-tron-cyan/40"
                            onClick={() => onClone(event.dpp_url)}
                        >
                            <Copy size={14} className="mr-2" /> CLONE URL
                        </Button>
                    )}
                </div>
            )}
        </div>
    );
};

interface DeviceDetailProps {
    serialNumber: string;
    onBack: () => void;
}

export const DeviceDetail: React.FC<DeviceDetailProps> = ({ serialNumber, onBack }) => {
    const { devices, removeDevice, updateDeviceDetails } = useDevices();
    const { publish } = useMQTT();
    const device = devices.find((d: any) => d.serialNumber === serialNumber);

    const [isEditing, setIsEditing] = useState(false);
    
    // EPCIS Edit states
    const [location, setLocation] = useState(device?.customLocation || device?.location || '');
    const [gln, setGln] = useState(() => {
        if (device?.epcis?.gln) return device.epcis.gln;
        return localStorage.getItem('incendo_last_gln') || '';
    });
    const sgtin = device?.epcis?.sgtin;
    
    // Friendly Readpoint Naming
    const [readPointFriendly, setReadPointFriendly] = useState(() => {
        if (!device?.epcis?.readPoint) return '';
        const parts = device.epcis.readPoint.split('whattio:readpoint:');
        if (parts.length > 1) {
            const subParts = parts[1].split('/');
            return subParts.length > 1 ? subParts[1] : subParts[0];
        }
        return device.epcis.readPoint;
    });
    
    const [deviceType, setDeviceType] = useState(device?.epcis?.deviceType || 'whatt.io incendo NFC');

    useEffect(() => {
        setLocation(device?.customLocation || device?.location || '');
        if (device?.epcis?.gln) setGln(device.epcis.gln);
        setDeviceType(device?.epcis?.deviceType || 'whatt.io incendo NFC');
        
        if (device?.epcis?.readPoint) {
            const parts = device.epcis.readPoint.split('whattio:readpoint:');
            if (parts.length > 1) {
                const subParts = parts[1].split('/');
                setReadPointFriendly(subParts.length > 1 ? subParts[1] : subParts[0]);
            } else {
                setReadPointFriendly(device.epcis.readPoint);
            }
        } else {
            setReadPointFriendly('');
        }
    }, [device?.serialNumber]);

    // Hardware Config States
    const [hwMotherboard, setHwMotherboard] = useState<string>(device?.hardwareModules?.motherboard || 'r2');
    const [hwDisplay, setHwDisplay] = useState<string>(device?.hardwareModules?.display || 'none');
    const [hwPn532, setHwPn532] = useState(device?.hardwareModules?.pn532 || false);
    const [hwSt25dv, setHwSt25dv] = useState(device?.hardwareModules?.st25dv || false);
    const [hwScd30, setHwScd30] = useState(device?.hardwareModules?.scd30 || false);
    const [hwQrReader, setHwQrReader] = useState(device?.hardwareModules?.qrReader || false);
    const [hwDfRobotRgb, setHwDfRobotRgb] = useState(device?.hardwareModules?.dfRobotRgb || false);
    const [hwElektrokitMosfet, setHwElektrokitMosfet] = useState(device?.hardwareModules?.elektrokitMosfet || false);
    
    // Hardware URL Map
    const DEFAULT_HW_URLS: Record<string, string> = {
        r4: "https://whatt.io/arduino-uno-r4-wifi-2766",
        pn532: "https://whatt.io/wireless-nfcrfid-pn532-reader--2767",
        st25dv: "https://whatt.io/adafruit-qt-py---sam-d21-d--2768"
    };

    const [hwUrls, setHwUrls] = useState<Record<string, string>>(() => {
        const savedGlobalHwUrls = localStorage.getItem('incendo_fallback_hwUrls');
        const globalUrls = savedGlobalHwUrls ? JSON.parse(savedGlobalHwUrls) : {};
        // Merge defaults, then global memory, then explicit device memory (highest priority)
        return { ...DEFAULT_HW_URLS, ...globalUrls, ...(device?.hardwareModuleUrls || {}) };
    });

    React.useEffect(() => {
        if (isEditing && Object.keys(hwUrls).length > 0) {
            localStorage.setItem('incendo_fallback_hwUrls', JSON.stringify(hwUrls));
        }
    }, [hwUrls, isEditing]);

    // OTA State
    const [otaUrl, setOtaUrl] = useState(device?.ipAddress ? `http://${device.ipAddress}/update` : '');
    const [copiedPrompt, setCopiedPrompt] = useState(false);

    if (!device) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-tron-muted">
                <p>Device not found.</p>
                <Button onClick={onBack} className="mt-4">Back to Fleet</Button>
            </div>
        );
    }

    const displayName = device.epcis?.readPoint ? device.epcis.readPoint.split(':').pop() : device.name || device.serialNumber;

    const handleLocateTarget = () => {
        if (!window.isSecureContext) {
            alert("Browser Security Block: Automatic GPS fetching requires an HTTPS connection or 'localhost'. Please manually enter your coordinates (e.g., from Google Maps) since you are accessing via a local IP address.");
            return;
        }

        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition((position) => {
                const newGeo = `geo:${position.coords.latitude.toFixed(6)},${position.coords.longitude.toFixed(6)}`;
                setGln(newGeo);
                localStorage.setItem('incendo_last_gln', newGeo);
            }, (error) => {
                console.error("Error securing geolocation:", error);
                alert("Could not fetch location. Please ensure location permissions are granted for this site in your browser settings.");
            });
        } else {
            alert("Geolocation is not supported by your browser.");
        }
    };

    const handleSaveConfig = () => {
        if (gln) {
            localStorage.setItem('incendo_last_gln', gln);
        }

        let globalBizLocation = '';
        try {
            const savedEpcis = localStorage.getItem('incendo_global_epcis');
            if (savedEpcis) {
                globalBizLocation = JSON.parse(savedEpcis).bizLocation || '';
            }
        } catch (e) {
            console.error("Error reading global EPCIS config", e);
        }

        const formattedBizLocation = globalBizLocation ? globalBizLocation.toLowerCase().replace(/\s+/g, '-') : 'local';
        const formattedFriendly = readPointFriendly ? readPointFriendly.toLowerCase().replace(/\s+/g, '') : 'unnamed';
        const fullReadPointURI = readPointFriendly ? `whattio:readpoint:${formattedBizLocation}/${formattedFriendly}` : undefined;

        const newEpcis = { gln, sgtin, readPoint: fullReadPointURI, bizLocation: globalBizLocation, deviceType };
        
        const hwConfig: any = {
            motherboard: hwMotherboard,
            display: hwDisplay,
            pn532: hwPn532,
            st25dv: hwSt25dv,
            scd30: hwScd30,
            qrReader: hwQrReader,
            dfRobotRgb: hwDfRobotRgb,
            elektrokitMosfet: hwElektrokitMosfet
        };

        updateDeviceDetails(serialNumber, {
            customName: readPointFriendly,
            customLocation: location,
            epcis: newEpcis,
            hardwareModules: hwConfig,
            hardwareModuleUrls: hwUrls
        });
        
        const payload = JSON.stringify({
            readPoint: fullReadPointURI,
            bizLocation: globalBizLocation,
            deviceType: deviceType,
            sgtin: sgtin,
            hardwareModules: hwConfig,
            hardwareModuleUrls: hwUrls
        });
        publish(`incendo/devices/${serialNumber}/config`, payload, { retain: true });
        setIsEditing(false);
    };

    const handlePushOTA = () => {
        if (!otaUrl) return;
        if (confirm(`Are you sure you want to flash the firmware at:\n${otaUrl}\n\nThis will instantly reboot the board.`)) {
            publish(`incendo/devices/${serialNumber}/update`, JSON.stringify({ url: otaUrl }));
            alert("OTA Trigger dispatched to the target board!");
            setOtaUrl('');
        }
    };

    const handleDelete = () => {
        if(confirm("Are you sure you want to forget this device?")) {
            removeDevice(serialNumber);
            onBack();
        }
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-tron-border/30 pb-6 mb-6">
                <div className="flex gap-4">
                    <button 
                        onClick={onBack}
                        className="p-2 text-tron-muted hover:text-tron-cyan hover:bg-tron-cyan/10 rounded-lg transition-colors mt-1"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl font-orbitron font-bold text-white mb-1 flex items-center gap-3">
                            <Monitor className="text-tron-cyan" size={32} />
                            {displayName}
                            <StatusBadge status={device.status} />
                        </h1>
                        <p className="text-tron-cyan/70 font-mono text-sm tracking-widest uppercase">
                            {device.serialNumber} • MAC: {device.macAddress || 'N/A'} • {location || device.location}
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <Button variant={isEditing ? 'primary' : 'secondary'} onClick={() => setIsEditing(!isEditing)}>
                        <Pencil size={16} className="mr-2" />
                        {isEditing ? 'Cancel Edit' : 'Edit Config'}
                    </Button>
                    {!isEditing && (
                        <Button 
                            variant="secondary" 
                            className="hidden sm:flex border-tron-cyan/30 text-tron-cyan hover:bg-tron-cyan/10"
                            onClick={() => {
                                const payload = { date_exported: new Date().toISOString(), ...device };
                                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `incendo_${device.serialNumber}_profile.json`;
                                a.click();
                            }}
                        >
                            <Download size={16} className="mr-2" />
                            Export Profile
                        </Button>
                    )}
                    <Button variant="secondary" className="border-tron-error/50 text-tron-error hover:bg-tron-error/10" onClick={handleDelete}>
                        <Trash2 size={16} className="mr-2" />
                        Forget
                    </Button>
                </div>
            </div>

            <div className={`flex-1 overflow-auto grid grid-cols-1 ${isEditing ? 'lg:grid-cols-1' : 'xl:grid-cols-2'} gap-6 pr-2 pb-6`}>
                
                {/* Left Column: Config Panel if Editing, otherwise Hardware Profile */}
                <div className={`${isEditing ? '' : ''} space-y-6`}>
                    {isEditing ? (
                        <div className="tron-panel p-6 space-y-8 animate-in fade-in">
                            <h2 className="text-xl font-orbitron font-bold text-white tracking-widest flex items-center gap-2 mb-6 uppercase">
                                <Activity className="text-tron-cyan" size={20} />
                                INCENDO CONFIGURATION
                            </h2>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input label="Device Location (Physical)" value={location} onChange={(e: any) => setLocation(e.target.value)} placeholder="e.g. First Floor Turnstile" />
                                
                                <div className="space-y-1">
                                    <Input label="Read Point ID" value={readPointFriendly} onChange={(e: any) => setReadPointFriendly(e.target.value)} placeholder="e.g. Turnstile-A" />
                                    <p className="text-[9px] font-mono text-tron-cyan/70 leading-tight pt-1">
                                        *GS1 EPCIS 2.0: Unique ID for this specific scanner. Will be automatically prefixed with your Global Business Location.
                                    </p>
                                </div>
                                
                                <div className="md:col-span-2 mt-2 p-3 bg-tron-cyan/5 border border-tron-cyan/20 rounded-md">
                                    <p className="text-[10px] uppercase font-bold text-tron-cyan mb-1 flex items-center gap-2">
                                        <Activity size={10} /> GS1 BUSINESS LOCATION (Inherited from Settings)
                                    </p>
                                    <p className="text-xs font-mono text-white">
                                        {(() => {
                                            try {
                                                const saved = localStorage.getItem('incendo_global_epcis');
                                                if (saved) return JSON.parse(saved).bizLocation || 'whattio:bizloc:unconfigured';
                                            } catch (e) {}
                                            return 'whattio:bizloc:unconfigured';
                                        })()}
                                    </p>
                                    <p className="text-[9px] font-mono text-tron-muted mt-1 leading-tight">
                                        Per EPCIS 2.0, the Business Location (e.g. the entire facility) is applied globally to all scanners from the Main Settings panel.
                                    </p>
                                </div>
                                
                                <div className="flex items-end gap-2 mt-2">
                                    <div className="flex-1">
                                        <Input label="GLN / Geo Coordinates" value={gln} onChange={(e: any) => setGln(e.target.value)} placeholder="geo:0.0,0.0" />
                                    </div>
                                    <Button onClick={handleLocateTarget} variant="secondary" className="mb-px px-3 py-2.5 border-tron-cyan/50 hover:bg-tron-cyan/20 h-[42px]" title="Fetch current coordinates">
                                        <MapPin size={20} className="text-tron-cyan" />
                                    </Button>
                                </div>

                                <div className="md:col-span-2">
                                    <Input label="Device Type" value={deviceType} onChange={(e: any) => setDeviceType(e.target.value)} />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-tron-border/30">
                                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Cpu size={16} className="text-tron-cyan" /> Main Components
                                </h3>
                                <label className="text-[10px] font-bold text-tron-cyan/70 uppercase tracking-wider block mb-2">Target Hardware Constraint</label>
                                <div className="grid grid-cols-2 lg:grid-cols-2 gap-3 mb-6">
                                    <DppWidget title="Arduino UNO R4 WiFi" dppUrl={hwUrls['r4'] || "https://whatt.io/arduino-uno-r4-wifi-2766"} onUrlChange={(u: any) => setHwUrls({...hwUrls, r4: u})} isActive={hwMotherboard === 'r4'} onToggle={() => setHwMotherboard('r4')} type="radio" />
                                    <DppWidget title="Arduino UNO R2 WiFi" dppUrl={hwUrls['r2']} onUrlChange={(u: any) => setHwUrls({...hwUrls, r2: u})} isActive={hwMotherboard === 'r2'} onToggle={() => setHwMotherboard('r2')} type="radio" />
                                </div>

                                <label className="text-[10px] font-bold text-tron-cyan/70 uppercase tracking-wider block mb-2">Display Module</label>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                                    <DppWidget title="ST7789 TFT" dppUrl={hwUrls['st7789']} onUrlChange={(u: any) => setHwUrls({...hwUrls, st7789: u})} isActive={hwDisplay === 'st7789'} onToggle={() => setHwDisplay('st7789')} type="radio" />
                                    <DppWidget title="ST7735 TFT" dppUrl={hwUrls['st7735']} onUrlChange={(u: any) => setHwUrls({...hwUrls, st7735: u})} isActive={hwDisplay === 'st7735'} onToggle={() => setHwDisplay('st7735')} type="radio" />
                                    <DppWidget title="SSD1306 OLED" dppUrl={hwUrls['oled1306']} onUrlChange={(u: any) => setHwUrls({...hwUrls, oled1306: u})} isActive={hwDisplay === 'oled1306'} onToggle={() => setHwDisplay('oled1306')} type="radio" />
                                    <DppWidget title="None" dppUrl={hwUrls['none']} onUrlChange={(u: any) => setHwUrls({...hwUrls, none: u})} isActive={hwDisplay === 'none'} onToggle={() => setHwDisplay('none')} type="radio" />
                                </div>

                                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4 mt-8 flex items-center gap-2">
                                    <Cpu size={16} className="text-tron-cyan" /> Attached I2C Hardware Modules
                                </h3>
                                <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                                    <DppWidget title="PN532 Red NFC" dppUrl={hwUrls['pn532'] || "https://whatt.io/wireless-nfcrfid-pn532-reader--2767"} onUrlChange={(u: any) => setHwUrls({...hwUrls, pn532: u})} isActive={hwPn532} onToggle={() => setHwPn532(!hwPn532)} type="checkbox" />
                                    <DppWidget title="ST25DV16 EEPROM" dppUrl={hwUrls['st25dv'] || "https://whatt.io/adafruit-qt-py---sam-d21-d--2768"} onUrlChange={(u: any) => setHwUrls({...hwUrls, st25dv: u})} isActive={hwSt25dv} onToggle={() => setHwSt25dv(!hwSt25dv)} type="checkbox" />
                                    <DppWidget title="SCD-30 CO2/Temp" dppUrl={hwUrls['scd30']} onUrlChange={(u: any) => setHwUrls({...hwUrls, scd30: u})} isActive={hwScd30} onToggle={() => setHwScd30(!hwScd30)} type="checkbox" />
                                    <DppWidget title="I2C QR Scanner" dppUrl={hwUrls['qrReader']} onUrlChange={(u: any) => setHwUrls({...hwUrls, qrReader: u})} isActive={hwQrReader} onToggle={() => setHwQrReader(!hwQrReader)} type="checkbox" />
                                    <DppWidget title="DFRobot RGB LED Driver" dppUrl={hwUrls['dfRobotRgb']} onUrlChange={(u: any) => setHwUrls({...hwUrls, dfRobotRgb: u})} isActive={hwDfRobotRgb} onToggle={() => setHwDfRobotRgb(!hwDfRobotRgb)} type="checkbox" />
                                    <DppWidget title="Elektrokit 4-Ch Mosfet" dppUrl={hwUrls['elektrokitMosfet']} onUrlChange={(u: any) => setHwUrls({...hwUrls, elektrokitMosfet: u})} isActive={hwElektrokitMosfet} onToggle={() => setHwElektrokitMosfet(!hwElektrokitMosfet)} type="checkbox" />
                                </div>
                            </div>
                            
                            <div className="pt-6 border-t border-tron-border/30">
                                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Cpu size={16} className="text-tron-cyan" /> Firmware Maintenance
                                </h3>
                                <div className="p-4 bg-tron-cyan/5 border border-tron-cyan/20 rounded-lg space-y-4">
                                    <p className="text-xs font-mono text-tron-muted">
                                        Trigger an Over-The-Air (OTA) update via HTTP. The board will download and flash the .bin payload.
                                    </p>
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-1">
                                            <Input label="Firmware URL (.bin)" value={otaUrl} onChange={(e: any) => setOtaUrl(e.target.value)} placeholder="http://192.168.1.100/firmware.bin" />
                                        </div>
                                        <Button onClick={handlePushOTA} className="mb-px px-6 py-2.5 h-[42px] bg-tron-cyan/20 hover:bg-tron-cyan/40 border-tron-cyan text-tron-cyan uppercase tracking-widest text-[10px] font-bold">
                                            Push OTA
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button onClick={handleSaveConfig} className="bg-tron-cyan text-black hover:bg-white px-8">
                                    SAVE CONFIGURATION TO DEVICE
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6 relative">
                            {/* Device Info Read-only */}
                            <div className="tron-panel p-5 space-y-4 border-tron-cyan/20">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-orbitron font-bold text-white tracking-widest whitespace-pre-wrap break-all">
                                            {device.customName || device.epcis?.readPoint || device.serialNumber || device.name}
                                        </h2>
                                        <div className="text-tron-cyan/60 font-mono text-xs">{device.serialNumber}</div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => setIsEditing(true)} className="px-3 py-1.5 h-auto text-xs font-bold tracking-wider uppercase">
                                            <Pencil size={14} className="mr-1.5 inline" /> EDIT CONFIG
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center gap-3 text-sm text-tron-muted">
                                        <MapPin size={16} className="text-tron-cyan" />
                                        <span>{device.customLocation || device.location || 'Unknown Location'}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-tron-muted">
                                        <Monitor size={16} className="text-tron-cyan" />
                                        <span>{device.deviceType}</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-sm text-tron-muted">
                                        <Cpu size={16} className="text-tron-cyan" />
                                        <span className="font-mono">{device.ipAddress || 'Unknown IP'}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Active Hardware Thumbnails */}
                            <div className="tron-panel p-5 border-tron-cyan/30 bg-black/40">
                                <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <LayoutTemplate size={16} className="text-tron-cyan" /> Active Hardware Profile
                                </h3>
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pointer-events-none">
                                    {device.hardwareModules?.motherboard && (
                                        <div className="scale-90 origin-top transform transition-transform opacity-90">
                                            <DppWidget title={device.hardwareModules.motherboard === 'r4' ? "UNO R4 WiFi" : "UNO WiFi Rev2"} dppUrl={hwUrls[device.hardwareModules.motherboard] || ''} isActive={true} type="checkbox" onToggle={() => {}} />
                                        </div>
                                    )}
                                    {device.hardwareModules?.display && device.hardwareModules.display !== 'none' && (
                                        <div className="scale-90 origin-top transform transition-transform opacity-90">
                                            <DppWidget title={device.hardwareModules.display.toUpperCase()} dppUrl={hwUrls[device.hardwareModules.display] || ''} isActive={true} type="checkbox" onToggle={() => {}} />
                                        </div>
                                    )}
                                    {[
                                        {key: 'pn532', title: 'PN532 NFC'},
                                        {key: 'st25dv', title: 'ST25DV16'},
                                        {key: 'scd30', title: 'SCD-30'},
                                        {key: 'qrReader', title: 'QR Scanner'},
                                        {key: 'dfRobotRgb', title: 'RGB Driver'},
                                        {key: 'elektrokitMosfet', title: 'CH Mosfet'}
                                    ].map(mod => device.hardwareModules?.[mod.key as keyof typeof device.hardwareModules] && (
                                        <div key={mod.key} className="scale-90 origin-top transform transition-transform opacity-90">
                                            <DppWidget title={mod.title} dppUrl={hwUrls[mod.key] || ''} isActive={true} type="checkbox" onToggle={() => {}} />
                                        </div>
                                    ))}
                                </div>
                                {(!device.hardwareModules || Object.keys(device.hardwareModules).length === 0) && (
                                    <p className="text-tron-cyan/40 font-mono italic text-sm text-center py-4">No hardware configured.</p>
                                )}
                            </div>

                            {/* Latest Read Card Spotlight */}
                            {device.nfcHistory && device.nfcHistory.length > 0 && (
                                <LatestReadCard 
                                    event={device.nfcHistory[0]} 
                                    onProductLoaded={(prodData) => {
                                        if (device.productMetadata?.productCode !== prodData.product_number) {
                                            updateDeviceDetails(serialNumber, {
                                                productMetadata: {
                                                    name: prodData.name,
                                                    productCode: prodData.product_number,
                                                    imageUrl: prodData.main_image,
                                                    team: prodData.team,
                                                    category: prodData.category
                                                }
                                            });
                                        }
                                    }}
                                    onClone={(url) => {
                                        let safeUrl = url;
                                        if (safeUrl.endsWith('#')) safeUrl = safeUrl.slice(0, -1);
                                        updateDeviceDetails(serialNumber, { provisionedDppUrl: safeUrl });
                                        alert(`Cloned reference URL: ${safeUrl}\n\nThis target is now pre-staged in your Command Panel! Select 'Unit' to write new tags.`);
                                    }} 
                                />
                            )}

                            {/* AI Prompt Generator */}
                            <div className="tron-panel p-5 border-tron-cyan/30 bg-tron-cyan/5">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
                                        <Bot size={16} className="text-tron-cyan" /> AI Assistant Code Prompt
                                    </h3>
                                    <Button 
                                        variant="secondary" 
                                        className="h-8 text-xs py-1 px-3 border-tron-cyan/50 hover:bg-tron-cyan/20"
                                        onClick={() => {
                                            const i2c = [];
                                            if (device.hardwareModules?.pn532) i2c.push('PN532 NFC Module');
                                            if (device.hardwareModules?.st25dv) i2c.push('ST25DV16 EEPROM');
                                            if (device.hardwareModules?.scd30) i2c.push('SCD-30 CO2/Temp');
                                            if (device.hardwareModules?.qrReader) i2c.push('I2C QR Scanner');
                                            if (device.hardwareModules?.dfRobotRgb) i2c.push('DFRobot RGB LED Driver');
                                            if (device.hardwareModules?.elektrokitMosfet) i2c.push('Elektrokit 4-Ch Mosfet');
                                            
                                            const mb = device.hardwareModules?.motherboard === 'r4' ? 'Arduino UNO R4 WiFi' : 'Arduino UNO WiFi Rev2';
                                            const disp = device.hardwareModules?.display === 'st7789' ? 'ST7789' : device.hardwareModules?.display === 'st7735' ? 'ST7735' : device.hardwareModules?.display === 'oled1306' ? 'SSD1306' : 'None';
                                            
                                            const fullPrompt = `I am building C++ firmware for an Incendo hardware device.
Here is my exact hardware configuration:
- Motherboard: ${mb}
- Display: ${disp}
- I2C Peripherals: ${i2c.length > 0 ? i2c.join(', ') : 'None'}

Use the following fundamental C++ boilerplate as the base layout structure, and smartly inject additional #include statements, libraries, and logic to support the specific hardware modules listed above:

\`\`\`cpp
#include <Adafruit_GFX.h>
${disp !== 'None' && disp !== 'SSD1306' ? `#include <Adafruit_${disp}.h>\n` : ''}${device.hardwareModules?.pn532 ? '#include <Adafruit_PN532.h>\n' : ''}#include <SPI.h>
#include <WiFiS3.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Wire.h>
#include <OTAUpdate.h>

#define FIRMWARE_VERSION "1.61"
OTAUpdate ota;

${disp !== 'None' && disp !== 'SSD1306' ? `// ---------------- Display pins ----------------
#define TFT_CS     10
#define TFT_RST    -1
#define TFT_DC      8
Adafruit_${disp} tft = Adafruit_${disp}(TFT_CS, TFT_DC, TFT_RST);
` : ''}
${device.hardwareModules?.pn532 ? `// ---------------- NFC Module ----------------
Adafruit_PN532 nfc(SDA, SCL);
` : ''}
// NFC URI Prefix Map
const char* URI_PREFIX_MAP[] = {
  "", "http://www.", "https://www.", "http://", "https://", "tel:",
  "mailto:", "ftp://anonymous:anonymous@", "ftp://ftp.", "ftps://",
  "sftp://", "smb://", "nfs://", "ftp://", "dav://", "news:", "telnet://",
  "imap:", "rtsp://", "urn:", "pop:", "sip:", "sips:", "tftp:", "btspp://",
  "btl2cap://", "btgoep://", "tcpobex://", "irdaobex://", "file://",
  "urn:epc:id:", "urn:epc:tag:", "urn:epc:pat:", "urn:epc:raw:",
  "urn:epc:", "urn:nfc:"
};

// ---------------- Wi-Fi & MQTT ----------------
const char* ssid     = "Skywalker_IoT";
const char* password = "Dubai2026";
const char* mqtt_user = "arduino";
const char* mqtt_pass = "2look@R2D2";
const char* mqtt_server = "192.168.50.65";
const int   mqtt_port   = 1883;

// ---------------- Hardware Pins ----------------
const int greenLedPin = 4;
const int redLedPin = 5;
const int BTN_READ = 2;
const int BTN_WRITE = 3;
const int BTN_SET = 0;
const int BTN_WIFI = 1;

WiFiClient wifiClient;
PubSubClient mqtt(wifiClient);

void setup() {
  Serial.begin(115200);
  // Optional: setup logic here...
}

void loop() {
  // Custom loop logic...
}
\`\`\`

Generate the complete \`setup()\` and \`loop()\` routines integrating these components perfectly so they can be securely flashed onto the unit.`;

                                            navigator.clipboard.writeText(fullPrompt);
                                            setCopiedPrompt(true);
                                            setTimeout(() => setCopiedPrompt(false), 2000);
                                        }}
                                    >
                                        {copiedPrompt ? <Check size={14} className="mr-1 text-tron-cyan" /> : <Copy size={14} className="mr-1" />}
                                        {copiedPrompt ? 'COPIED!' : 'COPY PROMPT'}
                                    </Button>
                                </div>
                                <div className="bg-black/60 border border-tron-cyan/10 rounded-lg p-3 overflow-hidden">
                                    <p className="text-[10px] font-mono text-tron-cyan/70 whitespace-pre-wrap leading-relaxed">
                                        Click "COPY PROMPT" to grab the dynamically generated C++ layout string for this configuration.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Provisioning & Activity */}
                {!isEditing && (
                    <div className="space-y-6 lg:border-l lg:border-tron-border/30 lg:pl-8">
                        
                        {/* Unified DPP Configuration Command Panel */}
                        {device.hardwareModules?.pn532 && (
                            <CommandPanel targetSerial={device.serialNumber} />
                        )}
                        {device.hardwareModules?.st25dv && (
                            <St25dvCard targetSerial={device.serialNumber} />
                        )}
                        {device.hardwareModules?.scd30 && (
                            <Scd30Card targetSerial={device.serialNumber} />
                        )}

                        <div className="tron-panel p-6 flex flex-col min-h-[400px]">
                        <h3 className="text-sm font-bold text-tron-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                            <Activity size={16} className="text-tron-cyan" />
                            Recent Scans & Activity
                        </h3>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
                            {device.nfcHistory && device.nfcHistory.filter((evt: any) => !evt.uid?.includes('_WRITE_OK')).length > 0 ? (
                                device.nfcHistory.filter((evt: any) => !evt.uid?.includes('_WRITE_OK')).map((evt: any, idx: number) => (
                                    <div key={idx} className="bg-black/40 border border-white/5 rounded-lg p-3 text-sm flex flex-col gap-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-mono text-tron-cyan font-bold tabular-nums tracking-widest text-xs">{evt.uid}</span>
                                            <span className="text-[10px] text-tron-muted opacity-60">
                                                {new Date(evt.timestamp).toLocaleTimeString()}
                                            </span>
                                        </div>
                                        {evt.productName ? (
                                            <div className="text-sm text-white font-bold leading-none">
                                                {evt.productName}
                                            </div>
                                        ) : evt.dpp_url ? (
                                            <div className="text-sm text-white font-bold leading-none capitalize">
                                                {evt.dpp_url.split('/').pop()?.replace(/-/g, ' ') || 'Unknown Product'}
                                            </div>
                                        ) : null}
                                        {evt.dpp_url && (
                                            <div className="text-[10px] text-tron-cyan/70 truncate font-mono mt-1" title={evt.dpp_url}>
                                                {evt.dpp_url.replace(/#$/, '')}
                                            </div>
                                        )}
                                        {evt.token && (
                                            <div className="text-[11px] text-tron-cyan/80 truncate font-mono uppercase font-bold flex gap-2 items-center mt-1">
                                                <span className="bg-tron-cyan/20 px-1 rounded text-[9px]">TKN</span>
                                                {evt.token}
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 text-tron-muted/50 font-mono text-xs border border-dashed border-tron-muted/20 rounded-lg">
                                    No scans recorded yet.
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                )}

            </div>
        </div>
    );
};
