import React, { useState, useEffect } from 'react';
import type { IncendoDevice } from '../mqtt';
import { mqttService } from '../mqtt';
import { Activity, Send } from 'lucide-react';

interface Props {
  device: IncendoDevice;
  onPing: (id: string) => void;
  bizLocation: string;
}

export const DeviceControl: React.FC<Props> = ({ device, onPing, bizLocation }) => {
  const [url, setUrl] = useState(device.dpp_url || '');
  const [readPoint, setReadPoint] = useState(device.epcis?.readPoint?.id || '');

  useEffect(() => {
    if (device.epcis?.readPoint?.id) {
      setReadPoint(device.epcis.readPoint.id);
    }
  }, [device.epcis?.readPoint?.id]);

  const handleSendUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      mqttService.sendCommand(device.id, url);
    }
  };

  const handleSaveEpcis = (e: React.FormEvent) => {
    e.preventDefault();
    if (readPoint.trim()) {
      mqttService.sendConfig(device.id, {
        readPoint,
        bizLocation,
        deviceType: device.epcis?.ilmd?.deviceType || 'Incendo R4'
      });
    }
  };

  const isOnline = (Date.now() - device.lastSeen) < 15000; // Consider offline if no discovery message for 15s

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 shadow-lg max-w-sm w-full transition-all hover:border-gray-600">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-100 flex items-center gap-2">
            {device.id}
            <span className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
          </h3>
          <p className="text-xs text-gray-400 font-mono mt-1">{device.mac}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-blue-400">{device.ip}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button 
          onClick={() => onPing(device.id)}
          className="flex-1 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-4 rounded-lg flex justify-center items-center gap-2 transition-colors focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <Activity size={16} /> Ping LED
        </button>
      </div>

      <form onSubmit={handleSendUrl} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Set Display URL</label>
          <div className="flex bg-gray-900 rounded-lg overflow-hidden border border-gray-700 focus-within:border-blue-500 transition-colors">
            <input 
              type="text" 
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://whatt.io/..."
              className="w-full bg-transparent text-gray-200 text-sm py-2 px-3 focus:outline-none"
            />
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 flex items-center justify-center transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </form>

      <form onSubmit={handleSaveEpcis} className="space-y-3 mt-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">EPCIS Readpoint ID</label>
          <div className="flex bg-gray-900 rounded-lg overflow-hidden border border-gray-700 focus-within:border-blue-500 transition-colors">
            <input 
              type="text" 
              value={readPoint}
              onChange={(e) => setReadPoint(e.target.value)}
              placeholder="urn:epc:id:sgln:..."
              className="w-full bg-transparent text-gray-200 text-sm py-2 px-3 focus:outline-none"
            />
            <button 
              type="submit"
              title="Save Readpoint & Global BizLocation"
              className="bg-green-600 hover:bg-green-500 text-white px-3 flex items-center justify-center transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
