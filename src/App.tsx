import { useState } from 'react';
import { DashboardLayout } from './components/DashboardLayout';
import { DeviceGrid } from './components/DeviceGrid';
import { LightPanel } from './components/LightPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { CommandPanel } from './components/CommandPanel';
import { ActivityLog } from './components/ActivityLog';
import { AddDeviceModal } from './components/AddDeviceModal';
import { DeviceProvider } from './store/DeviceContext';
import { MQTTProvider } from './store/MQTTContext';
import { ActivityProvider } from './store/ActivityContext';
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

  return (
    <ActivityProvider>
      <MQTTProvider>
        <DeviceProvider>
          <DiscoveryController />
          <DashboardLayout activeView={currentView} onNavigate={setCurrentView}>
            <div className="space-y-8">
              {/* Action Bar */}
              {currentView === 'dashboard' && (
                <div className="flex justify-between items-end pb-6 border-b border-tron-border/30">
                  <div>
                    <h1 className="text-3xl font-orbitron font-bold text-white mb-2">DASHBOARD OVERVIEW</h1>
                    <p className="text-tron-muted font-mono text-sm max-w-2xl">
                      Manage your networked Incendo devices. Monitor status, deploy updates, and broadcast commands to your fleet.
                    </p>
                  </div>
                  <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
                    <Plus size={18} /> Add Device
                  </Button>
                </div>
              )}

              {/* Main Content */}
              {/* Main Content */}
              {currentView === 'dashboard' && (
                <div className="flex flex-col gap-8 h-full overflow-hidden">
                  {/* Full Width Command Panel */}
                  <div className="flex-none">
                    <CommandPanel />
                  </div>

                  {/* Device Grid below */}
                  <div className="flex-1 overflow-auto pr-2">
                    <DeviceGrid />
                  </div>
                </div>
              )}
              {currentView === 'lights' && <LightPanel />}
              {currentView === 'devices' && <DeviceGrid />}
              {currentView === 'settings' && <SettingsPanel />}
              {currentView === 'activity' && <ActivityLog />}
            </div>

            <AddDeviceModal
              isOpen={isAddModalOpen}
              onClose={() => setIsAddModalOpen(false)}
            />
          </DashboardLayout>
        </DeviceProvider>
      </MQTTProvider>
    </ActivityProvider>
  );
}


export default App;
