import React, { useEffect, useRef } from 'react';
import { useActivity } from '../store/ActivityContext';
import { Card } from './UIComponents';
import { Terminal, Clock, ShieldCheck, Fingerprint, Database, Copy, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export const ActivityLog: React.FC = () => {
    const { logs, epcisEvents } = useActivity();
    const bottomRef = useRef<HTMLDivElement>(null);
    const rightBottomRef = useRef<HTMLDivElement>(null);

    const [copiedId, setCopiedId] = React.useState<string | null>(null);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    useEffect(() => {
        rightBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [epcisEvents]);

    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[500px]">
            {/* Left Pane: Standard Activity Log */}
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
                                <Clock size={10} /> {new Date(log.timestamp).toLocaleTimeString()}
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

            {/* Right Pane: EPCIS Digital Evidence Vault */}
            <Card title="EPCIS 2.0 EVIDENCE VAULT" className="h-full flex flex-col min-h-[400px] border-tron-cyan/40">
                <div className="flex-1 overflow-auto bg-[#0a0f12] rounded-lg p-0 font-mono text-xs space-y-0 border border-tron-cyan/20 shadow-[inset_0_0_20px_rgba(0,255,255,0.05)]">
                    
                    {epcisEvents.length === 0 && (
                        <div className="text-tron-cyan/40 text-center py-16 opacity-80">
                            <ShieldCheck size={48} className="mx-auto mb-4 opacity-50" />
                            <span className="block font-bold mb-1 tracking-widest">GS1 DIGITAL PROOF LEDGER</span>
                            <span className="text-[10px] opacity-70">Awaiting Commissioning Events...</span>
                        </div>
                    )}

                    {epcisEvents.map((evt) => (
                        <div key={evt.id} className="border-b border-tron-cyan/10 last:border-b-0 animate-in fade-in slide-in-from-right-2">
                            {/* Evidence Header */}
                            <div className="bg-tron-cyan/10 px-4 py-2 border-b border-tron-cyan/20 flex justify-between items-center">
                                <div className="flex gap-2 items-center">
                                    <Fingerprint size={14} className="text-tron-cyan" />
                                    <span className="font-bold text-tron-cyan tracking-wider">COMMISSIONING EVENT</span>
                                </div>
                                <span className="text-tron-muted text-[10px]">{new Date(evt.timestamp).toLocaleString()}</span>
                            </div>
                            
                            {/* Document Payload viewer */}
                            <div className="p-4 relative group">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={() => copyToClipboard(JSON.stringify(evt.epcisDocument, null, 2), evt.id)}
                                        className="bg-tron-cyan/20 text-tron-cyan hover:bg-tron-cyan hover:text-black p-1.5 rounded transition-colors"
                                        title="Copy JSON-LD"
                                    >
                                        {copiedId === evt.id ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                                
                                <div className="mb-2 text-[10px] flex gap-2 flex-wrap">
                                    <span className="px-1.5 py-0.5 bg-black rounded border border-white/10 text-white/70">HW: {evt.device}</span>
                                    <span className="px-1.5 py-0.5 bg-tron-success/20 rounded border border-tron-success/30 text-tron-success">ACTION: {evt.action}</span>
                                </div>
                                
                                <pre className="text-[10px] leading-relaxed text-white/60 overflow-x-auto pb-2">
                                    <span className="text-tron-cyan/60">{"{"}</span>
                                    {'\n  '}
                                    <span className="text-tron-muted">"@context"</span>: ["https://gs1.github.io/EPCIS/epcis-context.jsonld"],
                                    <br/>
                                    {'  '}
                                    <span className="text-tron-muted">"type"</span>: "{evt.epcisDocument.type}",
                                    <br/>
                                    {'  '}
                                    <span className="text-tron-muted">"epcList"</span>: [
                                    <br/>
                                    {'    '}<span className="text-tron-success">"{evt.target}"</span>
                                    <br/>
                                    {'  '}],
                                    <br/>
                                    {'  '}
                                    <span className="text-tron-muted">"readPoint"</span>: {`{ "id": "${evt.epcisDocument.readPoint.id}" }`},
                                    <br/>
                                    {'  '}
                                    <span className="text-tron-muted">"bizLocation"</span>: {`{ "id": "${evt.epcisDocument.bizLocation.id}" }`},
                                    <br/>
                                    {'  '}
                                    <span className="text-tron-muted">"eventTime"</span>: "{evt.epcisDocument.eventTime}",
                                    <br/>
                                    {'  '}
                                    <span className="text-tron-muted">"ilmd"</span>: {'{ ... }'}
                                    <br/>
                                    <span className="text-tron-cyan/60">{"}"}</span>
                                </pre>
                            </div>
                        </div>
                    ))}
                    <div ref={rightBottomRef} />
                </div>
                
                <div className="mt-2 flex justify-between text-[10px] text-tron-cyan/60 uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Database size={10} /> Validated Events: {epcisEvents.length}</span>
                    <span>Local Memory Only</span>
                </div>
            </Card>
        </div>
    );
};
