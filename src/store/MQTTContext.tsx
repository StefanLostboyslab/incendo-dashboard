import React, { createContext, useContext, useState, useCallback } from 'react';
import mqtt, { MqttClient, type IClientOptions } from 'mqtt';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface MQTTContextType {
    client: MqttClient | null;
    status: ConnectionStatus;
    connect: (options: IClientOptions) => void;
    disconnect: () => void;
    publish: (topic: string, message: string) => void;
    subscribe: (topic: string) => void;
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

    const disconnect = useCallback(() => {
        if (client) {
            client.end();
            setClient(null);
            setStatus('disconnected');
        }
    }, [client]);

    const publish = useCallback((topic: string, message: string) => {
        if (client?.connected) {
            client.publish(topic, message);
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

    return (
        <MQTTContext.Provider value={{ client, status, connect, disconnect, publish, subscribe, lastMessage }}>
            {children}
        </MQTTContext.Provider>
    );
};
