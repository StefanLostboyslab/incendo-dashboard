import React, { useEffect, useRef } from 'react';
import { useMQTT } from '../store/MQTTContext';
import { Card } from './UIComponents';
import { Terminal, Clock } from 'lucide-react';

export const ActivityLog: React.FC = () => {
    const { lastMessage } = useMQTT();
    const [logs, setLogs] = React.useState<Array<{ time: string, topic: string, payload: string }>>([]);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (lastMessage) {
            setLogs(prev => {
                const newLogs = [...prev, {
                    time: new Date().toLocaleTimeString(),
                    topic: lastMessage.topic,
                    payload: lastMessage.payload
                }];
                // Keep only last 50 messages to prevent memory issues
                return newLogs.slice(-50);
            });
        }
    }, [lastMessage]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <Card title="SYSTEM ACTIVITY LOG" className="h-full flex flex-col min-h-[400px]">
            <div className="flex-1 overflow-auto bg-black/50 rounded-lg p-4 font-mono text-xs space-y-2 border border-tron-border/30 shadow-inner">
                {logs.length === 0 && (
                    <div className="text-tron-muted text-center py-8 opacity-50">
                        <Terminal size={32} className="mx-auto mb-2" />
                        <span>NO ACTIVITY DETECTED...</span>
                    </div>
                )}

                {logs.map((log, i) => (
                    <div key={i} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors animate-in fade-in slide-in-from-left-2 items-start">
                        <span className="text-tron-muted whitespace-nowrap flex items-center gap-1">
                            <Clock size={10} /> {log.time}
                        </span>
                        <div className="flex-1 break-all">
                            <span className="text-tron-cyan/80 mr-2">[{log.topic}]</span>
                            <span className="text-tron-text">{log.payload}</span>
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-tron-muted uppercase tracking-wider">
                <span>Buffer: {logs.length}/50</span>
                <span>Auto-Scroll: ON</span>
            </div>
        </Card>
    );
};
