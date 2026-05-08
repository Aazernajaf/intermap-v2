import React, { useMemo, useState } from 'react';
// Material Symbols are used via the .material-symbol class
import { Feature, SystemConfig, ObjectStatus } from '../types';
import { ThemeSwitcher } from './ThemeSwitcher';

interface LeftPanelProps {
  mode: string;
  setMode: (mode: string, category?: string) => void;
  currentPolygon: [number, number][];
  finishCurrentPolygon: () => void;
  finishCurrentPath: () => void;
  cancelCurrentPolygon: () => void;
  features: Feature[];
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  setSelectedParentId: (id: string | null) => void;
  navId: string | null;
  setNavId: (id: string | null) => void;
  selectedFloor: number;
  setSelectedFloor: (floor: number) => void;
  editingVertices: boolean;
  setEditingVertices: (v: boolean) => void;
  viewMode: 'map' | 'list';
  setViewMode: (v: 'map' | 'list') => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  saveToDatabase: () => void;
  systemConfig: SystemConfig;
  onOpenSettings: () => void;
  showRows: boolean;
  setShowRows: (v: boolean) => void;
  lastSynced: Date | null;
  logs: any[];
  utilityLogs: any[];
}

const getStatusDot = (status: ObjectStatus) => {
  if (status === 'İcarədədir') return 'bg-[var(--md-sys-color-primary)]';
  if (status === 'Bağlıdır') return 'bg-[var(--md-sys-color-error)]';
  if (status === 'Açıqdır') return 'bg-emerald-500';
  return 'bg-slate-300';
};

export const LeftPanel: React.FC<LeftPanelProps> = ({
  mode, setMode, currentPolygon,
  finishCurrentPolygon, finishCurrentPath, cancelCurrentPolygon,
  features, selectedFeatureId, setSelectedFeatureId, setSelectedParentId,
  navId, setNavId, selectedFloor, setSelectedFloor,
  editingVertices, setEditingVertices,
  viewMode, setViewMode, saveStatus,
  systemConfig, onOpenSettings, showRows, setShowRows,
  lastSynced, logs, utilityLogs
}) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showSettingsMenu, setShowSettingsMenu] = React.useState(false);
  const occupancyRef = React.useRef<HTMLDivElement>(null);

  // --- Derived State ---
  const navItem = useMemo(() => features.find(f => f.id === navId), [features, navId]);
  const isInsideSira = navItem?.category === 'Sıra';
  const isInsideKorpus = navItem?.category === 'Korpus';

  const breadcrumbs = useMemo(() => {
    const list: { id: string | null; name: string }[] = [{ id: null, name: 'Əsas' }];
    if (navItem) {
      if (isInsideKorpus) {
        const sira = features.find(f => f.id === navItem.properties.parentId);
        if (sira) list.push({ id: sira.id, name: sira.properties.name });
      }
      list.push({ id: navItem.id, name: navItem.properties.name });
    }
    return list;
  }, [navItem, features, isInsideKorpus]);

  const floorCount = useMemo(() => {
    if (isInsideKorpus) return navItem?.properties.floorCount || 1;
    return 0;
  }, [isInsideKorpus, navItem]);

  const stats = useMemo(() => {
    const filtered = features.filter(f => {
      if (isInsideKorpus) return f.properties.parentId === navId && f.properties.floor === selectedFloor;
      if (isInsideSira) return f.properties.parentId === navId;
      return !f.properties.parentId && (f.category === 'Sıra' || f.category === 'Korpus');
    });

    const total = filtered.length;
    const occupied = filtered.filter(f => f.properties.status === 'İcarədədir').length;
    const totalArea = filtered.reduce((acc, f) => acc + (f.properties.area || 0), 0);

    return { total, occupied, totalArea, occupancyRate: total > 0 ? (occupied / total) * 100 : 0 };
  }, [features, navId, selectedFloor, isInsideKorpus, isInsideSira]);

  // Set occupancy width via ref to avoid inline style warnings
  React.useLayoutEffect(() => {
    if (occupancyRef.current) {
      occupancyRef.current.style.width = `${stats.occupancyRate}%`;
    }
  }, [stats.occupancyRate]);

  const currentViewItems = useMemo(() => {
    const items = features.filter(f => {
      if (searchQuery) {
        return f.properties.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
               f.properties.tenantName?.toLowerCase().includes(searchQuery.toLowerCase());
      }
      if (isInsideKorpus) return f.properties.parentId === navId && f.properties.floor === selectedFloor;
      if (isInsideSira) return f.properties.parentId === navId;
      return !f.properties.parentId && (f.category === 'Sıra' || f.category === 'Korpus');
    });
    return items.sort((a, b) => a.properties.name.localeCompare(b.properties.name));
  }, [features, navId, selectedFloor, isInsideKorpus, isInsideSira, searchQuery]);

  const handleItemClick = (item: Feature) => {
    if (item.category === 'Mağaza') {
      setSelectedFeatureId(item.id);
    } else {
      setNavId(item.id);
      setSelectedParentId(item.id);
      setSelectedFeatureId(null);
      setSearchQuery('');
    }
  };

  const category = (mode === 'draw-polygon' && currentPolygon.length > 0) ? 'Yeni Obyekt' : '';
  
  return (
    <div className="fixed top-0 left-0 h-full z-40 w-[460px] flex flex-col pointer-events-none p-6">
      <div className="flex flex-col h-full premium-glass rounded-[48px] overflow-hidden pointer-events-auto spatial-glow">
        
        {/* ── Header Area ── */}
        <div className="flex-shrink-0 p-10 pb-6 flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h1 className="text-[14px] font-bold tracking-[0.1em] leading-tight flex items-center gap-2">
                <span className="material-symbol text-[var(--md-sys-color-primary)]">map</span>
                <span className="text-slate-900 dark:text-white">INTERMAP</span>
                <span className="text-slate-400 dark:text-slate-500 font-medium text-[12px]">V2</span>
              </h1>
              <div className="flex items-center gap-2.5 mt-2">
                <div className={`w-1.5 h-1.5 rounded-full ${saveStatus === 'saving' ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`} />
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  {saveStatus === 'saving' ? 'Sinxronizasiya...' : 'Sistem Aktiv'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-[var(--md-sys-color-surface-container)] p-1.5 rounded-[22px] flex items-center gap-1.5 border border-slate-100 dark:border-slate-800/50">
                <ThemeSwitcher />
                <div className="relative">
                  <button
                    onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                    title="Ayarlar"
                    className={`p-3 rounded-2xl transition-all duration-300 ${showSettingsMenu ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] m3-elevation-2' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                  >
                    <span className="material-symbol !text-[20px]">settings</span>
                  </button>
                  {showSettingsMenu && (
                    <div className="absolute top-full right-0 mt-4 w-64 bg-[var(--md-sys-color-surface-container-high)] backdrop-blur-3xl border border-slate-200/50 dark:border-slate-800/50 rounded-[32px] shadow-2xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-300">
                      <button onClick={() => { setViewMode(viewMode === 'map' ? 'list' : 'map'); setShowSettingsMenu(false); }} className="w-full flex items-center gap-4 px-5 py-4 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all text-left group">
                        <div className="w-10 h-10 rounded-xl bg-[var(--md-sys-color-primary-container)] flex items-center justify-center text-[var(--md-sys-color-on-primary-container)] group-hover:scale-110 transition-transform">
                          <span className="material-symbol !text-[20px]">view_list</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{viewMode === 'map' ? 'Siyahı Görünüşü' : 'Xəritə Görünüşü'}</span>
                      </button>
                      <button onClick={() => { setShowRows(!showRows); setShowSettingsMenu(false); }} className="w-full flex items-center gap-4 px-5 py-4 rounded-[22px] hover:bg-[var(--md-sys-color-primary-container)]/30 transition-all text-left group">
                        <div className={`w-10 h-10 rounded-xl ${showRows ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] shadow-lg shadow-blue-500/30' : 'bg-[var(--md-sys-color-surface-container)] text-slate-400'} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <span className="material-symbol !text-[18px]">view_list</span>
                        </div>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Sıralar</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Search Box M3 */}
          <div className="relative group">
            <span className="material-symbol absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[var(--md-sys-color-primary)] transition-all duration-300">search</span>
            <input
              type="text"
              placeholder="Sistemdə axtarış..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-14 pr-6 py-4.5 bg-[var(--md-sys-color-surface-container)] border-none rounded-full text-[14px] font-medium text-slate-900 dark:text-white outline-none focus:bg-[var(--md-sys-color-surface-container-high)] m3-elevation-1 focus:m3-elevation-2 transition-all duration-300 placeholder:text-slate-400"
            />
          </div>

          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <div className="w-1.5 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 flex-shrink-0" />}
                <button
                  onClick={() => { setNavId(crumb.id); setSelectedFeatureId(null); setSearchQuery(''); }}
                  className={`flex-shrink-0 px-5 py-2 rounded-full text-[11px] font-semibold transition-all duration-300 flex items-center gap-2 ${
                    idx === breadcrumbs.length - 1
                      ? 'bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] m3-elevation-1'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {idx === 0 ? <span className="material-symbol !text-[16px] opacity-70">home</span> : null}
                  {crumb.name}
                </button>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ── Scrollable Content Area ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-10 py-4 space-y-10 min-h-0">
          
          {/* Stats Section */}
          {!searchQuery && (
            <div className="bg-premium-gradient rounded-[40px] p-8 relative overflow-hidden border border-blue-500/10 dark:border-white/5 shadow-inner">
              <div className="relative z-10">
                {isInsideKorpus && floorCount > 0 && (
                  <div className="flex gap-2.5 mb-10 overflow-x-auto no-scrollbar">
                    {Array.from({ length: floorCount }, (_, i) => i + 1).map(floor => (
                      <button
                        key={floor}
                        onClick={() => setSelectedFloor(floor)}
                        className={`flex-shrink-0 px-6 py-2.5 rounded-full text-[11px] font-bold transition-all duration-300 ${
                          selectedFloor === floor
                            ? 'bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] m3-elevation-2'
                            : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {floor}. Mərtəbə
                      </button>
                    ))}
                  </div>
                )}
                
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Obyekt</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.total}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">İcarədə</p>
                    <p className="text-3xl font-bold text-[var(--md-sys-color-primary)] tracking-tight">{stats.occupied}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">M²</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">{stats.totalArea > 0 ? Math.round(stats.totalArea) : '0'}</p>
                  </div>
                </div>

                {stats.total > 0 && (
                  <div className="mt-10">
                    <div className="flex justify-between items-center mb-3.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Doluluq faizi</span>
                      <span className="text-[12px] font-black text-[var(--md-sys-color-primary)] tracking-tighter">{Math.round(stats.occupancyRate)}%</span>
                    </div>
                    <div className="h-3 bg-[var(--md-sys-color-surface-container)] rounded-full overflow-hidden shadow-inner">
                      <div
                        ref={occupancyRef}
                        className="h-full bg-gradient-to-r from-[var(--md-sys-color-primary)] to-[var(--md-sys-color-primary-container)] rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(59,130,246,0.4)]"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* List Section */}
          <div className="space-y-6 pb-6">
            <div className="flex items-center justify-between px-2 mb-4">
              <h3 className="text-[12px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em]">
                {searchQuery ? 'Nəticələr' : (isInsideKorpus ? 'Mağazalar' : isInsideSira ? 'Korpuslar' : 'Sıralar')}
              </h3>
              <div className="h-px flex-1 mx-6 bg-slate-100 dark:bg-slate-800/50" />
              <span className="text-[10px] font-black text-[var(--md-sys-color-primary)]">
                {currentViewItems.length}
              </span>
            </div>

            {currentViewItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-slate-300 dark:text-slate-800 bg-[var(--md-sys-color-surface-container)] rounded-[48px] border-2 border-dashed border-slate-100 dark:border-slate-800">
                <span className="material-symbol !text-[48px] opacity-20 mb-6">corporate_fare</span>
                <p className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Məlumat Tapılmadı</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {currentViewItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={`w-full flex items-center gap-6 p-6 rounded-[36px] border transition-all duration-500 text-left group relative overflow-hidden ${
                      selectedFeatureId === item.id
                        ? 'bg-[var(--md-sys-color-on-surface)] border-transparent shadow-2xl scale-[1.02] z-10'
                        : 'bg-white dark:bg-slate-800/40 border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-500/20'
                    }`}
                  >
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all duration-300 ${
                      selectedFeatureId === item.id
                        ? 'bg-[var(--md-sys-color-surface-container-high)]/10 text-white dark:text-slate-900'
                        : 'bg-[var(--md-sys-color-surface-container-high)] text-slate-500 group-hover:text-[var(--md-sys-color-primary)] group-hover:scale-105'
                    }`}>
                      <span className="material-symbol !text-[28px]">
                        {item.category === 'Sıra' ? 'reorder' : item.category === 'Korpus' ? 'corporate_fare' : 'storefront'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[16px] font-black truncate tracking-tight transition-colors duration-500 ${selectedFeatureId === item.id ? 'text-[var(--md-sys-color-surface)]' : 'text-slate-900 dark:text-white'}`}>{item.properties.name}</p>
                      <div className="flex items-center gap-3 mt-2">
                        {item.properties.status && (
                          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${selectedFeatureId === item.id ? 'bg-[var(--md-sys-color-primary)] shadow-[0_0_10px_rgba(96,165,250,0.8)]' : getStatusDot(item.properties.status)}`} />
                        )}
                        <p className={`text-[10px] font-black uppercase tracking-[0.15em] truncate ${selectedFeatureId === item.id ? 'opacity-60 text-[var(--md-sys-color-surface)]' : 'text-slate-400 dark:text-slate-500'}`}>
                          {item.properties.tenantName || (item.properties.status || item.category)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {item.properties.area && (
                        <span className={`text-[10px] font-black px-4 py-2 rounded-2xl border transition-all duration-500 ${
                          selectedFeatureId === item.id 
                            ? 'bg-white/10 border-white/20 text-white' 
                            : 'bg-[var(--md-sys-color-surface-container)] border-slate-100 dark:border-slate-800 text-slate-500'
                        }`}>{Math.round(item.properties.area)}m²</span>
                      )}
                      {item.category !== 'Mağaza' && (
                        <span className={`material-symbol !text-[20px] transition-all duration-500 ${selectedFeatureId === item.id ? 'text-white translate-x-1' : 'text-slate-200 dark:text-slate-700 group-hover:text-[var(--md-sys-color-primary)] group-hover:translate-x-1'}`}>chevron_right</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer Area ── */}
        <div className="flex-shrink-0 p-10 bg-white/40 dark:bg-slate-900/40 border-t border-slate-100/50 dark:border-slate-800/50 backdrop-blur-xl">
          {editingVertices ? (
            <div className="flex flex-col gap-5">
              <div className="bg-amber-500 rounded-[32px] px-8 py-6 flex items-center gap-6 shadow-2xl shadow-amber-500/30">
                <div className="w-14 h-14 bg-white/20 text-white rounded-2xl flex items-center justify-center animate-pulse">
                  <span className="material-symbol !text-[28px]">edit</span>
                </div>
                <div>
                  <p className="text-[12px] font-black text-white uppercase tracking-widest">Redaktə Rejimi</p>
                  <p className="text-[10px] text-white/80 font-bold mt-1">Sərhədləri tənzimləyin</p>
                </div>
              </div>
              <button onClick={() => setEditingVertices(false)} className="w-full py-6 rounded-[28px] bg-[var(--md-sys-color-on-surface)] text-[var(--md-sys-color-surface)] text-[11px] font-black uppercase tracking-[0.25em] hover:scale-[0.98] transition-all duration-300 shadow-2xl">✓ Redaktəni Bitir</button>
            </div>
          ) : mode !== 'view' ? (
            <div className="flex flex-col gap-5">
              <div className="bg-[var(--md-sys-color-primary)] rounded-[40px] p-8 text-[var(--md-sys-color-on-primary)] shadow-2xl shadow-blue-600/40 relative overflow-hidden">
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
                <div className="flex items-center justify-between mb-8 relative z-10">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                      <span className="material-symbol !text-[24px]">{mode === 'draw-polygon' ? 'deployed_code' : 'location_on'}</span>
                    </div>
                    <div>
                      <p className="text-[12px] font-black uppercase tracking-[0.2em] opacity-90">Yeni Obyekt</p>
                      <p className="text-[10px] opacity-70 font-bold mt-1">{currentPolygon.length} nöqtə təyin edilib</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4 relative z-10">
                  <button onClick={mode === 'draw-polygon' ? finishCurrentPolygon : finishCurrentPath} className="flex-[2] py-5 rounded-2xl bg-[var(--md-sys-color-surface)] text-[var(--md-sys-color-primary)] text-[11px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all duration-300">Tamamla</button>
                  <button onClick={cancelCurrentPolygon} className="flex-1 py-5 rounded-2xl bg-[var(--md-sys-color-primary-container)] text-[var(--md-sys-color-on-primary-container)] text-[11px] font-black uppercase tracking-widest hover:brightness-95 transition-all duration-300">Ləğv</button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setMode('draw-polygon', 'Korpus')}
                  className="flex flex-col items-center justify-center gap-2 py-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)] hover:border-transparent transition-all duration-300 m3-elevation-1 group"
                >
                  <span className="material-symbol !text-[28px] group-hover:scale-110 transition-transform">corporate_fare</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Korpus</span>
                </button>
                <button
                  onClick={() => setMode('draw-polygon', 'Dekor')}
                  className="flex flex-col items-center justify-center gap-2 py-6 rounded-3xl bg-[var(--md-sys-color-surface-container-low)] border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-[var(--md-sys-color-primary)] hover:bg-[var(--md-sys-color-primary-container)] hover:border-transparent transition-all duration-300 m3-elevation-1 group"
                >
                  <span className="material-symbol !text-[28px] group-hover:scale-110 transition-transform">category</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">Dekor</span>
                </button>
              </div>
              <button
                onClick={() => setMode('draw-path')}
                className="w-full flex items-center justify-center gap-4 py-5 rounded-full bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] text-[13px] font-bold tracking-widest hover:brightness-110 transition-all duration-300 m3-elevation-3 active:m3-elevation-1"
              >
                <span className="material-symbol">edit_location_alt</span> YOL ÇƏK
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
