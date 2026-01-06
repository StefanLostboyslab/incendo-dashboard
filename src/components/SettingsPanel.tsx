import React, { useState, useEffect } from 'react';
import { useMQTT } from '../store/MQTTContext';
import { Button, Input, Card } from './UIComponents';
import { Wifi, AlertTriangle } from 'lucide-react';

export const SettingsPanel: React.FC = () => {
    const { connect, status, disconnect } = useMQTT();
    const [brokerUrl, setBrokerUrl] = useState('ws://homeassistant.local:1884');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    // Load saved settings on mount
    useEffect(() => {
        const saved = localStorage.getItem('incendo_mqtt_settings');
        if (saved) {
            const settings = JSON.parse(saved);
            setBrokerUrl(settings.brokerUrl || 'ws://homeassistant.local:1884');
            setUsername(settings.username || '');
            setPassword(settings.password || '');
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
                    protocol: 'ws',
                    path: '/mqtt', // Default for many brokers over WS
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
                    protocol: 'ws',
                    path: '/mqtt',
                    username: username || undefined,
                    password: password || undefined,
                });
            } catch (error) {
                console.error("Invalid URL", error);
            }
        }
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
                            <p className="text-sm text-tron-muted">Configure the WebSocket connection to Home Assistant.</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex gap-3">
                            <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
                            <p className="text-xs text-yellow-500/90 font-mono leading-relaxed">
                                IMPORTANT: Your MQTT broker must have WebSockets enabled.
                                <br />Standard TCP/IP ports (1883) will NOT work in the browser.
                                <br />Common WS ports: <strong>1884, 8083, 9001</strong>.
                            </p>
                        </div>

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
                        <Button type="submit" isLoading={status === 'connecting'} className="min-w-[150px]">
                            {status === 'connected' ? 'RECONNECT' : 'CONNECT'}
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
