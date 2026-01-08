import { useState, useEffect, useCallback } from 'react';
import { useMQTT } from '../store/MQTTContext';

export interface LightConfig {
    id: string;
    name: string;
    type: 'digital' | 'pwm';

    // MQTT Configuration
    commandTopic: string;
    stateTopic: string;
    jsonKey?: string; // If state payload is JSON, which key holds the value?
}

export interface LightState extends LightConfig {
    value: number; // 0-255
}

const LIGHT_CONFIGS: LightConfig[] = [
    // --- HOME DEVICE (Arduino UNO R4) ---
    { id: 'home_d2', name: 'Home D2', type: 'digital', commandTopic: 'home/lights/d2/set', stateTopic: 'home/lights/d2/state' },
    { id: 'home_d3', name: 'Home D3', type: 'pwm', commandTopic: 'home/lights/d3/set', stateTopic: 'home/lights/d3/state' },
    { id: 'home_d4', name: 'Home D4', type: 'digital', commandTopic: 'home/lights/d4/set', stateTopic: 'home/lights/d4/state' },
    { id: 'home_d5', name: 'Home D5', type: 'pwm', commandTopic: 'home/lights/d5/set', stateTopic: 'home/lights/d5/state' },
    { id: 'home_d6', name: 'Home D6', type: 'pwm', commandTopic: 'home/lights/d6/set', stateTopic: 'home/lights/d6/state' },

    // --- GARDEN DEVICE ---
    // JSON payloads expected likely: { "brightness": 255, "state": "ON" ... }
    // We'll guess the key is 'brightness' or just parse the whole if number.
    { id: 'garden_fence1', name: 'Garden Fence 1', type: 'pwm', commandTopic: 'garden/lights/fence1/set', stateTopic: 'garden/lights/fence1/status', jsonKey: 'brightness' },
    { id: 'garden_fence2', name: 'Garden Fence 2', type: 'pwm', commandTopic: 'garden/lights/fence2/set', stateTopic: 'garden/lights/fence2/status', jsonKey: 'brightness' },
    { id: 'garden_path', name: 'Garden Path', type: 'pwm', commandTopic: 'garden/lights/path/set', stateTopic: 'garden/lights/path/status', jsonKey: 'brightness' },
    { id: 'garden_tree', name: 'Garden Tree', type: 'pwm', commandTopic: 'garden/lights/tree/set', stateTopic: 'garden/lights/tree/status', jsonKey: 'brightness' },
    { id: 'garden_wall', name: 'Garden Wallwash', type: 'pwm', commandTopic: 'garden/lights/wallwash/set', stateTopic: 'garden/lights/wallwash/status', jsonKey: 'brightness' },
];

const INITIAL_STATE: LightState[] = LIGHT_CONFIGS.map(cfg => ({ ...cfg, value: 0 }));

export const useLights = () => {
    const { client, publish, subscribe, lastMessage } = useMQTT();
    const [lights, setLights] = useState<LightState[]>(INITIAL_STATE);

    // Subscribe to all state topics
    useEffect(() => {
        if (client?.connected) {
            LIGHT_CONFIGS.forEach(light => {
                subscribe(light.stateTopic);
            });
        }
    }, [client?.connected, subscribe]);

    // Handle incoming messages
    useEffect(() => {
        if (lastMessage) {
            const { topic, payload } = lastMessage;

            // Find which light matches this topic
            const light = lights.find(l => l.stateTopic === topic);
            if (light) {
                let newValue = 0;

                try {
                    // Try parsing as JSON first if configured or looks like JSON
                    if (payload.trim().startsWith('{')) {
                        const data = JSON.parse(payload);
                        // If jsonKey is set, look for it. Else look for common keys.
                        const key = light.jsonKey || 'brightness';

                        if (data[key] !== undefined) {
                            newValue = Number(data[key]);
                        } else if (data.state === 'ON') {
                            newValue = 255;
                        } else if (data.state === 'OFF') {
                            newValue = 0;
                        } else {
                            // Fallback: try to just cast the whole object if unexpected
                            console.warn(`[useLights] Key '${key}' not found in JSON for ${light.id}`, data);
                        }
                    } else {
                        // Raw payload
                        if (payload === 'ON') newValue = 255;
                        else if (payload === 'OFF') newValue = 0;
                        else newValue = parseInt(payload) || 0;
                    }

                    // Constrain 0-255
                    if (newValue > 255) newValue = 255;
                    if (newValue < 0) newValue = 0;

                    setLights(prev => prev.map(l =>
                        l.id === light.id ? { ...l, value: newValue } : l
                    ));

                } catch (e) {
                    console.error('Error parsing MQTT payload for', light.id, e);
                }
            }
        }
    }, [lastMessage]);

    const setLight = useCallback((id: string, value: number) => {
        const light = lights.find(l => l.id === id);
        if (!light) return;

        // Optimistic update
        setLights(prev => prev.map(l =>
            l.id === id ? { ...l, value } : l
        ));

        // Publish to MQTT
        // For garden, we send raw value to 'set' topic? Or JSON?
        // Usually 'set' topics accept raw values or specific JSON.
        // The user prompt said: "garden/lights/<zone>/set"
        // I'll assume it accepts the raw number 0-255 just like the Arduino for now.
        publish(light.commandTopic, value.toString());
    }, [publish, lights]);

    const toggleLight = useCallback((id: string) => {
        const light = lights.find(l => l.id === id);
        if (light) {
            const newValue = light.value > 0 ? 0 : 255;
            setLight(id, newValue);
        }
    }, [lights, setLight]);

    return { lights, setLight, toggleLight };
};
