import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';
import { Button, Input } from './UIComponents';
import { LogIn, LogOut, ChevronDown } from 'lucide-react';

export const UserWidget: React.FC = () => {
    const { user, teams, activeTeam, login, logout, setActiveTeam } = useAuth();
    
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const success = await login(email, password);
        if (success) {
            setIsLoginOpen(false);
            setEmail('');
            setPassword('');
        } else {
            setError('Login failed. Check credentials.');
        }
    };

    if (!user) {
        return (
            <div className="relative">
                <Button variant="secondary" onClick={() => setIsLoginOpen(true)} className="flex items-center gap-2">
                    <LogIn size={16} /> Whatt.io Login
                </Button>

                {isLoginOpen && (
                    <div className="absolute right-0 top-full mt-2 w-72 bg-gray-900 border border-tron-cyan/20 p-4 rounded-lg shadow-neon-cyan z-50">
                        <h3 className="text-white font-orbitron mb-4">Login to whatt.io</h3>
                        <form onSubmit={handleLogin} className="space-y-3">
                            <div>
                                <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                            </div>
                            <div>
                                <Input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                            </div>
                            {error && <div className="text-tron-error text-xs">{error}</div>}
                            <div className="flex justify-end gap-2 pt-2">
                                <Button variant="secondary" onClick={() => setIsLoginOpen(false)}>Cancel</Button>
                                <Button variant="primary" type="submit">Log In</Button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="relative">
            <button 
                className="flex items-center gap-2 bg-black/40 hover:bg-black/60 border border-tron-cyan/20 rounded-full pr-4 p-1 transition-all"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
                <img src={user.profile_photo} alt={user.name} className="w-8 h-8 rounded-full border border-tron-cyan/50" />
                <span className="text-sm text-tron-cyan font-bold truncate max-w-[120px]">{user.name}</span>
                <ChevronDown size={14} className="text-tron-muted" />
            </button>

            {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-tron-cyan/20 rounded-lg shadow-neon-cyan z-50 overflow-hidden">
                    <div className="p-3 border-b border-white/5 bg-black/40">
                        <div className="text-xs text-tron-muted uppercase mb-1">Active Team</div>
                        <div className="relative group/team dropdown-container">
                            <button className="bg-black/50 border border-tron-cyan/30 hover:border-tron-cyan/60 text-white text-sm rounded p-2 w-full text-left flex justify-between items-center transition-colors">
                                <span className="truncate">{teams.find(t => t.id.toString() === (activeTeam || user.current_team_id?.toString()))?.name || 'Select Team'}</span>
                                <ChevronDown size={14} className="text-tron-cyan shrink-0" />
                            </button>
                            <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#0a0f18] border border-tron-cyan/30 rounded-lg shadow-[0_5px_15px_rgba(0,0,0,0.5)] z-[60] hidden group-hover/team:block hover:block">
                                {teams.map(t => {
                                    const isSelected = (activeTeam || user.current_team_id?.toString()) === t.id.toString();
                                    return (
                                        <button 
                                            key={t.id} 
                                            onClick={() => { setActiveTeam(t.id.toString()); setIsMenuOpen(false); }} 
                                            className={`w-full text-left px-3 py-2 text-sm hover:bg-tron-cyan/20 transition-colors ${isSelected ? 'text-tron-cyan bg-tron-cyan/5 font-bold' : 'text-white/80'}`}
                                        >
                                            {t.name}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={() => { logout(); setIsMenuOpen(false); }}
                        className="w-full text-left px-4 py-3 text-sm text-tron-error hover:bg-tron-error/10 flex items-center gap-2 transition-colors"
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            )}
        </div>
    );
};
