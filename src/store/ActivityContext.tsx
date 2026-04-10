import React, { createContext, useContext, useState } from 'react';

export interface LogEntry {
    id: string;
    timestamp: Date;
    type: 'mqtt' | 'system' | 'error' | 'success';
    message: string;
    details?: string;
}

export interface EpcisEvent {
    id: string;
    timestamp: Date;
    action: 'ADD' | 'OBSERVE';
    bizStep: string;
    target: string;
    device: string;
    epcisDocument: any;
}

interface ActivityContextType {
    logs: LogEntry[];
    epcisEvents: EpcisEvent[];
    addLog: (type: LogEntry['type'], message: string, details?: string) => void;
    addEpcisEvent: (eventRaw: Omit<EpcisEvent, 'id' | 'timestamp'>) => void;
    clearLogs: () => void;
    clearEpcis: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const useActivity = () => {
    const context = useContext(ActivityContext);
    if (!context) {
        throw new Error('useActivity must be used within an ActivityProvider');
    }
    return context;
};

export const ActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [epcisEvents, setEpcisEvents] = useState<EpcisEvent[]>([]);

    const addLog = (type: LogEntry['type'], message: string, details?: string) => {
        setLogs(prev => {
            const newEntry: LogEntry = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date(),
                type,
                message,
                details
            };
            return [...prev, newEntry].slice(-100); // Keep last 100
        });
    };

    const addEpcisEvent = (eventRaw: Omit<EpcisEvent, 'id' | 'timestamp'>) => {
        setEpcisEvents(prev => {
            const newEvent: EpcisEvent = {
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date(),
                ...eventRaw
            };
            return [...prev, newEvent].slice(-100); // Keep last 100
        });
    };

    const clearLogs = () => setLogs([]);
    const clearEpcis = () => setEpcisEvents([]);

    return (
        <ActivityContext.Provider value={{ logs, epcisEvents, addLog, addEpcisEvent, clearLogs, clearEpcis }}>
            {children}
        </ActivityContext.Provider>
    );
};
