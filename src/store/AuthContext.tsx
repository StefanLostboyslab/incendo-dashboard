import React, { createContext, useContext, useState, useEffect } from 'react';
import type { WhattUser, WhattTeam } from '../lib/whatt';
import { loginToWhattIo, fetchWhattProfile, switchWhattTeam } from '../lib/whatt';

interface AuthContextType {
    user: WhattUser | null;
    token: string | null;
    teams: WhattTeam[];
    activeTeam: string | null; // Team ID saved as string for easier DOM binding
    login: (email: string, pass: string) => Promise<boolean>;
    logout: () => void;
    setActiveTeam: (teamId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<WhattUser | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [teams, setTeams] = useState<WhattTeam[]>([]);
    const [activeTeam, setActiveTeam] = useState<string | null>(null);

    // Rehydrate session
    useEffect(() => {
        const _token = localStorage.getItem('whattio_token');
        const _user = localStorage.getItem('whattio_user');
        const _teams = localStorage.getItem('whattio_teams');
        const _active = localStorage.getItem('whattio_active_team');
        
        if (_token && _user) {
            setToken(_token);
            setUser(JSON.parse(_user));
            if (_teams) setTeams(JSON.parse(_teams));
            if (_active) setActiveTeam(_active);
        }
    }, []);

    const login = async (email: string, pass: string) => {
        const response = await loginToWhattIo(email, pass);
        if (response && response.success && response.data) {
            const { user: userData, token: userToken } = response.data;
            
            setToken(userToken);
            setUser(userData);
            
            // Fetch teams correctly using the token
            const profileResponse = await fetchWhattProfile(userToken);
            let userTeams: WhattTeam[] = [];
            if (profileResponse && profileResponse.success && profileResponse.data) {
                userTeams = profileResponse.data.teams || [];
                setTeams(userTeams);
                if (userTeams.length > 0 && !userData.current_team_id) {
                    setActiveTeam(userTeams[0].id.toString());
                    localStorage.setItem('whattio_active_team', userTeams[0].id.toString());
                } else if (userData.current_team_id) {
                    setActiveTeam(userData.current_team_id.toString());
                    localStorage.setItem('whattio_active_team', userData.current_team_id.toString());
                }
            }
            
            localStorage.setItem('whattio_token', userToken);
            localStorage.setItem('whattio_user', JSON.stringify(userData));
            localStorage.setItem('whattio_teams', JSON.stringify(userTeams));
            
            return true;
        }
        return false;
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        setTeams([]);
        setActiveTeam(null);
        localStorage.removeItem('whattio_token');
        localStorage.removeItem('whattio_user');
        localStorage.removeItem('whattio_teams');
        localStorage.removeItem('whattio_active_team');
    };

    const handleSetActiveTeam = async (teamId: string) => {
        setActiveTeam(teamId);
        localStorage.setItem('whattio_active_team', teamId);
        if (token) {
            await switchWhattTeam(token, parseInt(teamId, 10));
        }
    };

    return (
        <AuthContext.Provider value={{
            user, token, teams, activeTeam,
            login, logout, setActiveTeam: handleSetActiveTeam
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
