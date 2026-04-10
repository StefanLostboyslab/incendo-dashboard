import React, { useState, useEffect } from 'react';
import { useMQTT } from '../store/MQTTContext';
import { Button, Input, Card } from './UIComponents';
import { Wifi, AlertTriangle, Activity, Users, ChevronDown } from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { fetchWhattCategories } from '../lib/whatt';

export const SettingsPanel: React.FC = () => {
    const { connect, status, disconnect, publish } = useMQTT();
    const [brokerUrl, setBrokerUrl] = useState(`ws://${window.location.hostname}:1884`);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Global EPCIS Settings
    const [globalBizLocation, setGlobalBizLocation] = useState('');

    const { user, teams, activeTeam, setActiveTeam, token } = useAuth();
    const [categories, setCategories] = useState<{id: number, name: string}[]>([]);
    const [globalCategory, setGlobalCategory] = useState<string>('');

    useEffect(() => {
        if (!token) return;
        fetchWhattCategories(token).then(cats => {
            if (cats) setCategories(cats);
        });
    }, [token, activeTeam]);

    useEffect(() => {
        const savedCat = localStorage.getItem('incendo_global_category');
        if (savedCat) setGlobalCategory(savedCat);
    }, []);

    const handleSaveCategory = (val: string) => {
        setGlobalCategory(val);
        localStorage.setItem('incendo_global_category', val);
    };

    // Load saved settings on mount
    useEffect(() => {
        const saved = localStorage.getItem('incendo_mqtt_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            
            // If the cached URL is the old homeassistant defaults, override it with the new local Docker broker
            let loadedUrl = settings.brokerUrl || `ws://${window.location.hostname}:1884`;
            if (loadedUrl.includes('homeassistant.local') || loadedUrl.includes('192.168.50.65') || loadedUrl.includes('localhost')) {
                loadedUrl = `ws://${window.location.hostname}:1884`;
            }
            
            setBrokerUrl(loadedUrl);
            setUsername(settings.username || 'arduino');
            setPassword(settings.password || '2look@R2D2');
        }

        const savedEpcis = localStorage.getItem('incendo_global_epcis');
        if (savedEpcis) {
            const epcis = JSON.parse(savedEpcis);
            setGlobalBizLocation(epcis.bizLocation || '');
        }
    }, []);

    const handleSaveAndConnect = (e: React.FormEvent) => {
        e.preventDefault();

        // Save to local storage
        const settings = { brokerUrl, username, password };
        localStorage.setItem('incendo_mqtt_settings', JSON.stringify(settings));

        // Connect
        if (status === 'connected') {
            disconnect();
            // Give it a moment to disconnect before reconnecting
            setTimeout(() => {
                connect({
                    hostname: new URL(brokerUrl).hostname,
                    port: Number(new URL(brokerUrl).port) || 9001,
                    protocol: new URL(brokerUrl).protocol.replace(':', '') as 'ws' | 'wss',
                    path: new URL(brokerUrl).pathname === '/' ? '/mqtt' : new URL(brokerUrl).pathname,
                    username: username || undefined,
                    password: password || undefined,
                });
            }, 500);
        } else {
            try {
                const url = new URL(brokerUrl);
                connect({
                    hostname: url.hostname,
                    port: Number(url.port) || 9001,
                    protocol: url.protocol.replace(':', '') as 'ws' | 'wss',
                    path: url.pathname === '/' ? '/mqtt' : url.pathname,
                    username: username || undefined,
                    password: password || undefined,
                });
            } catch (error) {
                console.error("Invalid URL", error);
            }
        }
    };

    const handleSaveEpcis = (e: React.FormEvent) => {
        e.preventDefault();
        const settings = { bizLocation: globalBizLocation };
        localStorage.setItem('incendo_global_epcis', JSON.stringify(settings));
        // You could optionally show a toast or success message here
        alert("Global EPCIS Settings Saved!");
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-orbitron font-bold text-white tracking-widest flex items-center gap-3">
                <SettingsIcon className="text-tron-cyan" />
                SYSTEM CONFIGURATION
            </h2>

            <Card className="border-tron-cyan/30">
                <form onSubmit={handleSaveAndConnect} className="space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-tron-border/50">
                        <Wifi className="text-tron-cyan" size={24} />
                        <div>
                            <h3 className="text-lg font-bold text-white">MQTT Broker Connection</h3>
                            <p className="text-sm text-tron-muted">This tells your web browser how to communicate with the central message server running on your Arduino UNO Q.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {status !== 'connected' && (
                            <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3 transition-all duration-300">
                                <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                                <p className="text-xs text-yellow-500/90 font-mono leading-relaxed">
                                    IMPORTANT: Since the dashboard runs in your browser, it uses WebSockets (ws://) instead of standard TCP.
                                    <br />By default, this should point to the exact same IP you typed in the URL bar, but on port <strong>1884</strong>.
                                </p>
                            </div>
                        )}

                        <Input
                            label="Broker URL (WebSocket)"
                            placeholder="ws://192.168.1.100:1884"
                            value={brokerUrl}
                            onChange={e => setBrokerUrl(e.target.value)}
                            required
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <Input
                                label="Username"
                                placeholder="mqtt_user"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                            />
                            <Input
                                type="password"
                                label="Password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <Button 
                            type="submit" 
                            isLoading={status === 'connecting'} 
                            variant={status === 'connected' ? 'ghost' : 'primary'}
                            className={`min-w-[150px] ${status === 'connected' ? 'text-tron-success hover:text-tron-success bg-tron-success/5 border border-tron-success/20' : ''}`}
                        >
                            {status === 'connected' ? 'CONNECTED ✓' : 'CONNECT'}
                        </Button>
                    </div>
                </form>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="System Diagnostics" className="h-full">
                    <div className="space-y-2 font-mono text-sm">
                        <div className="flex justify-between">
                            <span className="text-tron-muted">Protocol</span>
                            <span className="text-tron-cyan">WebSocket (WS)</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-tron-muted">Status</span>
                            <span className={status === 'connected' ? 'text-tron-success' : 'text-tron-error'}>
                                {status.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-tron-muted">Client ID</span>
                            <span className="text-tron-muted text-xs">incendo-web-{Math.random().toString(36).substr(2, 6)}</span>
                        </div>
                    </div>
                </Card>

                <Card className="border-tron-cyan/30">
                    <form onSubmit={handleSaveEpcis} className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-tron-border/50">
                            <Activity className="text-tron-cyan" size={24} />
                            <div>
                                <h3 className="text-lg font-bold text-white">Global EPCIS Settings</h3>
                                <p className="text-sm text-tron-muted">Configure supply chain identifiers that apply to this entire facility/dashboard.</p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <Input
                                label="Business Location ID"
                                placeholder="whattio:bizloc:Vellinge"
                                value={globalBizLocation}
                                onChange={e => setGlobalBizLocation(e.target.value)}
                                className="font-mono"
                            />
                            <p className="text-xs text-tron-muted/70 italic flex items-center gap-1">
                                <span className="text-tron-cyan font-bold">Format:</span> whattio:bizloc:CityName. This will be applied to all devices configured from this dashboard.
                            </p>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button type="submit" className="min-w-[150px]">
                                SAVE EPCIS
                            </Button>
                        </div>
                    </form>
                </Card>

                <Card className="border-tron-cyan/30 md:col-span-2">
                    <div className="space-y-6">
                        <div className="flex items-center gap-3 pb-4 border-b border-tron-border/50">
                            <Users className="text-tron-cyan" size={24} />
                            <div>
                                <h3 className="text-lg font-bold text-white">Whatt.io Workspace Configuration</h3>
                                <p className="text-sm text-tron-muted">Select the active workspace and default product category for hardware commissioning.</p>
                            </div>
                        </div>

                        {!user ? (
                            <p className="text-sm text-tron-muted italic">Please log in via the top right widget to configure workspaces.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2 relative z-50">
                                    <label className="block text-xs font-mono text-tron-cyan/70 font-bold tracking-wider">ACTIVE TEAM WORKSPACE</label>
                                    <div className="relative group/team dropdown-container">
                                        <button className="bg-black/50 border border-tron-cyan/30 hover:border-tron-cyan/60 text-white text-sm rounded p-3 w-full text-left flex justify-between items-center transition-colors">
                                            <span className="truncate">{teams.find(t => t.id.toString() === (activeTeam || user.current_team_id?.toString()))?.name || 'Select Team'}</span>
                                            <ChevronDown size={14} className="text-tron-cyan shrink-0" />
                                        </button>
                                        <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#0a0f18] border border-tron-cyan/30 rounded-lg shadow-[0_5px_15px_rgba(0,0,0,0.5)] hidden group-hover/team:block hover:block">
                                            {teams.map(t => {
                                                const isSelected = (activeTeam || user.current_team_id?.toString()) === t.id.toString();
                                                return (
                                                    <button 
                                                        key={t.id} 
                                                        type="button"
                                                        onClick={() => setActiveTeam(t.id.toString())} 
                                                        className={`w-full text-left px-3 py-2 text-sm hover:bg-tron-cyan/20 transition-colors ${isSelected ? 'text-tron-cyan bg-tron-cyan/5 font-bold border-l-2 border-tron-cyan' : 'text-white/80 border-l-2 border-transparent'}`}
                                                    >
                                                        {t.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-tron-muted mt-1 leading-tight">Controls which Whatt.io account is used for analytics and permission gates during NFC operations.</p>
                                </div>
                                
                                <div className="space-y-2 relative z-40">
                                    <label className="block text-xs font-mono text-tron-cyan/70 font-bold tracking-wider">DEFAULT PRODUCT CATEGORY</label>
                                    <select 
                                        className="w-full bg-black/50 border border-tron-cyan/30 text-white text-sm rounded p-3 focus:outline-none focus:border-tron-cyan/60 transition-colors appearance-none cursor-pointer"
                                        value={globalCategory}
                                        onChange={(e) => handleSaveCategory(e.target.value)}
                                        style={{ backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2300f3ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '16px' }}
                                    >
                                        <option value="" className="bg-gray-900 text-white/50">No Default Category</option>
                                        {categories.map(c => (
                                            <option key={c.id} value={c.id} className="bg-gray-900 text-white">{c.name}</option>
                                        ))}
                                    </select>
                                    <p className="text-[10px] text-tron-muted mt-1 leading-tight">Categories are auto-fetched securely based on the Active Workspace selected above.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>

                <div className="pt-6 border-t border-tron-border/30 md:col-span-2">
                    <h3 className="font-orbitron font-bold text-lg text-white mb-4">DEVELOPER TOOLS</h3>
                    <button
                        type="button"
                        onClick={() => {
                            if (status !== 'connected') {
                                alert("Must be connected to MQTT to simulate discovery.");
                                return;
                            }
                            const mockId = `incendo_${Math.random().toString(16).substr(2, 6)}`;
                            const payload = JSON.stringify({
                                id: mockId,
                                name: `Simulated Unit ${mockId.substr(-4)}`,
                                type: 'simulation',
                                ip: '192.168.0.0',
                                mac: '00:00:00:00:00:00',
                                dpp_url: 'https://whatt.io/test',
                                features: ['light']
                            });
                            publish(`incendo/discovery/${mockId}`, payload, { retain: true });
                        }}
                        className="w-full py-3 bg-tron-bg border border-dashed border-tron-cyan/30 text-tron-cyan font-mono text-xs hover:bg-tron-cyan/10 transition-colors rounded-lg mb-2"
                    >
                        SIMULATE NEW DEVICE DISCOVERY (MQTT)
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            // Pongs for all known simulated devices? Or just a random one.
                            // Let's iterate user specific devices if we could... 
                            // Simplified: Just broadcast a Pong for a hardcoded ID or instructions to ping first.
                            // Better: A "Universal Pong Responder" simulation mode?
                            // Let's just create a button that sends a PONG for 'incendo_001' or similar if it exists.
                            // Or just asks user to input ID.
                            const id = prompt("Enter Device ID to Pong:");
                            if (id) {
                                publish(`incendo/devices/${id}/pong`, JSON.stringify({ timestamp: Date.now() }));
                            }
                        }}
                        className="w-full py-3 bg-tron-bg border border-dashed border-tron-success/30 text-tron-success font-mono text-xs hover:bg-tron-success/10 transition-colors rounded-lg"
                    >
                        SIMULATE PONG RESPONSE
                    </button>
                </div>
            </div>
        </div>
    );
};

const SettingsIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24" height="24" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className={className}
    >
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    </svg>
)
