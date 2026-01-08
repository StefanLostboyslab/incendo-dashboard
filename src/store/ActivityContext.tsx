import React, { createContext, useContext, useState, useEffect } from 'react';

export interface LogEntry {
    id: string;
    timestamp: Date;
    type: 'mqtt' | 'system' | 'error' | 'success';
    message: string;
    details?: string;
}

interface ActivityContextType {
    logs: LogEntry[];
    addLog: (type: LogEntry['type'], message: string, details?: string) => void;
    clearLogs: () => void;
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

    const clearLogs = () => setLogs([]);

    return (
        <ActivityContext.Provider value={{ logs, addLog, clearLogs }}>
            {children}
        </ActivityContext.Provider>
    );
};
