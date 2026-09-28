'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

// Dynamically import Leaflet map to avoid SSR issues
const ResponderMap = dynamic(() => import('@/components/map/ResponderMap'), { ssr: false });

export default function ResponderPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'pending' | 'en_route' | 'on_scene' | 'resolved'>('pending');
  const [activeMission, setActiveMission] = useState<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [feedTab, setFeedTab] = useState<'ground' | 'news'>('ground');
  const [groundReports, setGroundReports] = useState<any[]>([]);
  const [newsFeed, setNewsFeed] = useState<any[]>([]);

  useEffect(() => {
    const mission = localStorage.getItem('sahayak_active_mission');
    if (mission) {
      setActiveMission(JSON.parse(mission));
    }
    
    // Fetch feed data
    Promise.all([
      fetch('http://localhost:5000/api/reports').then(res => res.json()).catch(() => ({ data: [] })),
      fetch('http://localhost:5000/api/news').then(res => res.json()).catch(() => ({ data: [] }))
    ]).then(([reportsRes, newsRes]) => {
      setGroundReports(reportsRes.data || []);
      setNewsFeed(newsRes.data || []);
      setIsLoaded(true);
    });

    // Listen for storage changes across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sahayak_active_mission') {
        if (e.newValue) {
          setActiveMission(JSON.parse(e.newValue));
        } else {
          setActiveMission(null);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return (
    <div className="flex flex-col h-screen w-full bg-canvas overflow-hidden font-sans">
      {/* HEADER */}
      <header className="h-[52px] shrink-0 border-b border-hairline bg-canvas-parchment flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-[12px]">
            MK
          </div>
          <div>
            <h1 className="text-[17px] font-semibold text-ink tracking-[-0.374px] leading-tight">Medical-Kothrud</h1>
            <p className="text-[12px] text-ink-muted-80 tracking-[-0.12px]">Field Responder Unit</p>
          </div>
        </div>
        <button 
          onClick={() => router.push('/login')}
          className="text-[14px] font-medium text-primary tracking-[-0.224px] hover:text-primary-focus transition-colors"
        >
          Sign Out
        </button>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* LEFT COLUMN: Mission Brief */}
        <aside className="w-full lg:w-[440px] shrink-0 border-r border-hairline bg-canvas flex flex-col h-full z-10 overflow-y-auto">
          {isLoaded && !activeMission ? (
            <div className="flex-1 flex flex-col p-4 bg-slate-50 overflow-hidden">
              <div className="mb-4 shrink-0">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-700 text-[12px] font-semibold tracking-[-0.12px] rounded-pill mb-2">
                  TEAM STANDBY
                </span>
                <h2 className="text-[22px] font-semibold tracking-[-0.374px] text-ink leading-[1.1]">
                  Global Situation Feed
                </h2>
                <p className="text-[13px] text-ink-muted-80 tracking-[-0.374px] mt-1">
                  Monitoring incoming reports until Central Command dispatches your unit.
                </p>
              </div>

              {/* Feed Mode Toggle */}
              <div className="flex items-center bg-slate-200/50 p-1 rounded-lg border border-slate-200 mb-3 shrink-0">
                <button
                  onClick={() => setFeedTab('ground')}
                  className={`flex-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-md transition-all ${
                    feedTab === 'ground' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Ground Reports
                </button>
                <button
                  onClick={() => setFeedTab('news')}
                  className={`flex-1 text-[12px] font-semibold px-2.5 py-1.5 rounded-md transition-all ${
                    feedTab === 'news' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  News & Alerts
                </button>
              </div>

              {/* TAB 1: Ground Reports */}
              {feedTab === 'ground' && (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {groundReports.map((report) => (
                    <div key={report.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">Ground Report</span>
                        <span className="text-[10px] text-slate-400">{new Date(report.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <h4 className="text-[14px] font-bold text-slate-900 mb-1">{report.incident_type}</h4>
                      <p className="text-[12px] text-slate-600 mb-2">{report.description}</p>
                      <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-1.5">
                        {report.location_name ? report.location_name : `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}
                      </div>
                    </div>
                  ))}
                  {groundReports.length === 0 && <p className="text-center text-slate-500 text-sm mt-10">No recent reports.</p>}
                </div>
              )}

              {/* TAB 2: News Feed */}
              {feedTab === 'news' && (
                <div className="flex-1 overflow-y-auto space-y-3 pr-1" style={{ scrollbarWidth: 'thin' }}>
                  {newsFeed.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{item.source}</span>
                        <span className="text-[10px] text-slate-400">{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <h4 className="text-[14px] font-bold text-slate-900 mb-1">{item.title}</h4>
                      <p className="text-[12px] text-slate-600 mb-2">{item.description}</p>
                      <button
                        type="button"
                        onClick={() => alert("Redirecting to news source: " + item.source)}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        View Full Report →
                      </button>
                    </div>
                  ))}
                  {newsFeed.length === 0 && <p className="text-center text-slate-500 text-sm mt-10">No recent news.</p>}
                </div>
              )}

            </div>
          ) : isLoaded && activeMission ? (
            <div className="p-8 flex flex-col h-full">
              <div className="mb-8">
                <span className="inline-block px-3 py-1 bg-red-100 text-[#ff3b30] text-[12px] font-semibold tracking-[-0.12px] rounded-pill mb-4">
                  CRITICAL DISPATCH
                </span>
                <h2 className="text-[34px] font-semibold tracking-[-0.374px] text-ink leading-[1.1] mb-2">
                  {activeMission.title}
                </h2>
                <p className="text-[17px] text-ink-muted-80 tracking-[-0.374px] leading-[1.47]">
                  {activeMission.description}
                </p>
              </div>

              <div className="space-y-4 mb-8">
                {activeMission.population && (
                  <div className="bg-canvas border border-hairline p-5 rounded-[18px]">
                    <p className="text-[14px] font-semibold tracking-[-0.224px] text-ink-muted-80 mb-1">Affected Population</p>
                    <p className="text-[28px] font-semibold tracking-[0.196px] text-ink">{typeof activeMission.population === 'number' ? activeMission.population.toLocaleString() : activeMission.population}</p>
                  </div>
                )}
                
                {activeMission.brief && (
                  <div className="bg-canvas-parchment p-5 rounded-[18px]">
                    <p className="text-[14px] font-semibold tracking-[-0.224px] text-ink mb-3">Tactical Brief</p>
                    <ul className="text-[17px] text-ink tracking-[-0.374px] leading-[1.47] space-y-3 list-disc pl-5">
                      {activeMission.brief.map((point: string, i: number) => (
                        <li key={i}>{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* STATUS BUTTONS */}
              <div className="space-y-3 mt-auto">
                <button
                  onClick={() => setStatus('en_route')}
                  disabled={status !== 'pending'}
                  className={`w-full py-3.5 rounded-pill font-normal text-[17px] tracking-[-0.374px] transition-transform flex items-center justify-center gap-2 ${
                    status === 'en_route' 
                      ? 'bg-primary text-white scale-[0.98]' 
                      : status !== 'pending' 
                      ? 'bg-canvas-parchment text-ink-muted-48 opacity-50 cursor-not-allowed'
                      : 'bg-primary text-on-primary hover:bg-primary-focus'
                  }`}
                >
                  {status === 'en_route' ? '✓ En Route' : 'Mark as En Route'}
                </button>
                
                <button
                  onClick={() => setStatus('on_scene')}
                  disabled={status !== 'en_route'}
                  className={`w-full py-3.5 rounded-pill font-normal text-[17px] tracking-[-0.374px] transition-transform flex items-center justify-center gap-2 ${
                    status === 'on_scene' 
                      ? 'bg-[#ff9500] text-white scale-[0.98]' 
                      : status !== 'en_route' 
                      ? 'bg-canvas-parchment text-ink-muted-48 opacity-50 cursor-not-allowed'
                      : 'bg-[#ff9500] text-white hover:bg-[#ff9500]/90'
                  }`}
                >
                  {status === 'on_scene' ? '✓ On Scene' : 'Mark as On Scene'}
                </button>

                <button
                  onClick={() => {
                    setStatus('resolved');
                    localStorage.removeItem('sahayak_active_mission');
                    setActiveMission(null);
                    setStatus('pending');
                  }}
                  disabled={status !== 'on_scene'}
                  className={`w-full py-3.5 rounded-pill font-normal text-[17px] tracking-[-0.374px] transition-transform flex items-center justify-center gap-2 ${
                    status === 'resolved' 
                      ? 'bg-[#34c759] text-white scale-[0.98]' 
                      : status !== 'on_scene' 
                      ? 'bg-canvas-parchment text-ink-muted-48 opacity-50 cursor-not-allowed'
                      : 'bg-[#34c759] text-white hover:bg-[#34c759]/90'
                  }`}
                >
                  {status === 'resolved' ? '✓ Resolved' : 'Mark as Resolved'}
                </button>
              </div>
            </div>
          ) : null}
        </aside>

        {/* RIGHT COLUMN: Map with Route */}
        <main className="flex-1 h-full w-full relative z-0">
          <div className="absolute inset-0">
            <ResponderMap 
              route={activeMission ? activeMission.route : []} 
              reports={groundReports} 
              news={newsFeed} 
              additionalRoutes={[
                {
                  waypoints: [
                    [18.475284, 73.797687], [18.475042, 73.796956], [18.475365, 73.796161], 
                    [18.475862, 73.795918], [18.476441, 73.79645], [18.476912, 73.79696], 
                    [18.477786, 73.797891], [18.478243, 73.79839], [18.478938, 73.799115], 
                    [18.479386, 73.79957], [18.479943, 73.800467], [18.480662, 73.801549], 
                    [18.48071, 73.801938], [18.480371, 73.803161], [18.480289, 73.804028], 
                    [18.480194, 73.804671], [18.479115, 73.805637], [18.478415, 73.806259], 
                    [18.477821, 73.806774], [18.477067, 73.807305], [18.476506, 73.807821], 
                    [18.47561, 73.808613]
                  ],
                  color: '#eab308',
                  teamName: 'Warje Support Unit'
                }
              ]}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
