import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import mqtt, { type MqttClient, type IClientOptions } from 'mqtt';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface MQTTContextType {
    client: MqttClient | null;
    status: ConnectionStatus;
    connect: (options: IClientOptions) => void;
    disconnect: () => void;
    publish: (topic: string, message: string, options?: mqtt.IClientPublishOptions) => void;
    subscribe: (topic: string) => void;
    unsubscribe: (topic: string) => void;
    lastMessage: { topic: string; payload: string } | null;
}

const MQTTContext = createContext<MQTTContextType | undefined>(undefined);

export const useMQTT = () => {
    const context = useContext(MQTTContext);
    if (!context) throw new Error('useMQTT must be used within MQTTProvider');
    return context;
};

export const MQTTProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [client, setClient] = useState<MqttClient | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<{ topic: string; payload: string } | null>(null);

    // Track initialization to prevent nasty loops
    const [hasAttemptedAutoConnect, setHasAttemptedAutoConnect] = useState(false);

    const connect = useCallback((options: IClientOptions) => {
        setStatus('connecting');
        console.log('Connecting to MQTT broker...', options.host);

        const mqttClient = mqtt.connect(options);

        mqttClient.on('connect', () => {
            console.log('MQTT Connected');
            setStatus('connected');
        });

        mqttClient.on('error', (err) => {
            console.error('MQTT Error:', err);
            setStatus('error');
        });

        mqttClient.on('offline', () => {
            console.log('MQTT Offline');
            setStatus('disconnected');
        });

        mqttClient.on('message', (topic, payload) => {
            setLastMessage({ topic, payload: payload.toString() });
        });

        setClient(mqttClient);
    }, []);

    // Auto-Connect on App Mount
    useEffect(() => {
        if (!hasAttemptedAutoConnect) {
            setHasAttemptedAutoConnect(true);
            const saved = localStorage.getItem('incendo_mqtt_settings');
            if (saved) {
                try {
                    const settings = JSON.parse(saved);
                    let loadedUrl = settings.brokerUrl || 'ws://localhost:1884';
                    
                    // Legacy migration
                    if (loadedUrl.includes('homeassistant.local') || loadedUrl.includes('192.168.50.65')) {
                        loadedUrl = 'ws://localhost:1884';
                    }
                    
                    const url = new URL(loadedUrl);
                    console.log("[MQTT] Auto-connecting to cached broker:", loadedUrl);
                    connect({
                        hostname: url.hostname,
                        port: Number(url.port) || 9001,
                        protocol: url.protocol.replace(':', '') as 'ws' | 'wss',
                        path: url.pathname === '/' ? '/mqtt' : url.pathname,
                        username: settings.username || undefined,
                        password: settings.password || undefined,
                    });
                } catch (e) {
                    console.error("[MQTT] Auto-connect parsing block failed:", e);
                }
            }
        }
    }, [connect, hasAttemptedAutoConnect]);

    const disconnect = useCallback(() => {
        if (client) {
            client.end();
            setClient(null);
            setStatus('disconnected');
        }
    }, [client]);

    const publish = useCallback((topic: string, message: string, options?: mqtt.IClientPublishOptions) => {
        if (client?.connected) {
            client.publish(topic, message, options);
        } else {
            console.warn('Cannot publish: MQTT not connected');
        }
    }, [client]);

    const subscribe = useCallback((topic: string) => {
        if (client?.connected) {
            client.subscribe(topic, (err) => {
                if (err) console.error('Subscribe error:', err);
            });
        }
    }, [client]);

    const unsubscribe = useCallback((topic: string) => {
        if (client?.connected) {
            client.unsubscribe(topic, (err) => {
                if (err) console.error('Unsubscribe error:', err);
            });
        }
    }, [client]);

    return (
        <MQTTContext.Provider value={{ client, status, connect, disconnect, publish, subscribe, unsubscribe, lastMessage }}>
            {children}
        </MQTTContext.Provider>
    );
};
