import React, { useState, useEffect } from 'react';
import { useMQTT } from '../store/MQTTContext';
import { useDevices } from '../store/DeviceContext';
import { Card, Button, Input } from './UIComponents';
import { Zap, Link as LinkIcon, Check, Wifi, Power, Activity, Loader2, Shield } from 'lucide-react';
import { fetchWhattProduct, createWhattUnit, dispatchEpcisEvent, fetchWhattCategories, verifyBlockchainAnchor } from '../lib/whatt';
import { useAuth } from '../store/AuthContext';

import { useActivity } from '../store/ActivityContext';

export const CommandPanel: React.FC<{ targetSerial: string }> = ({ targetSerial }) => {
    const { publish, status } = useMQTT();
    const { updateDeviceDetails } = useDevices();
    const { addLog } = useActivity();
    const { user, token, setActiveTeam } = useAuth();
    const { devices } = useDevices();

    const [dppUrl, setDppUrl] = useState('');
    const [writeLevel, setWriteLevel] = useState<'custom' | 'model' | 'unit'>('custom');
    
    // State Machine
    type WriteState = 'idle' | 'initializing' | 'waiting_for_scan' | 'generating_token' | 'writing_tag' | 'batch_writing' | 'dispatching_webhooks' | 'success' | 'error';
    const [writeState, setWriteState] = useState<WriteState>('idle');
    const [progressLog, setProgressLog] = useState<string[]>([]);
    
    // Immediate Synchronous Lock for Hardware Scan spam
    const scanLock = React.useRef(false);
    
    const device = devices.find((d: any) => d.serialNumber === targetSerial);
    const [lastHandledScanTime, setLastHandledScanTime] = useState<number | null>(null);
    const [unitToken, setUnitToken] = useState<string | null>(null);
    const [unitFormattedUrl, setUnitFormattedUrl] = useState<string | null>(null);

    const [availableCategories, setAvailableCategories] = useState<{id: number, name: string}[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);

    // Deep sync: Automatically query Whatt backend when an interactive URL is provided
    useEffect(() => {
        if (!dppUrl || !dppUrl.includes('whatt.io') || !token) return;
        
        const fetchCategoriesLive = async () => {
            try {
                const productData = await fetchWhattProduct(dppUrl, token);
                if (productData?.team_id) {
                    await setActiveTeam(productData.team_id.toString());
                    const cats = await fetchWhattCategories(token);
                    if (cats) setAvailableCategories(cats);
                    
                    if (productData.category_id) {
                        setSelectedCategoryId(productData.category_id);
                    } else if (cats && cats.length > 0) {
                        setSelectedCategoryId(cats[0].id);
                    }
                }
            } catch (e) { }
        };

        const timeoutId = setTimeout(fetchCategoriesLive, 600);
        return () => clearTimeout(timeoutId);
    }, [dppUrl, token]);

    // Auto-select unit level if the device is assigned a product
    useEffect(() => {
        const base = device?.epcis?.sgtin || device?.provisionedDppUrl;
        if (base && writeLevel === 'custom' && !dppUrl) {
            handleLevelChange('unit');
        }
    }, [device?.epcis?.sgtin, device?.provisionedDppUrl, targetSerial]);

    const handleLevelChange = (level: 'custom' | 'model' | 'unit') => {
        setWriteLevel(level);
        if (level === 'custom') {
            setDppUrl('');
            return;
        }

        const baseUrl = device?.epcis?.sgtin || device?.provisionedDppUrl;

        if (!baseUrl) {
            alert("No Product URL configured for this device. Please edit the configuration or supply a custom URL first.");
            setWriteLevel('custom');
            return;
        }

        if (level === 'model') {
            // Strip any trailing MAC/UID if provisionedDppUrl was already a unit URL
            const urlParts = baseUrl.split('/');
            let sgtin = baseUrl;
            // Best effort detection of MAC address suffix to revert to model level
            if (urlParts.length > 4 && urlParts[urlParts.length - 1]?.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/)) {
                sgtin = urlParts.slice(0, urlParts.length - 1).join('/');
            }
            setDppUrl(sgtin);
        } else if (level === 'unit') {
            const urlParts = baseUrl.split('/');
            let productId = urlParts[urlParts.length - 1];
            if (!productId && urlParts.length > 1) productId = urlParts[urlParts.length - 2];
            // If the base URL already has a MAC address, the productId logic above will pick up the MAC instead of the product ID. 
            // Fix: Re-derive clean product ID.
            if (productId?.match(/([0-9a-fA-F]{2}[:-]){5}[0-9a-fA-F]{2}/)) {
                 productId = urlParts[urlParts.length - 2];
            }
            const cleanId = productId ? productId.replace(/\?.*$/, '') : 'PRODUCT_ID';
            const match = cleanId?.match(/-(\d+)$/);
            const finalId = match ? match[1] : cleanId;
            setDppUrl(`https://whatt.io/${finalId}/[AUTO_REPLACE_UID]`);
        }
    };

    const appendLog = (msg: string) => setProgressLog(prev => [...prev, `> ${msg}`]);

    const handleSendConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!dppUrl || !targetSerial) return;

        // Prevent useEffect from intercepting stale scans while we fetch the team!
        scanLock.current = false;
        setWriteState('initializing');
        setProgressLog([]);
        appendLog(`Initializing ${writeLevel.toUpperCase()} provisioning...`);

        // Fetch Metadata before starting scan
        let productData = null;
        try {
            productData = await fetchWhattProduct(dppUrl, token || undefined);
            updateDeviceDetails(targetSerial, {
                provisionedDppUrl: dppUrl,
                productMetadata: productData ? {
                    name: productData.name,
                    productCode: productData.product_number,
                    imageUrl: productData.main_image,
                    team: productData.team,
                    category: productData.category
                } : undefined
            });
            // Auto switch team to match assigned product
            if (productData?.team_id) {
                await setActiveTeam(productData.team_id.toString());
                appendLog(`Synced Active Team to Product Workspace ID: ${productData.team_id}`);
                if (selectedCategoryId) {
                    appendLog(`Bound Hardware Pipeline to Target Category: ${selectedCategoryId}`);
                }
            }
        } catch (err) {
            appendLog(`Warning: Failed to fetch metadata: ${String(err)}`);
        }

        if (writeLevel === 'unit') {
            // Flush the historical scan history so we strictly only capture the NEXT physical tap!
            setLastHandledScanTime(device?.nfcHistory?.[0]?.timestamp || null);
            setWriteState('waiting_for_scan');
            publish(`incendo/devices/${targetSerial}/mode`, JSON.stringify({ mode: "READ" }));
            appendLog('Hardware set to SCAN mode. Awaiting physical NFC tap.');
        } else {
            // Model and Custom immediately enter batch write mode
            processModelProvisioning();
            
            // Fallback for custom or if URL parsing failed, just push to hardware topic too
            if (writeLevel === 'custom') {
                publish(`incendo/dpp_url/${targetSerial}`, dppUrl);
            }
        }
    };

    // Listen for NFC UID when in writing pipeline
    useEffect(() => {
        if (!device) return;
        const latestScan = device.nfcHistory?.[0];
        
        if (latestScan && latestScan.timestamp !== lastHandledScanTime) {
            if (latestScan.uid) {
                // Handle Unit Mode waiting for scan
                if (writeState === 'waiting_for_scan' && writeLevel === 'unit') {
                    if (scanLock.current) return;
                    scanLock.current = true;
                    appendLog(`Tag UID detected: ${latestScan.uid}`);
                    setLastHandledScanTime(latestScan.timestamp);
                    processUnitProvisioning(latestScan.uid);
                } 
                // Handle Batch Write Success signals
                else if (writeState === 'batch_writing' && latestScan.uid === 'BATCH_WRITE_OK') {
                    appendLog('Hardware confirmed BATCH write success!');
                    setLastHandledScanTime(latestScan.timestamp);
                    dispatchWebhooksOnly(dppUrl);
                }
                // Handle Unit Write Success signals bypassing Arduino WRITE_UNIT logic gap
                else if (writeState === 'writing_tag' && (latestScan.uid === 'UNIT_WRITE_OK' || latestScan.uid === 'BATCH_WRITE_OK')) {
                    appendLog('Hardware confirmed UNIT mode multi-record write!');
                    setLastHandledScanTime(latestScan.timestamp);
                    publish(`incendo/devices/${targetSerial}/mode`, JSON.stringify({ mode: "DONE!\nREMOVE TAG" }));
                    dispatchUnitWebhooks();
                }
            }
        }
    }, [device?.nfcHistory, writeState, writeLevel, lastHandledScanTime, dppUrl, unitToken, unitFormattedUrl, user, token]);
    
    function dispatchWebhooksOnly(formattedUrl: string) {
        appendLog('Dispatching webhooks for Model/Batch write...');
        const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        const epcisPayload = {
            "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
            "type": "EPCISDocument",
            "schemaVersion": "2.0",
            "creationDate": nowIso,
            "epcisBody": {
                "eventList": [
                    {
                        "type": "ObjectEvent",
                        "action": "ADD",
                        "bizStep": "urn:epcglobal:cbv:bizstep:commissioning",
                        "disposition": "urn:epcglobal:cbv:disp:active",
                        "eventTime": nowIso,
                        "eventTimeZoneOffset": "+00:00",
                        "epcList": [formattedUrl],
                        "readPoint": {
                            "id": device?.epcis?.readPoint || "whattio:readpoint:incendo-dashboard"
                        },
                        "bizLocation": {
                            "id": device?.epcis?.bizLocation || "whattio:bizloc:remote"
                        },
                        "ilmd": {
                            "operator": user?.name || "whatt.io Technician",
                            "technicianComment": "Batch Provisioned via Incendo Dashboard",
                            "deviceType": device?.epcis?.deviceType || "whatt.io Incendo CMD",
                            "firmwareVersion": device?.version || "1.0.0"
                        },
                        "extension": {
                            "whattio:fabricatedUnitSerial": formattedUrl.split('/').pop() || "unknown",
                            "whattio:geoCoordinates": "geo:0,0", // Batch mode fallback
                            "whattio:blockchainAnchored": true
                        }
                    }
                ]
            }
        };

        const activeTeamId = user?.current_team_id;
        if (token && activeTeamId) {
            dispatchEpcisEvent(token, activeTeamId, epcisPayload)
                .then(res => {
                    if (res.success) {
                        appendLog(`Webhooks sync OK. Ready for next tag...`);
                    } else {
                        appendLog(`Webhook Warning: ${res.failures?.length || 0} failed.`);
                    }
                });
        }
    };

    async function processModelProvisioning() {
        setWriteState('batch_writing');
        setLastHandledScanTime(device?.nfcHistory?.[0]?.timestamp || null);
        appendLog('Hardware set to CONTINUOUS WRITE mode for Model/Batch...');
        
        const rawPayload = {
            mode: "WRITE",
            records: [
                { type: "url", value: dppUrl }
            ]
        };
        
        publish(`incendo/devices/${targetSerial}/mode`, JSON.stringify(rawPayload));
    };



    async function processUnitProvisioning(uid: string) {
        // Stop hardware from repetitively scanning the tag while we execute the secure API token handshake!
        publish(`incendo/devices/${targetSerial}/mode`, JSON.stringify({ mode: "IDLE" }));

        if (!token || !user) {
            setWriteState('error');
            appendLog('Auth error: Missing whatt.io token.');
            return;
        }

        try {
            // 1. Generate Token
            setWriteState('generating_token');
            appendLog('Requesting Security Token from /api/v2/unit/create...');
            
            let productId = 1; // Fallback
            const match = dppUrl.match(/whatt\.io\/(\d+)/);
            if (match) productId = parseInt(match[1], 10);

            const unitData = await createWhattUnit(token, uid, productId, selectedCategoryId || undefined);
            if (!unitData || !unitData.token) {
                throw new Error("Unable to retrieve secure token from response payload.");
            }
            appendLog(`Token Generation Success: [SECURE_HASH_HIDDEN]`);

            // 2. Burn Tag
            setWriteState('writing_tag');
            appendLog('Compiling 3 NDEF Records (URL, Token, bc:anchored)...');
            
            let formattedUrl = dppUrl;
            if (formattedUrl.includes('[AUTO_REPLACE_UID]')) {
                formattedUrl = formattedUrl.replace('[AUTO_REPLACE_UID]', uid);
            } else {
                if (!formattedUrl.endsWith(uid)) {
                    formattedUrl = formattedUrl.endsWith('/') ? `${formattedUrl}${uid}` : `${formattedUrl}/${uid}`;
                }
            }
            
            setUnitToken(unitData.token);
            setUnitFormattedUrl(formattedUrl);
            
            const rawPayload = {
                mode: "WRITE_UNIT", // Explicitly invoke exact hardware Unit handler
                records: [
                    { type: "url", value: formattedUrl },
                    { type: "text", value: unitData.token },
                    { type: "text", value: "bc:anchored" }
                ]
            };
            
            appendLog('Dispatching binary payload to Arduino hardware...');
            appendLog('AWAITING SECOND PHYSICAL TAP: PLEASE HOLD TAG TO SCANNER TO BURN DATA...');
            publish(`incendo/devices/${targetSerial}/mode`, JSON.stringify(rawPayload));
            
        } catch (error) {
            setWriteState('error');
            appendLog(`Pipeline Error: ${error}`);
        }
    };

    async function dispatchUnitWebhooks() {
        if (!unitToken || !unitFormattedUrl || !user || !token) {
             appendLog('Webhook error: Missing secure token context.');
             return;
        }
        setWriteState('dispatching_webhooks');
        
        appendLog('Acquiring physical geo-coordinates...');
        let geoString = 'geo:0,0';
        try {
            const loc = await new Promise<any>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 4000 });
            });
            geoString = `geo:${loc.coords.latitude.toFixed(4)},${loc.coords.longitude.toFixed(4)}`;
            appendLog(`Coordinates securely captured: ${geoString}`);
        } catch {
            appendLog('Geo-location request timed out or denied. Defaulting to 0,0');
        }

        appendLog('Constructing EPCIS 2.0 Digital Twin Event...');
        
        const parts = unitFormattedUrl.split('/');
        const uid = parts[parts.length - 1];

        const nowIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
        const epcisPayload = {
            "@context": ["https://ref.gs1.org/standards/epcis/2.0.0/epcis-context.jsonld"],
            "type": "EPCISDocument",
            "schemaVersion": "2.0",
            "creationDate": nowIso,
            "epcisBody": {
                "eventList": [
                    {
                        "type": "ObjectEvent",
                        "action": "ADD",
                        "bizStep": "urn:epcglobal:cbv:bizstep:commissioning",
                        "disposition": "urn:epcglobal:cbv:disp:active",
                        "eventTime": nowIso,
                        "eventTimeZoneOffset": "+00:00",
                        "epcList": [unitFormattedUrl],
                        "readPoint": {
                            "id": device?.epcis?.readPoint || "whattio:readpoint:incendo-dashboard"
                        },
                        "bizLocation": {
                            "id": device?.epcis?.bizLocation || "whattio:bizloc:remote"
                        },
                        "ilmd": {
                            "operator": user?.name || "whatt.io Technician",
                            "technicianComment": "Unit Provisioned via Incendo Dashboard",
                            "deviceType": device?.epcis?.deviceType || "whatt.io Incendo CMD",
                            "firmwareVersion": String(device?.version || "1.0.0")
                        },
                        "extension": {
                            "whattio:fabricatedUnitSerial": String(uid),
                            "whattio:geoCoordinates": String(geoString),
                            "whattio:blockchainAnchored": true
                        }
                    }
                ]
            }
        };

        const teamId = user.current_team_id || 1;
        appendLog(`Broadcasting GS1 Webhooks to Playground & Analytics...`);
        const dispatchResult = await dispatchEpcisEvent(token, teamId, epcisPayload);
        
        if (dispatchResult.success) {
            appendLog('Webhooks dispatched perfectly! Awaiting Blockchain Polygon Amoy confirmation...');
            
            // Wait for Agent to physically hit Polygon 
            const parts = unitFormattedUrl.split('/');
            const uid = parts[parts.length - 1];
            
            let verified = false;
            try {
                let retryIndex = 1;
                let waitTime = 5000;
                while (retryIndex <= 8) {
                    await new Promise(r => setTimeout(r, waitTime));
                    appendLog(`Retrieving Smart Contract Block 0x34B47... (Attempt ${retryIndex}/8)`);
                    const isAnchored = await verifyBlockchainAnchor(uid);
                    if (isAnchored) {
                        verified = true;
                        break;
                    }
                    retryIndex++;
                }
            } catch (e) {
                appendLog(`Blockchain verification logic failed locally: ${e}`);
            }

            if (verified) {
                 appendLog('✔ SUCCESS! Blockchain contract explicitly verified: isAnchored = true');
            } else {
                 appendLog('⚠ EPCIS dispatched, but Blockchain verification timed out natively. (Agent may still be minting)');
            }

            setWriteState('success');
            addLog('success', `Provisioned Unit Anchored`);
            updateDeviceDetails(targetSerial, { provisionedDppUrl: unitFormattedUrl });
        } else {
            appendLog(`Warning: ${dispatchResult.failures.length} webhooks failed.`);
            setWriteState('success');
        }
    };

    return (
        <Card className="border-tron-cyan/50 shadow-neon-cyan/20 p-5 bg-black/40">
            <h3 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2 mb-4">
                <LinkIcon size={16} className="text-tron-cyan" /> PN532 NFC
            </h3>

            <div className="bg-black/40 p-3 rounded-lg border border-tron-cyan/10 mb-6">
                <div className="text-[10px] text-tron-cyan/50 font-bold mb-1 uppercase tracking-wider">Assigned Product</div>
                {device?.productMetadata ? (
                    <div className="flex items-center gap-3">
                        {device.productMetadata.imageUrl && (
                            <img src={device.productMetadata.imageUrl} alt={device.productMetadata.name} className="w-12 h-12 object-cover rounded bg-white/5" />
                        )}
                        <div>
                            <div className="text-sm font-bold text-white mb-1">{device.productMetadata.name}</div>
                            <div className="flex items-center gap-2">
                                <span className="bg-tron-cyan/20 text-tron-cyan text-[9px] px-1.5 py-0.5 rounded font-bold uppercase">{device.productMetadata.team || 'whatt.io'}</span>
                                <span className="text-[10px] text-tron-muted font-mono">{device.productMetadata.category || 'Category'}</span>
                                <span className="text-[10px] text-tron-cyan/60 font-mono hidden sm:inline">{device.productMetadata.productCode}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-tron-muted italic">No product assigned globally</div>
                )}
                {device?.epcis?.sgtin && (
                    <div className="mt-3 bg-tron-cyan/5 border border-tron-cyan/20 p-2 rounded cursor-help group" title="This identifier satisfies the ESPR requirement for a Unique Product Identifier by utilizing the RFC 3986 open web standard.">
                        <div className="text-[9px] text-tron-cyan font-bold uppercase tracking-wider mb-1 flex items-center gap-1">
                            <Check size={10} className="text-tron-cyan" /> RFC 3986 COMPLIANT URI
                        </div>
                        <div className="text-[11px] text-white font-mono break-all leading-tight group-hover:text-tron-cyan transition-colors">
                            {(() => {
                                const urlParts = device.epcis.sgtin.split('/');
                                let productId = urlParts[urlParts.length - 1];
                                if (!productId && urlParts.length > 1) productId = urlParts[urlParts.length - 2];
                                const cleanId = productId ? productId.replace(/\?.*$/, '') : 'PRODUCT_ID';
                                const match = cleanId.match(/-(\d+)$/);
                                const finalId = match ? match[1] : cleanId;
                                return `https://whatt.io/${finalId}/[AUTO_REPLACE_UID]`;
                            })()}
                        </div>
                    </div>
                )}
            </div>

            {/* Control Scanner Section */}
            <div className="mb-6 pb-6 border-b border-tron-cyan/20">
                <div className="text-[10px] text-tron-cyan/50 font-bold mb-3 uppercase tracking-wider flex items-center gap-2">
                    <Activity size={12} className="text-tron-cyan" />
                    <span>Remote Scanner Control</span>
                </div>
                <div className="flex gap-3">
                    <Button 
                        type="button"
                        variant="secondary" 
                        title="Powers up the PN532 to actively loop for ISO14443A NFC tags."
                        className="flex-1 bg-tron-cyan/10 hover:bg-tron-cyan/20 text-tron-cyan border border-tron-cyan/30 flex justify-center items-center"
                        onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            publish(`incendo/devices/${targetSerial}/mode`, JSON.stringify({ mode: "READ" }));
                        }}
                    >
                        <Wifi size={14} className="mr-2 shrink-0" /> <span className="text-xs">Start NFC Scan</span>
                    </Button>
                    <Button 
                        type="button"
                        variant="secondary"
                        title="Powers down the PN532 and returns the board to IDLE to save energy."
                        className="flex-1 bg-white/5 hover:bg-white/10 text-tron-muted border border-white/10 flex justify-center items-center"
                        onClick={(e: React.MouseEvent) => {
                            e.preventDefault();
                            publish(`incendo/devices/${targetSerial}/mode`, JSON.stringify({ mode: "IDLE" }));
                        }}
                    >
                        <Power size={14} className="mr-2 shrink-0" /> <span className="text-xs">Stop Scanner</span>
                    </Button>
                </div>
                <p className="mt-3 text-[10px] text-tron-muted font-mono leading-relaxed">
                    Set the physical hardware into active RFID reading mode. Scanned tags will appear in the History log.
                </p>
            </div>

            <form onSubmit={handleSendConfig} className="space-y-6">

                {/* Write Level Selection */}
                <div className="space-y-3">
                    <p className="text-[10px] font-bold text-tron-muted uppercase tracking-wider mb-2">DPP WRITE LEVEL</p>
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                                type="radio" 
                                name="writeLevel" 
                                value="model"
                                checked={writeLevel === 'model'}
                                onChange={() => handleLevelChange('model')}
                                className="w-4 h-4 text-tron-cyan bg-transparent border-tron-cyan/40 focus:ring-tron-cyan focus:ring-1 cursor-pointer"
                            />
                            <span className={`text-xs font-mono transition-colors ${writeLevel === 'model' ? 'text-tron-cyan' : 'text-tron-muted group-hover:text-white'}`}>Model/Batch</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                                type="radio" 
                                name="writeLevel" 
                                value="unit"
                                checked={writeLevel === 'unit'}
                                onChange={() => handleLevelChange('unit')}
                                className="w-4 h-4 text-tron-cyan bg-transparent border-tron-cyan/40 focus:ring-tron-cyan focus:ring-1 cursor-pointer"
                            />
                            <span className={`text-xs font-mono transition-colors ${writeLevel === 'unit' ? 'text-tron-cyan' : 'text-tron-muted group-hover:text-white'}`}>Unit (Item)</span>
                        </label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <input 
                                type="radio" 
                                name="writeLevel" 
                                value="custom"
                                checked={writeLevel === 'custom'}
                                onChange={() => handleLevelChange('custom')}
                                className="w-4 h-4 text-tron-cyan bg-transparent border-tron-cyan/40 focus:ring-tron-cyan focus:ring-1 cursor-pointer"
                            />
                            <span className={`text-xs font-mono transition-colors ${writeLevel === 'custom' ? 'text-tron-cyan' : 'text-tron-muted group-hover:text-white'}`}>Custom</span>
                        </label>
                    </div>
                </div>

                {/* Command Parameter */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 text-tron-cyan">
                                <LinkIcon size={16} />
                                <span className="font-bold font-orbitron text-sm">DPP SOURCE URL</span>
                            </div>
                        </div>
                        <Input
                            placeholder="https://whatt.io/device-..."
                            value={dppUrl}
                            onChange={(e: any) => setDppUrl(e.target.value)}
                            required={true}
                            className={writeLevel === 'unit' ? 'text-tron-cyan' : ''}
                        />
                        <p className="text-xs text-tron-muted font-mono">*URL to be written to NFC tag</p>
                    </div>

                    {writeLevel === 'unit' && availableCategories.length > 0 && (
                        <div className="space-y-2 bg-black/40 p-3 rounded-lg border border-tron-cyan/20">
                            <label className="text-xs text-tron-cyan font-bold uppercase tracking-wider flex items-center gap-2">
                                <Shield size={12} /> Unit Target Category
                            </label>
                            <select 
                                value={selectedCategoryId || ''}
                                onChange={e => setSelectedCategoryId(Number(e.target.value))}
                                className="w-full bg-black/80 border border-tron-cyan/40 text-tron-cyan rounded-md px-3 py-2 text-sm focus:outline-none focus:border-tron-cyan font-mono"
                            >
                                {availableCategories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            <p className="text-[10px] text-tron-muted font-mono leading-tight">*Mandatory collection assignment. Selecting this ensures the generated unit correctly anchors to the target backend category.</p>
                        </div>
                    )}
                </div>

                {/* Action Trigger / Progress UI */}
                <div className="pt-4 border-t border-tron-border/30">
                    {writeState === 'idle' ? (
                        <Button
                            type="submit"
                            className="w-full flex justify-between items-center group shadow-[0_0_15px_rgba(239,68,68,0.3)] bg-red-900/40 hover:bg-red-800/60 border border-red-500/50 text-red-100 transition-all font-bold placeholder-opacity-100"
                            disabled={status !== 'connected' || !targetSerial}
                        >
                            <span>WRITE NFC</span>
                            <Zap size={18} className="group-hover:text-white text-red-400 transition-colors" />
                        </Button>
                    ) : (
                        <div className="bg-black/60 border border-tron-cyan/30 rounded-lg p-4 font-mono">
                            <h4 className="text-tron-cyan text-xs font-bold uppercase mb-3 flex justify-between items-center">
                                Pipeline Status
                                {writeState === 'error' ? <Shield className="text-red-500" size={14} /> : 
                                 writeState === 'success' ? <Check className="text-green-500" size={14} /> : 
                                 <Loader2 className="animate-spin" size={14} />}
                            </h4>
                            <div className="space-y-1 max-h-[350px] overflow-y-auto mb-4 pb-2 text-[10px] leading-tight flex flex-col gap-1">
                                {progressLog.map((log, i) => (
                                    <div key={i} className={`whitespace-pre-wrap ${
                                        log.includes('Error') || log.includes('⚠') || log.includes('Warning') ? 'text-red-400 font-bold' :
                                        log.includes('Success') || log.includes('detected') || log.includes('✔') ? 'text-green-400 font-bold' :
                                        'text-tron-muted'
                                    }`}>
                                        {log}
                                    </div>
                                ))}
                            </div>
                            
                            {(writeState === 'success' || writeState === 'error') && (
                                <Button 
                                    type="button" 
                                    variant="secondary" 
                                    className="w-full text-xs py-1.5"
                                    onClick={() => setWriteState('idle')}
                                >
                                    Dismiss
                                </Button>
                            )}
                        </div>
                    )}
                    
                    {status !== 'connected' && writeState === 'idle' && (
                        <p className="text-xs text-tron-error mt-2 text-center font-mono">
                            ⚠ SYSTEM OFFLINE
                        </p>
                    )}
                </div>
            </form>
        </Card>
    );
};
