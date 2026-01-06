import React from 'react';
import { LayoutDashboard, Radio, Settings, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { useMQTT } from '../store/MQTTContext';

interface NavItemProps {
    icon: React.ElementType;
    label: string;
    active?: boolean;
    onClick?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active, onClick }) => (
    <button
        onClick={onClick}
        className={cn(
            "flex items-center gap-3 px-4 py-3 w-full rounded-lg transition-all duration-300 group",
            active
                ? "bg-tron-cyan/10 text-tron-cyan shadow-neon-cyan border border-tron-cyan/30"
                : "text-tron-muted hover:text-tron-cyan hover:bg-tron-cyan/5"
        )}
    >
        <Icon size={20} className={cn("transition-transform group-hover:scale-110", active && "animate-pulse")} />
        <span className="font-orbitron tracking-wider text-sm">{label}</span>
    </button>
);

export const DashboardLayout: React.FC<{
    children: React.ReactNode;
    activeView: string;
    onNavigate: (view: string) => void;
}> = ({ children, activeView, onNavigate }) => {
    const { status } = useMQTT();

    const statusColors = {
        connected: 'text-tron-success bg-tron-success',
        connecting: 'text-yellow-400 bg-yellow-400',
        disconnected: 'text-tron-muted bg-tron-muted',
        error: 'text-tron-error bg-tron-error'
    };

    return (
        <div className="flex h-screen overflow-hidden bg-tron-bg text-tron-text selection:bg-tron-cyan selection:text-black">
            {/* Sidebar */}
            <aside className="w-64 border-r border-tron-border bg-black/20 backdrop-blur-xl flex flex-col relative z-20">
                <div className="p-6 border-b border-tron-border">
                    <h1 className="text-2xl font-orbitron font-bold text-transparent bg-clip-text bg-gradient-to-r from-tron-cyan to-blue-500 tracking-widest drop-shadow-[0_0_10px_rgba(0,243,255,0.3)]">
                        INCENDO
                        <span className="text-xs block text-tron-muted font-mono tracking-widest mt-1 opacity-70">COMMAND CENTER</span>
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    <NavItem icon={LayoutDashboard} label="DASHBOARD" active={activeView === 'dashboard'} onClick={() => onNavigate('dashboard')} />
                    <NavItem icon={Radio} label="DEVICES" active={activeView === 'devices'} onClick={() => onNavigate('devices')} />
                    <NavItem icon={Activity} label="ACTIVITY" active={activeView === 'activity'} onClick={() => onNavigate('activity')} />
                    <NavItem icon={Settings} label="SETTINGS" active={activeView === 'settings'} onClick={() => onNavigate('settings')} />
                </nav>

                <div className="p-4 border-t border-tron-border">
                    <div className="tron-panel p-3 flex items-center gap-3">
                        <div className={cn("w-2 h-2 rounded-full shadow-neon-green animate-pulse", statusColors[status].split(' ')[1])} />
                        <div className="flex flex-col">
                            <span className="text-xs text-tron-muted font-mono">MQTT SERVER</span>
                            <span className={cn("text-sm font-bold uppercase", statusColors[status].split(' ')[0])}>{status}</span>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden flex flex-col">
                {/* Top Header / Status Bar */}
                <header className="h-16 border-b border-tron-border bg-black/20 backdrop-blur-md flex items-center justify-between px-8 z-10">
                    <div className="flex items-center gap-2">
                        <span className="text-tron-cyan font-mono text-sm">[SYSTEM_READY]</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Placeholder for user/system info */}
                        <div className="text-xs font-mono text-tron-muted">V1.0.0-ALPHA</div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-auto p-8 relative">
                    {/* Decorative Grid Overlay */}
                    <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(0,243,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]" />

                    <div className="relative z-10 max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
};
