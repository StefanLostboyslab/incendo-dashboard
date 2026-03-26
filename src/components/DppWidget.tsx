import React, { useEffect, useState } from 'react';
import { ExternalLink, Loader2, Check, Link } from 'lucide-react';
import { fetchWhattProduct } from '../lib/whatt';

interface DppWidgetProps {
    title: string;
    dppUrl?: string; // Optional: If undefined, renders a fallback style
    isActive: boolean;
    onToggle: () => void;
    onUrlChange?: (url: string) => void;
    type: 'checkbox' | 'radio';
}

export const DppWidget: React.FC<DppWidgetProps> = ({ title, dppUrl, isActive, onToggle, onUrlChange, type }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [isEditingUrl, setIsEditingUrl] = useState(false);
    const [editUrl, setEditUrl] = useState(dppUrl || '');

    useEffect(() => {
        if (!dppUrl) return;
        let isMounted = true;
        setLoading(true);
        
        fetchWhattProduct(dppUrl)
            .then(product => {
                if (isMounted && product) {
                    setData(product);
                }
            })
            .catch(err => console.error("Failed to fetch DPP:", err))
            .finally(() => {
                if (isMounted) setLoading(false);
            });
        
        return () => { isMounted = false; };
    }, [dppUrl]);

    return (
        <div 
            onClick={onToggle}
            className={`
                relative flex flex-col justify-between overflow-hidden cursor-pointer
                border transition-all duration-300 rounded-lg min-h-[220px]
                ${isActive 
                    ? 'border-tron-cyan bg-tron-cyan/10 ring-2 ring-tron-cyan shadow-[0_0_20px_rgba(0,255,255,0.2)] scale-[1.02] z-10' 
                    : 'border-white/5 bg-black/80 hover:border-tron-cyan/40 hover:bg-black/60 opacity-50 grayscale hover:opacity-100 hover:grayscale-0'
                }
            `}
        >
            {/* Active Indicator */}
            <div className={`absolute top-1.5 right-1.5 w-4 h-4 rounded-full border flex items-center justify-center z-10 transition-colors
                ${isActive ? 'border-tron-cyan bg-tron-cyan text-black' : 'border-tron-border/50 bg-black/50'}
                ${type === 'checkbox' ? 'rounded-[4px]' : 'rounded-full'}
            `}>
                {isActive && <Check size={12} strokeWidth={4} />}
            </div>

            {/* Media / Header area */}
            <div className="h-[150px] w-full relative flex items-center justify-center p-0">
                {loading ? (
                    <Loader2 className="animate-spin text-tron-cyan/50" size={20} />
                ) : data?.main_image || data?.images?.[0] ? (
                    <img 
                        src={data?.main_image || data?.images?.[0]} 
                        alt={data?.name || title} 
                        className={`w-full h-full object-cover object-center rounded-t-lg drop-shadow-[0_0_8px_rgba(0,0,0,0.8)] ${isActive ? 'brightness-110' : 'brightness-75'} transition-all duration-300`}
                    />
                ) : (
                    <div className="w-full h-full m-2 border border-dashed border-tron-cyan/20 flex flex-col items-center justify-center opacity-40 bg-tron-cyan/5 rounded">
                        <span className="text-[9px] uppercase text-tron-cyan tracking-widest px-2 text-center leading-tight">{title}</span>
                    </div>
                )}
            </div>

            {/* Text Context */}
            <div className="p-2 flex flex-col flex-1 bg-gradient-to-t from-black/90 to-transparent relative z-20 justify-end min-h-[50px]">
                <span className={`text-[9px] font-bold uppercase tracking-wider truncate leading-tight ${isActive ? 'text-white' : 'text-white/60'}`} title={data?.name || title}>
                    {data?.name || title}
                </span>
                {isEditingUrl ? (
                    <div className="flex w-full gap-1 mt-1" onClick={e => e.stopPropagation()}>
                        <input type="url" value={editUrl} onChange={e => setEditUrl(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { onUrlChange?.(editUrl); setIsEditingUrl(false); } }} className="w-full text-[8px] bg-black/50 border border-tron-cyan/30 text-tron-cyan px-1 outline-none" autoFocus placeholder="https://..." />
                        <button onClick={() => { onUrlChange?.(editUrl); setIsEditingUrl(false); }} className="text-[8px] bg-tron-cyan hover:bg-white text-black px-1 transition-colors"><Check size={8} strokeWidth={3}/></button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between mt-0.5" onClick={e => e.stopPropagation()}>
                        {dppUrl ? (
                            <a href={dppUrl} target="_blank" rel="noreferrer" className="text-[8px] text-tron-cyan/70 hover:text-tron-cyan transition-colors flex items-center gap-1 uppercase">
                                <ExternalLink size={8} /> DPP Data
                            </a>
                        ) : (
                            <span className="text-[8px] text-tron-muted uppercase">No DPP Link</span>
                        )}
                        {onUrlChange && (
                            <button onClick={() => { setEditUrl(dppUrl || ''); setIsEditingUrl(true); }} className="text-tron-cyan/50 hover:text-tron-cyan transition-colors p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-tron-cyan" title="Link Custom DPP"><Link size={10}/></button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
