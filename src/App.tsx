import { useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { DeviceGrid } from './components/DeviceGrid';
import { LightPanel } from './components/LightPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { ActivityLog } from './components/ActivityLog';
import { AddDeviceModal } from './components/AddDeviceModal';
import { DeviceDetail } from './components/DeviceDetail';
import { DeviceProvider } from './store/DeviceContext';
import { MQTTProvider } from './store/MQTTContext';
import { ActivityProvider } from './store/ActivityContext';
import { AuthProvider } from './store/AuthContext';
import { Button } from './components/UIComponents';
import { useDiscovery } from './hooks/useDiscovery';
import { Plus } from 'lucide-react';

const DiscoveryController = () => {
  useDiscovery();
  return null;
};

function App() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const handleNavigate = (view: string) => {
    setCurrentView(view);
    setSelectedDeviceId(null);
  };

  return (
    <AuthProvider>
      <ActivityProvider>
      <MQTTProvider>
        <DeviceProvider>
          <DiscoveryController />
          <DashboardLayout activeView={currentView} onNavigate={handleNavigate}>
            <div className="space-y-8 h-full">
              {/* Action Bar */}
              {currentView === 'dashboard' && !selectedDeviceId && (
                <div className="flex justify-between items-end pb-6 border-b border-tron-border/30">
                  <div>
                    <h1 className="text-3xl font-orbitron font-bold text-white mb-2">DASHBOARD OVERVIEW</h1>
                    <h1 className="text-xl font-bold tracking-[0.2em] font-mono text-white flex items-center">
                    INCENDO
                </h1>
                  </div>
                  <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                    <Plus size={18} /> Add Device
                  </Button>
                </div>
              )}

              {/* Main Content Areas */}
              {selectedDeviceId ? (
                <DeviceDetail 
                   serialNumber={selectedDeviceId} 
                   onBack={() => setSelectedDeviceId(null)} 
                />
              ) : currentView === 'dashboard' ? (
                <div className="flex flex-col gap-8 h-full overflow-hidden">
                  <div className="flex-1 overflow-auto pr-2 pb-4">
                    <DeviceGrid onDeviceClick={(id) => setSelectedDeviceId(id)} />
                  </div>
                </div>
              ) : currentView === 'lights' ? (
                <LightPanel />
              ) : currentView === 'settings' ? (
                <SettingsPanel />
              ) : currentView === 'activity' ? (
                <ActivityLog />
              ) : null}
            </div>

            <AddDeviceModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
            />
          </DashboardLayout>
        </DeviceProvider>
      </MQTTProvider>
    </ActivityProvider>
    </AuthProvider>
  );
}


export default App;
