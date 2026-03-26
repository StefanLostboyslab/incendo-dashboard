import React from 'react';
import { cn } from '../lib/utils';
import { RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

// --- Card Component ---
export const Card: React.FC<{ children: React.ReactNode; className?: string; title?: string; onClick?: () => void }> = ({
    children, className, title, onClick
}) => (
    <div className={cn("tron-panel p-6 relative overflow-hidden group", className, onClick && "cursor-pointer")} onClick={onClick}>
        {title && (
            <h3 className="text-lg font-orbitron font-bold text-tron-cyan mb-4 tracking-wider flex items-center gap-2">
                <span className="w-1 h-4 bg-tron-cyan shadow-neon-cyan/50 inline-block rounded-sm" />
                {title}
            </h3>
        )}
        {children}
        {/* Corner accents */}
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-tron-cyan/50 rounded-tl-lg" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-tron-cyan/50 rounded-tr-lg" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-tron-cyan/50 rounded-bl-lg" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-tron-cyan/50 rounded-br-lg" />
    </div>
);

// --- Button Component ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    className, variant = 'primary', isLoading, children, ...props
}) => {
    const baseStyles = "relative inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg font-orbitron font-bold text-sm tracking-widest uppercase transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed";

    const variants = {
        primary: "bg-tron-cyan text-black hover:bg-tron-cyanHover hover:shadow-neon-cyan border border-transparent",
        secondary: "bg-transparent border border-tron-cyan text-tron-cyan hover:bg-tron-cyan/10 hover:shadow-neon-cyan",
        danger: "bg-transparent border border-tron-error text-tron-error hover:bg-tron-error/10 hover:shadow-[0_0_10px_#ff005533]",
        ghost: "bg-transparent text-tron-muted hover:text-tron-cyan hover:bg-white/5",
    };

    return (
        <button className={cn(baseStyles, variants[variant], className)} disabled={isLoading} {...props}>
            {isLoading && <RefreshCw className="animate-spin" size={16} />}
            {children}
        </button>
    );
};

// --- Input Component ---
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className, ...props }) => (
    <div className="space-y-1.5 w-full">
        {label && <label className="text-xs font-mono text-tron-muted uppercase tracking-wider">{label}</label>}
        <input
            className={cn("tron-input w-full", error && "border-tron-error focus:border-tron-error focus:shadow-[0_0_10px_#ff005533]", className)}
            {...props}
        />
        {error && <span className="text-xs text-tron-error font-mono">{error}</span>}
    </div>
);

// --- Status Badge ---
export const StatusBadge: React.FC<{ status: 'online' | 'offline' | 'busy'; className?: string }> = ({ status, className }) => {
    const styles = {
        online: "bg-tron-success/10 text-tron-success border-tron-success/20",
        offline: "bg-tron-error/10 text-tron-error border-tron-error/20",
        busy: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
    };

    const icons = {
        online: CheckCircle2,
        offline: AlertCircle,
        busy: RefreshCw,
    };

    const Icon = icons[status];

    return (
        <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border uppercase tracking-wide", styles[status], className)}>
            <Icon size={12} className={cn(status === 'busy' && "animate-spin")} />
            {status}
        </span>
    );
};
