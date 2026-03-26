import React, { useEffect, useRef } from 'react';
import { useActivity } from '../store/ActivityContext';
import { Card } from './UIComponents';
import { Terminal, Clock } from 'lucide-react';
import { cn } from '../lib/utils';

export const ActivityLog: React.FC = () => {
    const { logs } = useActivity();
    const bottomRef = useRef<HTMLDivElement>(null);

    // Bridge MQTT messages to Activity Log - REMOVED per user request for less noise
    // Only explicit system actions are now logged via useActivity().addLog()

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

                {logs.map((log) => (
                    <div key={log.id} className="flex gap-3 hover:bg-white/5 p-1 rounded transition-colors animate-in fade-in slide-in-from-left-2 items-start">
                        <span className="text-tron-muted whitespace-nowrap flex items-center gap-1">
                            <Clock size={10} /> {log.timestamp.toLocaleTimeString()}
                        </span>
                        <div className="flex-1 break-all">
                            <span className={cn(
                                "mr-2 font-bold",
                                log.type === 'mqtt' ? "text-tron-cyan/80" :
                                    log.type === 'error' ? "text-tron-error" :
                                        log.type === 'success' ? "text-tron-success" : "text-white/80"
                            )}>
                                {log.message}
                            </span>
                            {log.details && <span className="text-tron-text block opacity-80 pl-2 border-l border-white/10">{log.details}</span>}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>
            <div className="mt-2 flex justify-between text-[10px] text-tron-muted uppercase tracking-wider">
                <span>Buffer: {logs.length}/100</span>
                <span>Auto-Scroll: ON</span>
            </div>
        </Card>
    );
};
