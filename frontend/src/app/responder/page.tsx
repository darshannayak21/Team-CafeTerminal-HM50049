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
  const [teamName, setTeamName] = useState('Medical-Kothrud');
  const [groundReports, setGroundReports] = useState<any[]>([]);
  const [newsFeed, setNewsFeed] = useState<any[]>([]);

  useEffect(() => {
    try {
      const mission = localStorage.getItem('sahayak_active_mission');
      const email = localStorage.getItem('sahayak_team_email');
      if (email === 'pimpri@gmail.com') setTeamName('PCCOE Rescue Team');
      else setTeamName('Medical-Kothrud');
      
      if (mission) {
        setActiveMission(JSON.parse(mission));
      }
    } catch(e) {}
    
    // Fetch feed data
    Promise.all([
      fetch('http://localhost:5000/api/reports').then(res => res.json()).catch(() => ({ data: [] })),
      fetch('http://localhost:5000/api/news').then(res => res.json()).catch(() => ({ data: [] }))
    ]).then(([reportsRes, newsRes]) => {
      setGroundReports(reportsRes.reports || reportsRes.data || []);
      setNewsFeed((newsRes.news || newsRes.data || []).slice(0, 5));
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
            {teamName === 'PCCOE Rescue Team' ? 'PR' : 'MK'}
          </div>
          <div>
            <h1 className="text-[17px] font-semibold text-ink tracking-[-0.374px] leading-tight">{teamName}</h1>
            <p className="text-[12px] text-ink-muted-80 tracking-[-0.12px]">Field Responder Unit</p>
          </div>
        </div>
        <button 
          onClick={() => router.push('/login')}
          className="text-[14px] font-medium text-red-600 tracking-[-0.224px] hover:text-red-700 transition-colors"
        >
          Logout
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
                  {newsFeed.map((item) => {
                    const geoStatus = item.geolocation_status || 'UNRESOLVED';
                    const isVerified = geoStatus === 'VERIFIED';
                    const isApprox = geoStatus === 'APPROXIMATE_LOCALITY';

                    return (
                      <div key={item.id} className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs">
                        <div className="flex justify-between items-start mb-2 gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold uppercase text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">{item.source || 'News'}</span>
                            <span className="text-[9.5px] font-bold uppercase text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{item.severity || 'MEDIUM'}</span>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                            isVerified
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isApprox
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {isVerified ? '✓ Verified' : isApprox ? '⚠ Approx' : 'Unlocated'}
                          </span>
                        </div>
                        <h4 className="text-[13px] font-bold text-slate-900 mb-1">{item.title}</h4>
                        <div className="text-[11px] text-slate-500 mb-1.5">
                          📍 <strong>{item.extracted_location || item.location_name || 'Pune District'}</strong>
                        </div>
                        <p className="text-[12px] text-slate-600 mb-2 line-clamp-3">{item.description}</p>
                        <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-1.5 text-slate-400">
                          <span>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {item.url ? (
                            <a
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[11px] font-bold text-blue-600 hover:underline"
                            >
                              Open Source Article ↗
                            </a>
                          ) : (
                            <span className="italic">Report Filed</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
              etaMinutes={activeMission?.duration_minutes}
              distanceKm={activeMission?.distance_km}
              riskScore={activeMission?.risk_score}
              safetyStatus={activeMission?.safety_status}
              additionalRoutes={[
                {
                  waypoints: [[18.52, 73.8], [18.5165935, 73.7996039], [18.5157555, 73.7997669], [18.5157215, 73.7997736], [18.513442, 73.8006804], [18.5133533, 73.8007688], [18.5134407, 73.8027051], [18.5133588, 73.8028489], [18.5126608, 73.803017], [18.5121475, 73.803119], [18.5116259, 73.8031886], [18.5111189, 73.8032568], [18.5107245, 73.8032957], [18.5106252, 73.8033055], [18.5102238, 73.8033451], [18.509686, 73.8033981], [18.5089257, 73.8034731], [18.5083791, 73.803527], [18.5081253, 73.8035521], [18.5078087, 73.8035833], [18.5074046, 73.8036231], [18.507243, 73.8036394], [18.5071006, 73.8036537], [18.506959, 73.8036668], [18.5069351, 73.803477], [18.5069057, 73.8031905], [18.5068943, 73.8030606], [18.5068889, 73.8029286], [18.5068821, 73.8028942], [18.506872, 73.8028613], [18.5068628, 73.8028392], [18.5068599, 73.8028153], [18.5068635, 73.8027915], [18.5068733, 73.8027698], [18.5068853, 73.8027401], [18.5068937, 73.8027104], [18.506906, 73.802616], [18.5069072, 73.8026066], [18.5069358, 73.802451], [18.5069794, 73.8022763], [18.5071199, 73.8018585], [18.5071662, 73.8016775], [18.5072088, 73.8014857], [18.5072373, 73.8013092], [18.5073024, 73.8007593], [18.5073563, 73.8002896], [18.5074254, 73.7996581], [18.5074591, 73.7993259], [18.5074791, 73.7991858], [18.5075014, 73.7990007], [18.5075446, 73.7986203], [18.5076603, 73.7975664], [18.5077269, 73.7970411], [18.5077771, 73.7966415], [18.5077801, 73.7966312], [18.507814, 73.7962367], [18.5078207, 73.7961651], [18.5078236, 73.7960569], [18.5078316, 73.795758], [18.5078408, 73.7954152], [18.5078508, 73.7950431], [18.5078543, 73.7949284], [18.5078638, 73.794831], [18.5078809, 73.7946807], [18.5078937, 73.7945681], [18.5080718, 73.793065], [18.5081069, 73.7927685], [18.5081451, 73.7924456], [18.5081676, 73.7922558], [18.50817, 73.7922352], [18.5081874, 73.7920887], [18.508208, 73.7919305], [18.5082624, 73.7914555], [18.5082868, 73.7912495], [18.5082888, 73.7912333], [18.5083281, 73.7909203], [18.5083557, 73.7906684], [18.5083234, 73.7902958], [18.5081898, 73.7896726], [18.5081507, 73.7894973], [18.5079316, 73.7888812], [18.5074708, 73.7883341], [18.5073343, 73.7881023], [18.5073039, 73.7880104], [18.5072435, 73.7878275], [18.5071917, 73.7876304], [18.507163, 73.7874491], [18.5071012, 73.7861538], [18.5070732, 73.7859244], [18.5070131, 73.7856135], [18.5069501, 73.7854015], [18.5068768, 73.7851977], [18.5068409, 73.7850095], [18.5068341, 73.7848083], [18.5068536, 73.7846245], [18.5068872, 73.784473], [18.5069603, 73.7842207], [18.507017, 73.7840937], [18.5070658, 73.7839113], [18.5070937, 73.7836027], [18.5071272, 73.7834266], [18.5071756, 73.783195], [18.507201, 73.7830869], [18.5072481, 73.7827209], [18.5072951, 73.7825035], [18.5074757, 73.7822517], [18.5082958, 73.7785738], [18.5088141, 73.7760103], [18.508822, 73.7759712], [18.5089115, 73.7755288], [18.5089988, 73.7751738], [18.5090864, 73.7749048], [18.5091788, 73.7746559], [18.5092944, 73.7743715], [18.509426, 73.7740994], [18.5095124, 73.7739496], [18.5096212, 73.7737608], [18.5098008, 73.7734821], [18.509983, 73.773225], [18.5113324, 73.7715013], [18.5114788, 73.7710614], [18.5116494, 73.7708866], [18.5117467, 73.7707938], [18.5118439, 73.7707011], [18.5120546, 73.7705178], [18.5122799, 73.7703382], [18.5124438, 73.7702164], [18.5125132, 73.7701649], [18.5129296, 73.7699031], [18.5132915, 73.7696823], [18.5133964, 73.7696097], [18.5133703, 73.7695844], [18.5133449, 73.7695865], [18.5132483, 73.7696287], [18.5132025, 73.7696341], [18.5131586, 73.7696307], [18.5131045, 73.7695925], [18.5131319, 73.7697212], [18.5131561, 73.7697903], [18.5134377, 73.7702285], [18.5134838, 73.7702614], [18.5135223, 73.7702708], [18.5136165, 73.7702742], [18.513609, 73.7700457], [18.5135325, 73.77009], [18.5131422, 73.7703159], [18.5127485, 73.7705463], [18.5125342, 73.7707056], [18.512322, 73.7708747], [18.5121258, 73.7710453], [18.5119489, 73.771214], [18.5118749, 73.7712944], [18.5117876, 73.7713892], [18.5115415, 73.7716881], [18.511491, 73.7717527], [18.511351, 73.7719241], [18.5101985, 73.7734036], [18.5100623, 73.7735957], [18.5100239, 73.7736499], [18.5098782, 73.7738761], [18.5098517, 73.7739172], [18.5096654, 73.7742403], [18.509567, 73.7744438], [18.5095426, 73.7744942], [18.5094444, 73.7747239], [18.5094332, 73.7747501], [18.5092288, 73.7754384], [18.5090871, 73.7760592], [18.5088029, 73.7773485], [18.5087081, 73.7778261], [18.5086278, 73.7782307], [18.5085055, 73.7788468], [18.5084001, 73.7793145], [18.508334, 73.7796082], [18.5081803, 73.7801733], [18.506527, 73.779409]],
                  color: '#eab308',
                  teamName: 'Rescue-Alpha (Chandni Chowk)'
                }
              ]}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
