import React from 'react';
import { useLights } from '../hooks/useLights';
import { Card } from './UIComponents';
import { Lightbulb, Power } from 'lucide-react';
import { cn } from '../lib/utils';

export const LightPanel: React.FC = () => {
    const { lights, setLight, toggleLight } = useLights();

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lights.map((light) => (
                <Card key={light.id} className="relative group overflow-hidden">
                    {/* Background glow effect based on brightness */}
                    <div
                        className="absolute inset-0 bg-tron-cyan/5 transition-opacity duration-300 pointer-events-none"
                        style={{ opacity: light.value / 510 }} // max 0.5 opacity
                    />

                    <div className="relative z-10 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => toggleLight(light.id)}
                                    className={cn(
                                        "p-2 rounded-lg transition-all duration-300 cursor-pointer hover:scale-110 active:scale-95",
                                        light.value > 0
                                            ? "bg-tron-cyan text-black shadow-neon-cyan"
                                            : "bg-tron-bg border border-tron-muted/30 text-tron-muted hover:border-tron-cyan hover:text-tron-cyan"
                                    )}
                                >
                                    <Lightbulb size={24} className={cn(light.value > 0 && "fill-current")} />
                                </button>
                                <div>
                                    <h3 className="font-orbitron font-bold text-lg">{light.name}</h3>
                                    <p className="text-xs font-mono text-tron-muted">
                                        {light.type === 'pwm' ? 'DIMMABLE' : 'SWITCH'}
                                    </p>
                                    <p className="text-[10px] font-mono text-tron-muted/60 mt-1 truncate max-w-[150px]" title={light.commandTopic}>
                                        {light.commandTopic}
                                    </p>
                                </div>
                            </div>
                            <div className="font-mono text-xl font-bold text-tron-cyan">
                                {Math.round((light.value / 255) * 100)}%
                            </div>
                        </div>

                        <div className="pt-4">
                            {light.type === 'pwm' ? (
                                <div className="space-y-4">
                                    <input
                                        type="range"
                                        min="0"
                                        max="255"
                                        value={light.value}
                                        onChange={(e) => setLight(light.id, parseInt(e.target.value))}
                                        className="w-full h-2 bg-tron-bg border border-tron-border rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-tron-cyan [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-neon-cyan transition-all"
                                    />
                                    <div className="flex justify-between">
                                        <button
                                            onClick={() => setLight(light.id, 0)}
                                            className="text-xs font-mono text-tron-muted hover:text-white transition-colors"
                                        >
                                            OFF
                                        </button>
                                        <button
                                            onClick={() => setLight(light.id, 255)}
                                            className="text-xs font-mono text-tron-muted hover:text-white transition-colors"
                                        >
                                            MAX
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => toggleLight(light.id)}
                                    className={cn(
                                        "w-full py-3 rounded-lg font-orbitron tracking-widest text-sm font-bold border transition-all duration-300 flex items-center justify-center gap-2",
                                        light.value > 0
                                            ? "bg-tron-cyan text-black border-tron-cyan shadow-neon-cyan hover:bg-white"
                                            : "bg-transparent text-tron-muted border-tron-muted/30 hover:border-tron-cyan hover:text-tron-cyan"
                                    )}
                                >
                                    <Power size={18} />
                                    {light.value > 0 ? 'TURN OFF' : 'TURN ON'}
                                </button>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
};
