'use client';

import React, { useState, useEffect } from 'react';
import { MainHeader } from '@/components/layout/MainHeader';
import { RoutePlanner } from '@/components/public/RoutePlanner';
import { ReportIncidentModal } from '@/components/public/ReportIncidentModal';
import { MainMapContainer } from '@/components/map/MainMapContainer';
import { RouteOption, GroundReport, NewsReport } from '@/types/prototype';

export default function MainPage() {
  const [activeRoute, setActiveRoute] = useState<RouteOption | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [showElevation, setShowElevation] = useState<boolean>(false);
  const [focusLocation, setFocusLocation] = useState<[number, number] | null>(null);

  // Live Ground Reports and News Feed State
  const [groundReports, setGroundReports] = useState<GroundReport[]>([]);
  const [newsFeed, setNewsFeed] = useState<NewsReport[]>([]);
  const [activeTab, setActiveTab] = useState<'ground' | 'simulated'>('ground');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Poll Backend for Live Ground Reports & Simulated News
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        const [reportsRes, newsRes] = await Promise.allSettled([
          fetch('http://localhost:5000/api/reports'),
          fetch('http://localhost:5000/api/news'),
        ]);

        if (reportsRes.status === 'fulfilled' && reportsRes.value.ok && isMounted) {
          const data = await reportsRes.value.json();
          const reports = data.reports || data.data || [];
          setGroundReports(reports);
        }

        if (newsRes.status === 'fulfilled' && newsRes.value.ok && isMounted) {
          const data = await newsRes.value.json();
          const news = data.news || data.data || [];
          setNewsFeed(news);
        }
      } catch (err) {
        // Backend offline during cold start
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-canvas">
      <MainHeader currentArea="Pune District" isResponseView={false} />

      <main className="flex-1 relative w-full h-full">
        {/* Full Bleed Map Background */}
        <div className="absolute inset-0 z-0">
          <MainMapContainer
            activeRoute={activeRoute}
            showElevation={showElevation}
            focusLocation={focusLocation}
          />
        </div>

        {/* Floating Utility Panels (Frosted Glass) */}
        <div
          className="absolute top-6 left-6 z-10 flex flex-col gap-4 w-[380px] pointer-events-none max-h-[calc(100vh-3rem)] overflow-y-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Route Planner Panel */}
          <div className="pointer-events-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <RoutePlanner activeRoute={activeRoute} onRouteCalculated={setActiveRoute} />
          </div>

          {/* Reported Incidents & Tactical Feed Panel */}
          <div
            className="pointer-events-auto frosted-glass rounded-xl border border-hairline p-4 shadow-sm animate-slide-up bg-white/95 backdrop-blur-md"
            style={{ animationDelay: '0.2s' }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[16px] font-bold text-ink flex items-center gap-2">
                <span>Field Incidents</span>
                {groundReports.length > 0 && (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 bg-[#2563eb]/10 text-[#2563eb] rounded-full uppercase tracking-wider">
                    {groundReports.length} Live
                  </span>
                )}
              </h3>

              {/* Feed Mode Toggle */}
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('ground')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'ground'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Ground Reports ({groundReports.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('simulated')}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all ${
                    activeTab === 'simulated'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  News ({newsFeed.length})
                </button>
              </div>
            </div>

            {/* TAB 1: Live Ground Reports */}
            {activeTab === 'ground' && (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {groundReports.length === 0 ? (
                  <div className="text-center py-6 px-3 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                      📍
                    </div>
                    <p className="text-[13px] font-semibold text-slate-700 mb-0.5">No ground reports received yet.</p>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Submit an incident report from the mobile app to see it appear here live.
                    </p>
                  </div>
                ) : (
                  groundReports.map((report) => (
                    <div
                      key={report.id}
                      className="text-left w-full bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                            Ground Report
                          </span>
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                          {report.status || 'Pending'}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-[14px] font-bold text-slate-900 leading-tight mb-0.5">
                            {report.incident_type}
                          </h4>
                          <p className="text-[11px] text-slate-500 font-medium mb-1">
                            {report.location_name ? `${report.location_name} · ` : ''}
                            {report.latitude.toFixed(4)}°, {report.longitude.toFixed(4)}°
                          </p>
                        </div>
                        {report.image_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setPreviewImage(
                                report.image_url?.startsWith('http')
                                  ? report.image_url
                                  : `http://localhost:5000${report.image_url}`
                              )
                            }
                            className="shrink-0 group relative overflow-hidden rounded-md border border-slate-300 w-12 h-12 bg-black"
                            title="Click to view photo evidence"
                          >
                            <img
                              src={
                                report.image_url.startsWith('http')
                                  ? report.image_url
                                  : `http://localhost:5000${report.image_url}`
                              }
                              alt="Thumbnail"
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent" />
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No photo attached</span>
                        )}
                      </div>

                      {report.description ? (
                        <p className="text-[12px] text-slate-700 leading-relaxed bg-slate-50 p-2 rounded border border-slate-100 mb-2">
                          {report.description}
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>ID: {report.id}</span>
                        <button
                          type="button"
                          onClick={() => setFocusLocation([report.latitude, report.longitude])}
                          className="text-blue-600 font-bold hover:underline"
                        >
                          View on Map →
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* TAB 2: News Feed */}
            {activeTab === 'simulated' && (
              <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                {newsFeed.map((item) => (
                  <div
                    key={item.id}
                    className="text-left w-full bg-white hover:bg-slate-50 border border-slate-200/80 rounded-lg p-3 transition-colors shadow-xs"
                  >
                    <div className="flex items-start gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center shrink-0 mt-0.5">
                        📰
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                            {item.source || 'News'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <h4 className="text-[13px] font-bold text-slate-900 leading-tight mb-1">
                          {item.title}
                        </h4>
                        <p className="text-[12px] text-slate-600 leading-relaxed mb-1.5">
                          {item.description}
                        </p>
                        {item.latitude && item.longitude && (
                          <div className="flex items-center justify-end text-[10px] text-slate-400 border-t border-slate-100 pt-1">
                            <button
                              type="button"
                              onClick={() => setFocusLocation([item.latitude!, item.longitude!])}
                              className="text-blue-600 font-bold hover:underline"
                            >
                              Focus Map →
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-hairline">
              <button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                className="w-full bg-canvas border border-hairline text-primary text-[14px] font-semibold rounded-pill px-[22px] py-[10px] hover:scale-98 transition-transform text-center shadow-xs"
              >
                + Report an Incident
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 text-white">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Live Field Photo Evidence
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1"
              >
                ✕ Close
              </button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black min-h-[250px]">
              <img
                src={previewImage}
                alt="Enlarged field report evidence"
                className="max-h-[70vh] w-auto max-w-full rounded object-contain"
              />
            </div>
          </div>
        </div>
      )}

      <ReportIncidentModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
      />
    </div>
  );
}
