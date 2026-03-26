import mqtt, { MqttClient } from 'mqtt';

export interface IncendoDevice {
  id: string;
  ip: string;
  mac: string;
  dpp_url: string;
  lastSeen: number;
  epcis?: {
    readPoint?: { id: string };
    bizLocation?: { id: string };
    ilmd?: { deviceType?: string; firmwareVersion?: string };
  };
}

export type MessageCallback = (topic: string, message: Buffer) => void;

class MqttService {
  private client: MqttClient | null = null;
  private messageCallbacks: MessageCallback[] = [];

  constructor() {
    this.connect();
  }

  private connect() {
    const url = import.meta.env.VITE_MQTT_BROKER_URL || 'ws://localhost:1884';
    const username = import.meta.env.VITE_MQTT_USER;
    const password = import.meta.env.VITE_MQTT_PASS;

    console.log(`Attempting to connect to MQTT broker at: ${url}`);
    
    // We use the 'wss' or 'ws' protocol for WebSockets in the browser
    this.client = mqtt.connect(url, {
      username,
      password,
      reconnectPeriod: 5000, // Reconnect every 5 seconds if disconnected
    });

    this.client.on('connect', () => {
      console.log('Successfully connected to MQTT broker!');
      // Subscribe to the main discovery topic
      this.client?.subscribe('incendo/discovery/+');
      // Subscribe to all ping/pong responses
      this.client?.subscribe('incendo/devices/+/pong');
    });

    this.client.on('message', (topic, message) => {
      this.messageCallbacks.forEach(callback => callback(topic, message));
    });

    this.client.on('error', (err) => {
      console.error('MQTT Connection Error:', err);
      this.client?.end();
    });
  }

  public subscribeToMessages(callback: MessageCallback) {
    this.messageCallbacks.push(callback);
    return () => {
      this.messageCallbacks = this.messageCallbacks.filter(cb => cb !== callback);
    };
  }

  public sendCommand(deviceId: string, url: string) {
    if (this.client?.connected) {
      this.client.publish(`incendo/dpp_url/${deviceId}`, url);
    } else {
      console.warn('MQTT Client not connected. Cannot send command.');
    }
  }

  public sendConfig(deviceId: string, config: { readPoint?: string, bizLocation?: string, deviceType?: string }) {
    if (this.client?.connected) {
      this.client.publish(`incendo/config/${deviceId}`, JSON.stringify(config));
    } else {
      console.warn('MQTT Client not connected. Cannot send config.');
    }
  }

  public sendPing(deviceId: string, payload: string = 'ping') {
     if (this.client?.connected) {
      this.client.publish(`incendo/devices/${deviceId}/ping`, payload);
    } else {
      console.warn('MQTT Client not connected. Cannot send ping.');
    }
  }
}

export const mqttService = new MqttService();
