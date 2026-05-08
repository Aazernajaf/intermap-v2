import React, { useState } from 'react';
import { Feature, ObjectStatus, AuditLogEntry, UtilityLog, SystemConfig } from '../types';
import { UtilityManager } from './UtilityManager';
import { AuditLog } from './AuditLog';

interface RightPanelProps {
  feature: Feature;
  onClose: () => void;
  updateFeature: (id: string, updates: Partial<Feature['properties']>) => void;
  onDelete: (id: string) => void;
  editingVertices: boolean;
  setEditingVertices: (v: boolean) => void;
  systemConfig: SystemConfig;
  logs: AuditLogEntry[];
  utilityLogs: UtilityLog[];
  addUtilityLog: (log: Omit<UtilityLog, 'id' | 'timestamp'>) => void;
}

type TabType = 'info' | 'finance' | 'utility' | 'history';

export const RightPanel: React.FC<RightPanelProps> = ({
  feature, onClose, updateFeature, onDelete, editingVertices, setEditingVertices,
  systemConfig, logs, utilityLogs, addUtilityLog
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('info');
  const [isEditing, setIsEditing] = useState(false);

  const { properties, category } = feature;
  const isMağaza = category === 'Mağaza';

  const statusColors: Record<ObjectStatus, string> = {
    'Boşdur': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    'İcarədədir': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    'Açıqdır': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'Bağlıdır': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    updateFeature(feature.id, { [name]: value });
  };

  return (
    <div className="fixed top-0 right-0 h-full z-40 w-[440px] flex flex-col pointer-events-none p-4">
      <div className="flex flex-col h-full premium-glass rounded-[32px] overflow-hidden pointer-events-auto spatial-glow m3-elevation-3">
        
        {/* ── Header ── */}
        <div className="flex-shrink-0 p-8 pb-6 border-b border-slate-100/50 dark:border-slate-800/50 bg-white/40 dark:bg-black/20">
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1 min-w-0 pr-4">
              <span className="inline-block px-3 py-1 rounded-lg bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] text-[10px] font-black uppercase tracking-[0.15em] border border-blue-100/30 dark:border-blue-800/30">
                {category}
              </span>
              <h2 className="text-[24px] font-black text-[var(--md-sys-color-on-surface)] mt-4 tracking-tighter leading-tight truncate">
                {properties.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary-container)] transition-all duration-300 shadow-sm"
            >
              <span className="material-symbol !text-[20px]">close</span>
            </button>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 ${
                isEditing 
                  ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-lg' 
                  : 'bg-[var(--md-sys-color-secondary-container)] text-[var(--md-sys-color-on-secondary-container)] hover:bg-[var(--md-sys-color-primary-container)]'
              }`}
            >
              <span className="material-symbol !text-[18px]">
                {isEditing ? 'check_circle' : 'edit'}
              </span>
              {isEditing ? 'Tamamla' : 'Redaktə'}
            </button>
            <button
              onClick={() => setEditingVertices(!editingVertices)}
              className={`w-14 h-14 flex items-center justify-center rounded-2xl transition-all duration-300 ${
                editingVertices 
                  ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)]' 
                  : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] hover:bg-[var(--md-sys-color-primary-container)]'
              }`}
              title="Sərhədləri redaktə et"
            >
              <span className="material-symbol">polyline</span>
            </button>
            <button
              onClick={() => { if(confirm('Silmək istədiyinizə əminsiniz?')) onDelete(feature.id); }}
              className="w-14 h-14 flex items-center justify-center rounded-2xl bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] hover:bg-red-500 hover:text-white transition-all duration-300"
              title="Sil"
            >
              <span className="material-symbol">delete</span>
            </button>
          </div>
        </div>

        {/* ── Tabs Navigation ── */}
        <div className="flex-shrink-0 px-8 bg-slate-50/20 dark:bg-slate-900/10 border-b border-slate-100/50 dark:border-slate-800/50">
          <div className="flex gap-8 overflow-x-auto no-scrollbar">
            {[
              { id: 'info', label: 'Məlumat', icon: 'info' },
              ...(isMağaza ? [
                { id: 'finance', label: 'Maliyyə', icon: 'payments' },
                { id: 'utility', icon: 'bolt' }
              ] : []),
              { id: 'history', icon: 'history' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 py-5 text-[10px] font-black uppercase tracking-[0.15em] transition-all relative ${
                  activeTab === tab.id 
                    ? 'text-[var(--md-sys-color-primary)]' 
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                <span className="material-symbol !text-[18px]">{tab.icon}</span>
                {tab.label && <span className="hidden sm:inline">{tab.label}</span>}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[var(--md-sys-color-primary)] rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab Content Area ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 min-h-0 space-y-8">
          {activeTab === 'info' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Status Section */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Obyekt Statusu</label>
                {isEditing ? (
                  <select
                    name="status"
                    title="Obyekt Statusu"
                    value={properties.status}
                    onChange={handleInputChange}
                    className="w-full p-4 bg-[var(--md-sys-color-surface-container-low)] border border-[var(--md-sys-color-outline-variant)] rounded-2xl text-[14px] font-bold outline-none focus:border-[var(--md-sys-color-primary)] transition-all"
                  >
                    <option value="Boşdur">Boşdur</option>
                    <option value="İcarədədir">İcarədədir</option>
                    <option value="Açıqdır">Açıqdır</option>
                    <option value="Bağlıdır">Bağlıdır</option>
                  </select>
                ) : (
                  <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border ${statusColors[properties.status || 'Boşdur']}`}>
                    <div className="w-2 h-2 rounded-full bg-current shadow-[0_0_8px_currentColor]" />
                    {properties.status || 'Boşdur'}
                  </div>
                )}
              </div>

              {/* Info Cards */}
              <div className="grid grid-cols-2 gap-6">
                <div className="p-6 bg-[var(--md-sys-color-surface-container-low)] rounded-3xl border border-slate-100 dark:border-slate-800 m3-elevation-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbol !text-[16px] text-[var(--md-sys-color-primary)]">straighten</span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sahə</span>
                  </div>
                  <p className="text-[24px] font-black text-[var(--md-sys-color-on-surface)] tracking-tighter">
                    {properties.area || '0'} <span className="text-[10px] opacity-40">m²</span>
                  </p>
                </div>
                {isMağaza && (
                  <div className="p-6 bg-[var(--md-sys-color-surface-container-low)] rounded-3xl border border-slate-100 dark:border-slate-800 m3-elevation-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="material-symbol !text-[16px] text-indigo-500">layers</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Mərtəbə</span>
                    </div>
                    <p className="text-[24px] font-black text-[var(--md-sys-color-on-surface)] tracking-tighter">
                      {properties.floor || '1'}<span className="text-[10px] opacity-40">ci</span>
                    </p>
                  </div>
                )}
              </div>

              {/* Tenant Details */}
              {isMağaza && (
                <div className="p-8 bg-[var(--md-sys-color-surface-container-high)] rounded-3xl space-y-6 border border-white/5">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbol !text-[16px] text-[var(--md-sys-color-primary)]">person</span>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">İcarəçi</label>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        name="tenantName"
                        value={properties.tenantName || ''}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-white dark:bg-black/20 border border-[var(--md-sys-color-outline-variant)] rounded-xl text-[14px] font-bold outline-none"
                        placeholder="İcarəçinin adı"
                      />
                    ) : (
                      <p className="text-[16px] font-black text-[var(--md-sys-color-on-surface)] leading-snug">{properties.tenantName || 'Təyin edilməyib'}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="material-symbol !text-[16px] text-emerald-500">call</span>
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Əlaqə</label>
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        name="tenantPhone"
                        value={properties.tenantPhone || ''}
                        onChange={handleInputChange}
                        className="w-full p-4 bg-white dark:bg-black/20 border border-[var(--md-sys-color-outline-variant)] rounded-xl text-[14px] font-bold outline-none"
                        placeholder="Mobil nömrə"
                      />
                    ) : (
                      <p className="text-[16px] font-black text-[var(--md-sys-color-on-surface)]">{properties.tenantPhone || '—'}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-[var(--md-sys-color-primary)] rounded-[32px] p-8 text-[var(--md-sys-color-on-primary)] shadow-xl relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                <p className="text-[9px] font-black uppercase tracking-widest opacity-70 mb-3">Aylıq İcarə Haqqı</p>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-[48px] font-black tracking-tighter">{properties.rentalFee?.toLocaleString() || '0'}</h3>
                  <span className="text-[16px] font-black opacity-60">{properties.currency || 'AZN'}</span>
                </div>
                <div className="mt-8 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest bg-white/10 w-fit px-4 py-2 rounded-full backdrop-blur-md">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Bu ay ödənilib
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-6 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-slate-100 dark:border-slate-800 m3-elevation-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Depozit</p>
                  <p className="text-[20px] font-black text-[var(--md-sys-color-on-surface)] tracking-tighter">
                    {(properties.rentalFee ? properties.rentalFee * 2 : 0).toLocaleString()} 
                    <span className="text-[10px] opacity-40 ml-1">AZN</span>
                  </p>
                </div>
                <div className="p-6 bg-[var(--md-sys-color-surface-container-low)] rounded-2xl border border-slate-100 dark:border-slate-800 m3-elevation-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Borc</p>
                  <p className="text-[20px] font-black text-red-500 tracking-tighter">0 <span className="text-[10px] opacity-40 ml-1">AZN</span></p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'utility' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <UtilityManager 
                feature={feature}
                logs={utilityLogs}
                onAddLog={addUtilityLog}
                config={systemConfig}
              />
            </div>
          )}

          {activeTab === 'history' && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <AuditLog logs={logs} featureId={feature.id} />
            </div>
          )}
        </div> 

        {/* ── Footer ── */}
        <div className="flex-shrink-0 p-8 bg-slate-50/50 dark:bg-black/20 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sinxronizasiya</span>
            <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Onlayn</span>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-slate-800">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">ID</span>
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 font-mono tracking-tight">{feature.id}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
