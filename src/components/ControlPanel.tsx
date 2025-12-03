import React, { useState } from 'react';
import { ConfigState, ViewConfig } from '../types';
import { Upload, Download, Palette, Layers, Info, LogOut } from 'lucide-react';
import TextureEditor from './TextureEditor';
import { logAction } from '../services/logger';
import { supabase } from '../services/supabaseClient';
import SecurityPanel from './SecurityPanel';
import FakeAttackLogger from './FakeAttackLogger';

interface ControlPanelProps {
  config: ConfigState;
  setConfig: React.Dispatch<React.SetStateAction<ConfigState>>;
  onDownloadPreview: () => void;
  isUpdating: boolean;
  onViewChangeRequest: (view: 'front' | 'back') => void;
  user: any;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ config, setConfig, onDownloadPreview, isUpdating, onViewChangeRequest, user }) => {
  const [activeTab, setActiveTab] = useState<'design' | 'layers'>('design');
  const [activeSide, setActiveSide] = useState<'front' | 'back'>('front');
    const [showSecurity, setShowSecurity] = useState(false);
    const [showFakeLogger, setShowFakeLogger] = useState(false);

  // Helper to update only the ACTIVE side configuration
  const updateActiveSide = (updater: (prevSide: ViewConfig) => ViewConfig) => {
      setConfig(prev => ({
          ...prev,
          [activeSide]: updater(prev[activeSide])
      }));
  };

  const handleSideChange = (side: 'front' | 'back') => {
      setActiveSide(side);
      onViewChangeRequest(side);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Log the upload action
      logAction(user.id, user.email, 'upload_image', `Uploaded file: ${file.name} (${file.type})`);

      const reader = new FileReader();
      reader.onload = (event) => {
        updateActiveSide(prev => ({
            ...prev,
            image: { 
                ...prev.image, 
                src: event.target?.result as string,
                transform: { x: 50, y: 50, scale: 1, rotation: 0 } // Reset pos
            }
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogout = async () => {
            try {
                // Log logout intent (use provided user info before session is cleared)
                if (user) {
                    try { await logAction(user.id, user.email, 'logout', 'User initiated logout'); } catch (e) { /* ignore */ }
                } else {
                    try { await logAction('unknown', undefined, 'logout', 'User initiated logout'); } catch (e) { /* ignore */ }
                }
            } finally {
                await supabase.auth.signOut();
            }
  };

  // Get current view config
  const currentView = config[activeSide];

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-96 shadow-2xl z-20 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
        <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">3D Zheide</h1>
            <p className="text-xs text-gray-500 truncate max-w-[120px]">{user?.email}</p>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleLogout}
                className="p-2 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Шығу"
            >
                <LogOut size={18} />
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Navigation Tabs */}
        <div className="flex px-5 pt-4 pb-0 gap-4 border-b border-gray-100">
            <button 
                onClick={() => setActiveTab('design')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'design' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
            >
                <div className="flex items-center gap-2"><Palette size={14}/> Дизайн</div>
            </button>
            <button 
                onClick={() => setActiveTab('layers')}
                className={`pb-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'layers' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500'}`}
            >
                <div className="flex items-center gap-2"><Layers size={14}/> Қабаттар</div>
            </button>
        </div>

        {activeTab === 'design' ? (
            <div className="p-6 space-y-6">
                
                {/* Side Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => handleSideChange('front')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeSide === 'front' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Алды
                    </button>
                    <button 
                        onClick={() => handleSideChange('back')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-all ${activeSide === 'back' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Арты
                    </button>
                </div>

                {/* Visual Editor Area */}
                <section>
                    <div className="flex justify-between items-center mb-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                            {activeSide === 'front' ? 'Алдыңғы жағы' : 'Артқы жағы'}
                        </label>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Интерактивті</span>
                    </div>
                    
                    <TextureEditor 
                        viewConfig={currentView} 
                        setViewConfig={(newConfig) => {
                            if (typeof newConfig === 'function') {
                                updateActiveSide(newConfig);
                            } else {
                                updateActiveSide(() => newConfig);
                            }
                        }}
                        baseColor={config.baseColor}
                    />
                    
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                        <Info size={12} className="min-w-[12px]" />
                        Жылжыту үшін сүйреңіз. Өлшемін өзгерту және бұру үшін бұрыштарын пайдаланыңыз.
                    </p>
                </section>

                <hr className="border-gray-100" />

                {/* Base Color */}
                <section>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Өнім Түсі</label>
                    <div className="flex flex-wrap gap-3">
                        {['#ffffff', '#1f2937', '#dc2626', '#16a34a', '#2563eb', '#f59e0b', '#7c3aed'].map(color => (
                        <button
                            key={color}
                            onClick={() => setConfig(prev => ({ ...prev, baseColor: color }))}
                            className={`w-9 h-9 rounded-full border-2 transition-transform ${config.baseColor === color ? 'border-blue-500 scale-110 shadow-md' : 'border-gray-200 hover:scale-105'}`}
                            style={{ backgroundColor: color }}
                            title={color}
                        />
                        ))}
                        <div className="relative w-9 h-9 rounded-full border-2 border-dashed border-gray-300 hover:border-blue-400 flex items-center justify-center overflow-hidden">
                            <input 
                                type="color" 
                                value={config.baseColor}
                                onChange={(e) => setConfig(prev => ({ ...prev, baseColor: e.target.value }))}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <span className="text-xs text-gray-400">+</span>
                        </div>
                    </div>
                </section>

                <hr className="border-gray-100" />

                {/* Upload Image */}
                <section>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Сурет Қосу</label>
                    <div className="grid grid-cols-2 gap-3">
                         <div className="relative group border border-gray-200 rounded-lg p-3 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer text-center bg-white">
                            <Upload size={20} className="mx-auto text-gray-400 group-hover:text-blue-500 mb-1" />
                            <span className="text-xs text-gray-600 font-medium">Сурет Жүктеу</span>
                            <input 
                                type="file" 
                                accept="image/*" 
                                onChange={handleImageUpload} 
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </div>
                         <div className="border border-gray-200 rounded-lg p-3 text-center bg-gray-50 opacity-60 cursor-not-allowed">
                            <span className="text-xs text-gray-400">Кітапхана (Жақында)</span>
                        </div>
                    </div>
                </section>

                {/* Text Tool */}
                <section>
                    <label className="text-sm font-semibold text-gray-700 mb-3 block">Мәтін Қосу</label>
                    <div className="flex gap-2 mb-3">
                        <input
                            type="text"
                            value={currentView.text.content}
                            onChange={(e) => updateActiveSide(prev => ({ ...prev, text: { ...prev.text, content: e.target.value } }))}
                            placeholder="Мәтін жазыңыз..."
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white text-gray-900"
                        />
                         <input 
                            type="color" 
                            value={currentView.text.color}
                            onChange={(e) => updateActiveSide(prev => ({...prev, text: {...prev.text, color: e.target.value}}))}
                            className="h-10 w-10 p-1 rounded-lg border border-gray-300 cursor-pointer bg-white"
                        />
                    </div>
                    <select 
                        value={currentView.text.fontFamily}
                        onChange={(e) => updateActiveSide(prev => ({...prev, text: {...prev.text, fontFamily: e.target.value}}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:border-blue-500 text-gray-900"
                    >
                        <option value="Arial">Arial (Sans Serif)</option>
                        <option value="Times New Roman">Times New Roman (Serif)</option>
                        <option value="Courier New">Courier New (Monospace)</option>
                        <option value="Georgia">Georgia (Serif)</option>
                        <option value="Verdana">Verdana (Sans Serif)</option>
                        <option value="Impact">Impact (Display)</option>
                    </select>
                </section>

            </div>
        ) : (
            <div className="p-6 text-center text-gray-500">
                <p>Қабаттарды басқару жақында қосылады.</p>
            </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-5 border-t border-gray-100 bg-gray-50">
                        <div className="mb-3 space-y-2">
                            <button onClick={() => setShowSecurity(true)} className="w-full text-xs text-gray-600 border rounded px-3 py-2 bg-white">Қауіпсіздік бағалау</button>
                            <button onClick={() => setShowFakeLogger(true)} className="w-full text-xs text-gray-600 border rounded px-3 py-2 bg-white">Өтірік шабуылдар</button>
                        </div>
         <button
            onClick={onDownloadPreview}
            className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl hover:bg-slate-800 transition-all shadow-lg active:scale-95"
         >
            <Download size={18} />
            <span className="font-medium">Дизайнды Жүктеу</span>
         </button>
         {isUpdating && (
             <div className="mt-2 text-center text-[10px] text-blue-500 font-medium animate-pulse uppercase tracking-wider">
                 3D модельмен синхрондау...
             </div>
         )}
    </div>
        {showSecurity && <SecurityPanel onClose={() => setShowSecurity(false)} />}
        {showFakeLogger && <FakeAttackLogger onClose={() => setShowFakeLogger(false)} />}
    </div>
  );
};

export default ControlPanel;
