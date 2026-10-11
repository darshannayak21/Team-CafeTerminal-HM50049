'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { DispatchMapContainer } from '@/components/map/DispatchMapContainer';

const API = 'http://localhost:5000';

// ─── Types ─────────────────────────────────────────────────────────────────
interface Unit {
  id: string;
  name: string;
  type: string;
  capacity: number;
  crew?: number;
  specs?: string;
  role?: string;
  base_lat: number;
  base_lon: number;
  base_name: string;
  vehicle: string;
  status: 'available' | 'deployed';
}

interface Department {
  name: string;
  color: string;
  units: Unit[];
}

interface Shelter {
  id: string;
  name: string;
  lat: number;
  lon: number;
  capacity: number;
  current_occupancy: number;
  remaining_capacity: number;
  overflow: boolean;
}

interface FleetConfig {
  departments: Record<string, Department>;
  shelters: Shelter[];
}

interface Assignment {
  id: string;
  incident_id: string;
  incident_title: string;
  incident_description?: string;
  image_url?: string | null;
  incident_location: string;
  incident_lat: number | null;
  incident_lon: number | null;
  severity: string;
  affected_population: number | null;
  unit_id: string;
  unit_name: string;
  department: string;
  vehicle_type: string;
  capacity: number;
  shelter_name: string | null;
  origin_name: string;
  distance_km: number | null;
  duration_minutes: number | null;
  safety_status: string | null;
  status: string;
  dispatched_by: string;
  dispatched_at: string;
  notes: string;
  rerouted: number;
  reroute_reason: string | null;
  route_waypoints?: [number, number][];
}

interface SizingRecommendation {
  recommendedIds: string[];
  vehicleBreakdown: string[];
  totalRecommendedCapacity: number;
  scale: string;
  advice: string;
  warning: string | null;
  sortiesNeeded: number;
}

// Apple Design Severity Tokens
const SEVERITY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  CRITICAL: { bg: 'bg-[#ff3b30]/10', text: 'text-[#d70015]', border: 'border-[#ff3b30]/20' },
  HIGH: { bg: 'bg-[#ff9500]/10', text: 'text-[#c93400]', border: 'border-[#ff9500]/20' },
  MODERATE: { bg: 'bg-[#ffcc00]/15', text: 'text-[#9e6a00]', border: 'border-[#ffcc00]/30' },
  LOW: { bg: 'bg-[#34c759]/10', text: 'text-[#248a3d]', border: 'border-[#34c759]/20' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; label: string }> = {
  assigned_to_head: { bg: 'bg-[#0066cc]/10', text: 'text-[#0066cc]', border: 'border-[#0066cc]/20', label: 'Awaiting Deployment' },
  assigned: { bg: 'bg-[#0066cc]/10', text: 'text-[#0066cc]', border: 'border-[#0066cc]/20', label: 'Assigned' },
  dispatched: { bg: 'bg-[#0066cc]/10', text: 'text-[#0066cc]', border: 'border-[#0066cc]/20', label: 'Dispatched' },
  en_route: { bg: 'bg-[#ff9500]/10', text: 'text-[#c93400]', border: 'border-[#ff9500]/20', label: 'En Route' },
  on_scene: { bg: 'bg-[#af52de]/10', text: 'text-[#8944ab]', border: 'border-[#af52de]/20', label: 'On Scene' },
  resolved: { bg: 'bg-[#34c759]/10', text: 'text-[#248a3d]', border: 'border-[#34c759]/20', label: 'Resolved' },
  cancelled: { bg: 'bg-[#86868b]/10', text: 'text-[#86868b]', border: 'border-[#86868b]/20', label: 'Cancelled' },
};

function getSmartRecommendation(pop: number | null | undefined, title: string, availableUnits: Unit[]): SizingRecommendation {
  const population = pop || 0;
  const isFlood = /flood|water|rain|submerg|river|overflow/i.test(title);
  
  if (population >= 400) {
    const recUnits: Unit[] = [];
    const highWater = availableUnits.find(u => u.id.includes('TRUCK-03') || u.vehicle.includes('High-Clearance'));
    const logistics = availableUnits.find(u => u.id.includes('TRUCK-01') || u.vehicle.includes('Relief'));
    const heavyRescue = availableUnits.find(u => u.id.includes('TRUCK-02') || u.vehicle.includes('Technical Rescue'));
    const amb = availableUnits.find(u => u.type === 'ambulance');

    if (highWater) recUnits.push(highWater);
    if (logistics) recUnits.push(logistics);
    if (heavyRescue) recUnits.push(heavyRescue);
    if (amb) recUnits.push(amb);
    if (recUnits.length === 0) recUnits.push(...availableUnits.slice(0, 3));

    const totalCap = recUnits.reduce((acc, u) => acc + (u.capacity || 0), 0);
    const sorties = Math.ceil(population / (totalCap || 1));

    return {
      recommendedIds: recUnits.map(u => u.id),
      vehicleBreakdown: recUnits.map(u => `${u.name} (Cap: ${u.capacity})`),
      totalRecommendedCapacity: totalCap,
      scale: 'Mass Casualty Hazard Zone',
      advice: `Recommended mobilization: ${recUnits.length} Heavy Units (Combined Cap: ${totalCap} evacuees) to safely manage ${population.toLocaleString()} citizens at risk.`,
      warning: `Critical scale (${population.toLocaleString()} citizens). Single light response units are inadequate for comprehensive extraction.`,
      sortiesNeeded: sorties,
    };
  } else if (population >= 100) {
    const recUnits: Unit[] = [];
    const heavyRescue = availableUnits.find(u => u.vehicle.includes('Technical Rescue') || u.id.includes('TRUCK-02') || u.id.includes('TRUCK-01'));
    const amb = availableUnits.find(u => u.type === 'ambulance');
    const van = availableUnits.find(u => u.type === 'rescue_team');

    if (heavyRescue) recUnits.push(heavyRescue);
    if (amb) recUnits.push(amb);
    if (van && recUnits.length < 2) recUnits.push(van);
    if (recUnits.length === 0) recUnits.push(...availableUnits.slice(0, 2));

    const totalCap = recUnits.reduce((acc, u) => acc + (u.capacity || 0), 0);
    const sorties = Math.ceil(population / (totalCap || 1));

    return {
      recommendedIds: recUnits.map(u => u.id),
      vehicleBreakdown: recUnits.map(u => `${u.name} (Cap: ${u.capacity})`),
      totalRecommendedCapacity: totalCap,
      scale: 'Elevated Hazard Scale',
      advice: `Recommended mobilization: ${recUnits.length} Units (Combined Cap: ${totalCap} evacuees) for ${population.toLocaleString()} affected lives.`,
      warning: null,
      sortiesNeeded: sorties,
    };
  } else if (isFlood) {
    const recUnits: Unit[] = [];
    const boat = availableUnits.find(u => u.type === 'boat_rescue');
    const van = availableUnits.find(u => u.type === 'rescue_team');
    if (boat) recUnits.push(boat);
    if (van) recUnits.push(van);
    if (recUnits.length === 0) recUnits.push(...availableUnits.slice(0, 2));

    const totalCap = recUnits.reduce((acc, u) => acc + (u.capacity || 0), 0);
    const sorties = Math.ceil((population || 20) / (totalCap || 1));

    return {
      recommendedIds: recUnits.map(u => u.id),
      vehicleBreakdown: recUnits.map(u => `${u.name} (Cap: ${u.capacity})`),
      totalRecommendedCapacity: totalCap,
      scale: 'Flood Hazard Inundation',
      advice: `Mobilizing amphibious unit and quick reaction vehicle for submerged extraction.`,
      warning: null,
      sortiesNeeded: sorties,
    };
  } else {
    const qrv = availableUnits.find(u => u.id.includes('VAN') || u.type === 'rescue_team') || availableUnits[0];
    const recUnits = qrv ? [qrv] : availableUnits.slice(0, 1);
    const totalCap = recUnits.reduce((acc, u) => acc + (u.capacity || 0), 0);

    return {
      recommendedIds: recUnits.map(u => u.id),
      vehicleBreakdown: recUnits.map(u => `${u.name} (Cap: ${u.capacity})`),
      totalRecommendedCapacity: totalCap,
      scale: 'Standard Rapid Response',
      advice: `Mobilizing 1 Quick Response Unit for rapid perimeter assessment and triage.`,
      warning: null,
      sortiesNeeded: 1,
    };
  }
}

export default function HeadDashboardPage() {
  const router = useRouter();
  const [managerEmail, setManagerEmail] = useState('');
  const [authChecked, setAuthChecked] = useState(false);
  const [departmentName, setDepartmentName] = useState('Response Department');

  const [fleet, setFleet] = useState<FleetConfig | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [selectedVehicles, setSelectedVehicles] = useState<Record<string, string[]>>({});
  const [deployingId, setDeployingId] = useState<string | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);

  // Initial load only - background polling must NEVER set initialLoading to true!
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const email = localStorage.getItem('sahayak_manager_email') || '';
    const allowed = ['respondhead@gmail.com', 'head@gmail.com', 'admin@gmail.com'];
    if (!allowed.includes(email)) {
      router.push('/login');
      return;
    }
    setManagerEmail(email);
    setAuthChecked(true);
  }, [router]);

  // Completely stable fetchData callback - NO selectedAssignmentId in dependency array!
  const fetchData = useCallback(async (email: string, isInitial = false) => {
    if (!email) return;
    if (isInitial) setInitialLoading(true);

    try {
      const [fleetRes, assRes] = await Promise.all([
        fetch(`${API}/api/dispatch/config`, {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': email,
          },
        }),
        fetch(`${API}/api/dispatch/assignments`, {
          headers: {
            'Content-Type': 'application/json',
            'X-User-Email': email,
          },
        }),
      ]);

      if (!fleetRes.ok || !assRes.ok) {
        setError('Unable to synchronize telemetry.');
        return;
      }

      const [fleetData, assData] = await Promise.all([fleetRes.json(), assRes.json()]);

      if (fleetData.success) {
        setFleet(fleetData.config);
        if (fleetData.department_name) setDepartmentName(fleetData.department_name);
      }
      if (assData.success) {
        const asgns: Assignment[] = assData.assignments || [];
        setAssignments(asgns);
        // Retain current selection if still present; otherwise select first
        setSelectedAssignmentId(prev => {
          if (prev && asgns.some(a => a.id === prev)) return prev;
          return asgns[0]?.id ?? null;
        });
      }
      setError('');
    } catch {
      setError('Cannot connect to dispatch service on port 5000.');
    } finally {
      if (isInitial) setInitialLoading(false);
    }
  }, []);

  // Set up polling with a completely stable effect - no re-triggers on selection!
  useEffect(() => {
    if (authChecked && managerEmail) {
      fetchData(managerEmail, true);
      const interval = setInterval(() => {
        fetchData(managerEmail, false);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [authChecked, managerEmail, fetchData]);

  // Department Head deploys chosen vehicle(s) to the Field Responder
  const handleDeployToField = async (assignmentId: string, customUnitIds?: string[]) => {
    const asgn = assignments.find(a => a.id === assignmentId);
    const rec = asgn ? getSmartRecommendation(asgn.affected_population, asgn.incident_title, myDept?.units || []) : null;
    const finalUnitIds = customUnitIds && customUnitIds.length > 0
      ? customUnitIds
      : (selectedVehicles[assignmentId] && selectedVehicles[assignmentId].length > 0
          ? selectedVehicles[assignmentId]
          : (rec?.recommendedIds || [myDept?.units[0]?.id || '']));

    if (!finalUnitIds || finalUnitIds.length === 0) {
      alert('Please select at least one vehicle to deploy.');
      return;
    }

    setDeployingId(assignmentId);
    try {
      const res = await fetch(`${API}/api/dispatch/assignments/${assignmentId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': managerEmail,
        },
        body: JSON.stringify({ unit_ids: finalUnitIds }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData(managerEmail, false);
      } else {
        alert(data.error || 'Failed to deploy unit to field.');
      }
    } catch {
      alert('Network error while deploying unit.');
    } finally {
      setDeployingId(null);
    }
  };

  const handleCancel = async (assignmentId: string) => {
    if (!confirm('Cancel this mission dispatch?')) return;
    try {
      await fetch(`${API}/api/dispatch/assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': managerEmail,
        },
      });
      await fetchData(managerEmail, false);
    } catch {}
  };

  // Base Point A details
  const myDept = useMemo(() => {
    if (!fleet) return null;
    return Object.values(fleet.departments)[0] || null;
  }, [fleet]);

  const basePoint: [number, number] = useMemo(() => {
    if (myDept && myDept.units[0]) {
      return [myDept.units[0].base_lat, myDept.units[0].base_lon];
    }
    return managerEmail === 'respondhead@gmail.com' ? [18.5033, 73.8066] : [18.6519, 73.7619];
  }, [myDept, managerEmail]);

  const baseName = useMemo(() => {
    if (myDept && myDept.units[0]) {
      return myDept.units[0].base_name;
    }
    return managerEmail === 'respondhead@gmail.com' ? 'Kothrud Base Camp' : 'Pimpri Base Camp';
  }, [myDept, managerEmail]);

  const activeAssignment = useMemo(() => {
    if (!selectedAssignmentId) return assignments[0] || null;
    return assignments.find(a => a.id === selectedAssignmentId) || assignments[0] || null;
  }, [assignments, selectedAssignmentId]);

  if (!authChecked) return null;

  return (
    <div className="flex flex-col min-h-screen w-full bg-[#f5f5f7] text-[#1d1d1f] font-sans selection:bg-[#0066cc]/20">
      {/* ─── GLOBAL NAV BAR (Apple Pure Black 44px) ─── */}
      <header className="h-[44px] shrink-0 bg-[#000000] text-[#ffffff] flex items-center justify-between px-6 z-30 select-none">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#34c759]"></span>
            <span className="text-[13px] font-semibold tracking-[-0.01em]">
              {departmentName}
            </span>
          </div>
          <span className="text-[#86868b] text-[12px] font-normal hidden sm:inline">
            Command Portal · Point A Base Camp
          </span>
        </div>

        <div className="flex items-center gap-4 text-[12px]">
          <span className="text-[#86868b] font-normal">
            {managerEmail}
          </span>
          <button
            onClick={() => {
              localStorage.removeItem('sahayak_manager_email');
              router.push('/login');
            }}
            className="text-[#ffffff] hover:text-[#2997ff] transition-colors font-normal cursor-pointer"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ─── SUB-NAV BAR (Frosted Parchment 52px) ─── */}
      <div className="h-[52px] shrink-0 bg-[#f5f5f7]/80 backdrop-blur-md border-b border-[#e5e5ea] flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-3">
          <h1 className="text-[19px] font-semibold tracking-[-0.02em] text-[#1d1d1f]">
            Operations Command
          </h1>
          <span className="text-[12px] text-[#86868b] font-normal hidden md:inline">
            Fleet Deployment & Citizen Report Telemetry
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[12px] text-[#86868b] font-mono">
            {baseName} [{basePoint[0].toFixed(3)}°, {basePoint[1].toFixed(3)}°]
          </span>
        </div>
      </div>

      {/* ─── MAIN CONTENT CONTAINER (FULL WIDTH DESIGN) ─── */}
      <main className="flex-1 p-6 max-w-[1640px] w-full mx-auto space-y-6">
        {error && (
          <div className="bg-[#ffffff] border border-[#ff3b30]/30 rounded-[14px] p-3 text-[13px] text-[#d70015] flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => fetchData(managerEmail, true)}
              className="text-[12px] underline text-[#d70015] hover:opacity-80 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ════════ SECTION 1: FULL-WIDTH ASSIGNED OPERATIONS HERO ════════ */}
        <section className="bg-[#ffffff] rounded-[20px] border border-[#e5e5ea] p-6 shadow-none w-full">
          {/* Header Row: Title & Operation Switcher Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#e5e5ea]">
            <div className="flex items-center gap-3">
              <h2 className="text-[22px] font-semibold text-[#1d1d1f] tracking-[-0.02em]">
                Assigned Operations
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#0066cc]/10 text-[#0066cc]">
                {assignments.filter(a => !['cancelled', 'resolved'].includes(a.status)).length} Active
              </span>
            </div>
            <span className="text-[12px] text-[#86868b] font-normal">
              Dispatched by Emergency Command · Department Exclusive
            </span>
          </div>

          {/* Initial Loading Skeleton */}
          {initialLoading && assignments.length === 0 && (
            <div className="py-16 text-center text-[#86868b] text-[14px]">
              <div className="w-5 h-5 rounded-full border-2 border-[#0066cc] border-t-transparent animate-spin mx-auto mb-3"></div>
              Synchronizing assigned operations...
            </div>
          )}

          {/* Empty State */}
          {!initialLoading && assignments.length === 0 && (
            <div className="rounded-[16px] border border-[#e5e5ea] bg-[#f5f5f7] p-12 text-center my-6">
              <div className="w-12 h-12 rounded-full bg-[#ffffff] border border-[#e5e5ea] flex items-center justify-center text-[#0066cc] font-semibold text-xl mx-auto mb-3">
                ✓
              </div>
              <h3 className="text-[16px] font-semibold text-[#1d1d1f] mb-1">
                No Incidents Currently Assigned
              </h3>
              <p className="text-[13px] text-[#86868b] max-w-[420px] mx-auto leading-relaxed mb-3">
                Your response team is in standby readiness at <strong>{baseName}</strong>. 
                When an emergency task is assigned to {departmentName} by Command, it will appear here for fleet dispatch.
              </p>
              <span className="text-[11px] font-mono text-[#86868b]">
                Standby telemetry active · {basePoint[0].toFixed(4)}° N, {basePoint[1].toFixed(4)}° E
              </span>
            </div>
          )}

          {/* Active Operation Full-Width Canvas */}
          {assignments.length > 0 && activeAssignment && (() => {
            const asgn = activeAssignment;
            const isPendingDeploy = asgn.status === 'assigned_to_head';
            const rec = getSmartRecommendation(asgn.affected_population, asgn.incident_title, myDept?.units || []);
            const selectedForAsgn: string[] = selectedVehicles[asgn.id] ?? rec.recommendedIds;
            const selectedUnitsObjs = (myDept?.units || []).filter(u => selectedForAsgn.includes(u.id));
            const totalSelectedCapacity = selectedUnitsObjs.reduce((acc, u) => acc + (u.capacity || 0), 0);
            const affectedPop = asgn.affected_population || 0;
            const sortiesNeeded = Math.ceil(affectedPop / (totalSelectedCapacity || 1));

            const sevStyle = SEVERITY_STYLES[asgn.severity] || SEVERITY_STYLES.MODERATE;
            const statStyle = STATUS_STYLES[asgn.status] || STATUS_STYLES.assigned;

            const fullImgUrl = asgn.image_url
              ? asgn.image_url.startsWith('http')
                ? asgn.image_url
                : `http://localhost:5000${asgn.image_url.startsWith('/') ? '' : '/'}${asgn.image_url}`
              : null;

            return (
              <div className="pt-5 space-y-6">
                {/* Horizontal Operation Selector Tabs (if multiple) */}
                {assignments.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-[#f0f0f0]">
                    <span className="text-[11px] uppercase tracking-[0.06em] font-semibold text-[#86868b] mr-1 shrink-0">
                      Select Mission:
                    </span>
                    {assignments.map(a => (
                      <button
                        key={a.id}
                        onClick={() => setSelectedAssignmentId(a.id)}
                        className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                          activeAssignment.id === a.id
                            ? 'bg-[#1d1d1f] text-white shadow-sm'
                            : 'bg-[#f5f5f7] text-[#1d1d1f] border border-[#e5e5ea] hover:bg-[#e5e5ea]/60'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${a.severity === 'CRITICAL' ? 'bg-[#ff3b30]' : 'bg-[#0066cc]'}`} />
                        <span>{a.incident_title}</span>
                        <span className="text-[10px] opacity-70">
                          {a.status === 'assigned_to_head' ? 'Awaiting Deploy' : a.status.replace('_', ' ')}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Operation Title, Severity & Status Bar */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${sevStyle.bg} ${sevStyle.text} ${sevStyle.border}`}
                      >
                        {asgn.severity}
                      </span>
                      <span
                        className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 rounded-full border ${statStyle.bg} ${statStyle.text} ${statStyle.border}`}
                      >
                        {statStyle.label}
                      </span>
                      <span className="text-[11px] font-mono text-[#86868b]">
                        ID: {asgn.id}
                      </span>
                    </div>
                    <h3 className="text-[26px] font-semibold text-[#1d1d1f] tracking-[-0.02em] leading-tight">
                      {asgn.incident_title}
                    </h3>
                  </div>

                  {!isPendingDeploy && asgn.status !== 'resolved' && asgn.status !== 'cancelled' && (
                    <button
                      onClick={() => handleCancel(asgn.id)}
                      className="px-4 py-1.5 text-[#d70015] hover:bg-[#ff3b30]/10 rounded-full border border-[#ff3b30]/30 transition-all font-medium text-[12px] shrink-0 cursor-pointer"
                    >
                      Cancel Dispatch
                    </button>
                  )}
                </div>

                {/* ─── 2-COLUMN INTELLIGENCE & TACTICAL MAP SPLIT ─── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  
                  {/* Left Column (7 cols): Ground Intelligence & Evidence */}
                  <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                    
                    {/* WorldPop Population Analysis Display */}
                    <div className="p-4 bg-[#f5f5f7] border border-[#e5e5ea] rounded-[16px] flex items-center justify-between gap-4">
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                          WorldPop Hazard Exposure Analysis
                        </div>
                        <div className="text-[17px] font-semibold text-[#1d1d1f] tracking-tight mt-0.5">
                          {asgn.affected_population
                            ? `${asgn.affected_population.toLocaleString()} Lives in Hazard Zone`
                            : 'Localized Impact Assessment'}
                        </div>
                      </div>
                      {asgn.affected_population && asgn.affected_population >= 80 && (
                        <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-[#ff3b30]/10 text-[#d70015] border border-[#ff3b30]/20 shrink-0">
                          {asgn.affected_population >= 400 ? 'Mass Impact' : 'Elevated Risk'}
                        </span>
                      )}
                    </div>

                    {/* Citizen Ground Report Quotation */}
                    <div className="bg-[#f5f5f7] border border-[#e5e5ea] rounded-[16px] p-4 text-[14px] text-[#1d1d1f] leading-relaxed">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b] mb-1">
                        Citizen Incident Ground Report
                      </div>
                      <p className="italic font-normal text-[#1d1d1f]">
                        {asgn.incident_description ? `"${asgn.incident_description}"` : 'No additional text description provided by citizen.'}
                      </p>
                    </div>

                    {/* Citizen Ground Photo Evidence (Photography-First Museum Gallery) */}
                    {fullImgUrl && (
                      <div>
                        <div className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b] mb-1.5">
                          Ground Photographic Evidence
                        </div>
                        <div
                          onClick={() => setModalImage(fullImgUrl)}
                          className="relative group rounded-[16px] overflow-hidden border border-[#e5e5ea] bg-[#f5f5f7] max-h-[220px] cursor-pointer"
                        >
                          <img
                            src={fullImgUrl}
                            alt="Citizen Ground Photo"
                            className="w-full h-52 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[12px] font-medium backdrop-blur-2xs">
                            Click to Enlarge Full Photo
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Destination & Route Telemetry */}
                    <div className="p-3.5 bg-[#f5f5f7] border border-[#e5e5ea] rounded-[14px] text-[12px] text-[#86868b] space-y-1">
                      <div>
                        <span className="text-[#1d1d1f] font-medium">Destination Point B:</span> {asgn.incident_location}
                        {asgn.incident_lat && asgn.incident_lon && (
                          <span className="font-mono text-[11px] ml-1.5 text-[#1d1d1f]">
                            [{asgn.incident_lat.toFixed(4)}° N, {asgn.incident_lon.toFixed(4)}° E]
                          </span>
                        )}
                      </div>
                      {asgn.distance_km && (
                        <div>
                          Estimated Transit: {asgn.distance_km.toFixed(1)} km · ~{asgn.duration_minutes?.toFixed(0)} mins
                          {asgn.safety_status ? ` · ${asgn.safety_status}` : ''}
                        </div>
                      )}
                      {!isPendingDeploy && (
                        <div className="text-[#0066cc] font-medium pt-1 border-t border-[#e5e5ea] mt-1">
                          Deployed Unit: {asgn.unit_name} ({asgn.vehicle_type}, Cap: {asgn.capacity})
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column (5 cols): Embedded Tactical Map */}
                  <div className="lg:col-span-5 flex flex-col min-h-[380px]">
                    <div className="h-full w-full rounded-[16px] overflow-hidden border border-[#e5e5ea] bg-[#f5f5f7] relative">
                      <DispatchMapContainer
                        basePoint={basePoint}
                        baseName={baseName}
                        departmentName={departmentName}
                        activeAssignment={asgn}
                        shelters={fleet ? fleet.shelters : []}
                      />
                    </div>
                  </div>
                </div>

                {/* ─── STEP 2: HEAD DEPLOYMENT & VEHICLE SELECTION (FULL WIDTH) ─── */}
                {isPendingDeploy ? (
                  <div className="pt-6 border-t border-[#e5e5ea] space-y-4">
                    {/* AI Fleet Sizing Advisory Callout Strip */}
                    <div className="p-4 bg-[#f5f5f7] border border-[#e5e5ea] rounded-[16px] flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-semibold text-[#0066cc] uppercase tracking-[0.06em]">
                            AI Fleet Sizing Advisory · {rec.scale}
                          </span>
                          <span className="text-[10px] font-medium text-[#86868b] bg-white border border-[#e5e5ea] px-2 py-0.5 rounded-full">
                            Calculated
                          </span>
                        </div>
                        <p className="text-[14px] text-[#1d1d1f] leading-snug">
                          {rec.advice}
                        </p>
                        {rec.warning && (
                          <p className="text-[12px] font-medium text-[#d70015] mt-1">
                            {rec.warning}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedVehicles(prev => ({ ...prev, [asgn.id]: rec.recommendedIds }))}
                          className="text-[12px] font-medium text-[#0066cc] bg-white border border-[#e5e5ea] hover:bg-[#f5f5f7] active:scale-[0.98] px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
                        >
                          Reset to AI
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const allAvailableIds = (myDept?.units || []).filter(u => u.status === 'available').map(u => u.id);
                            setSelectedVehicles(prev => ({ ...prev, [asgn.id]: allAvailableIds }));
                          }}
                          className="text-[12px] font-medium text-[#1d1d1f] bg-white border border-[#e5e5ea] hover:bg-[#f5f5f7] active:scale-[0.98] px-3.5 py-1.5 rounded-full transition-all cursor-pointer"
                        >
                          Select All Available
                        </button>
                      </div>
                    </div>

                    {/* Multi-Vehicle Mobilization Cards Grid */}
                    <div>
                      <div className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#86868b] mb-2.5">
                        Select Vehicles for Mission Mobilization:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                        {myDept && myDept.units.map(u => {
                          const isChecked = selectedForAsgn.includes(u.id);
                          const isAIRec = rec.recommendedIds.includes(u.id);
                          const isDeployed = u.status === 'deployed';

                          return (
                            <div
                              key={u.id}
                              onClick={() => {
                                if (isDeployed) return;
                                const next = isChecked
                                  ? selectedForAsgn.filter(id => id !== u.id)
                                  : [...selectedForAsgn, u.id];
                                setSelectedVehicles(prev => ({ ...prev, [asgn.id]: next }));
                              }}
                              className={`p-3.5 rounded-[14px] border text-left transition-all select-none cursor-pointer flex items-start gap-3 ${
                                isDeployed
                                  ? 'opacity-40 bg-[#f5f5f7] border-[#e5e5ea] cursor-not-allowed'
                                  : isChecked
                                  ? 'border-[#0066cc] bg-[#f5f5f7]/60 ring-1 ring-[#0066cc]'
                                  : 'border-[#e5e5ea] bg-white hover:border-[#86868b]/40'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDeployed}
                                readOnly
                                className="mt-0.5 h-4 w-4 rounded border-[#e5e5ea] text-[#0066cc] focus:ring-[#0066cc] pointer-events-none"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-1 mb-1">
                                  <span className="text-[13px] font-semibold text-[#1d1d1f] leading-snug truncate">
                                    {u.name}
                                  </span>
                                  {isAIRec && (
                                    <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-full bg-[#0066cc]/10 text-[#0066cc] shrink-0">
                                      AI Rec
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-[#86868b] leading-tight mb-2">
                                  {u.role || u.vehicle} {u.crew ? `· Crew: ${u.crew}` : ''}
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[11px] font-semibold text-[#1d1d1f] bg-white px-2 py-0.5 rounded border border-[#e5e5ea]">
                                    Cap: {u.capacity}
                                  </span>
                                  <span className={`text-[10px] font-medium uppercase ${isDeployed ? 'text-[#c93400]' : 'text-[#86868b]'}`}>
                                    {isDeployed ? 'Deployed' : 'Ready'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Fleet Capacity Summary Bar */}
                    <div className="p-3.5 bg-[#f5f5f7] border border-[#e5e5ea] rounded-[14px] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[13px]">
                      <div>
                        <span className="font-semibold text-[#1d1d1f]">
                          Selected Fleet: <strong className="text-[#0066cc]">{selectedForAsgn.length} Vehicles</strong>
                        </span>
                        <span className="mx-2 text-[#e5e5ea]">|</span>
                        <span className="font-semibold text-[#1d1d1f]">
                          Combined Capacity: <strong className="text-[#1d1d1f]">{totalSelectedCapacity} Citizens / Run</strong>
                        </span>
                        {affectedPop > 0 && (
                          <span className="text-[12px] text-[#86868b] ml-2">
                            ({sortiesNeeded} {sortiesNeeded === 1 ? 'sortie' : 'sorties'} required for {affectedPop.toLocaleString()} people)
                          </span>
                        )}
                      </div>

                      {selectedForAsgn.length === 0 && (
                        <span className="text-[11px] font-medium text-[#c93400] bg-[#ff9500]/10 px-2.5 py-0.5 rounded-full border border-[#ff9500]/20 shrink-0">
                          Please select at least 1 vehicle
                        </span>
                      )}
                    </div>

                    {/* Signature Apple Action Blue Pill Deploy Button */}
                    <button
                      type="button"
                      onClick={() => handleDeployToField(asgn.id, selectedForAsgn)}
                      disabled={selectedForAsgn.length === 0 || deployingId === asgn.id}
                      className="w-full py-3.5 px-6 bg-[#0066cc] hover:bg-[#0071e3] active:scale-[0.98] text-white font-medium text-[15px] rounded-full transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-none"
                    >
                      {deployingId === asgn.id ? (
                        <span>Deploying Fleet to Field Responder Board...</span>
                      ) : (
                        <span>
                          Deploy & Dispatch Selected Fleet ({selectedForAsgn.length} Vehicles · Combined Cap: {totalSelectedCapacity}) to Field Responder →
                        </span>
                      )}
                    </button>
                  </div>
                ) : (
                  /* Once Deployed: Clean Status Notice */
                  <div className="p-4 bg-[#f5f5f7] border border-[#e5e5ea] rounded-[16px] flex items-center justify-between text-[13px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0066cc] animate-pulse"></span>
                      <span className="font-medium text-[#1d1d1f]">
                        Dispatched to Field Responder: <strong>{asgn.unit_name}</strong> ({asgn.vehicle_type}, Rescue Cap: {asgn.capacity})
                      </span>
                    </div>
                    <span className="text-[12px] text-[#86868b]">
                      Status: {statStyle.label}
                    </span>
                  </div>
                )}
              </div>
            );
          })()}
        </section>

        {/* ════════ SECTION 2: DEPARTMENT FLEET INVENTORY (CLEAN & NON-REDUNDANT) ════════ */}
        <section className="bg-[#ffffff] rounded-[20px] border border-[#e5e5ea] p-6 shadow-none w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-5 border-b border-[#e5e5ea] mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-[#34c759]"></span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#86868b]">
                  Point A Staging Base Camp
                </span>
              </div>
              <h2 className="text-[20px] font-semibold text-[#1d1d1f] tracking-[-0.02em]">
                {departmentName} Fleet Inventory
              </h2>
            </div>

            <div className="flex items-center gap-4 text-right">
              <div>
                <span className="text-[11px] uppercase tracking-[0.04em] font-semibold text-[#86868b] block">
                  Readiness
                </span>
                <span className="text-[13px] font-semibold text-[#34c759]">
                  {myDept ? myDept.units.filter(u => u.status === 'available').length : 0} of {myDept ? myDept.units.length : 0} Ready
                </span>
              </div>
              <div className="border-l border-[#e5e5ea] pl-4">
                <span className="text-[11px] uppercase tracking-[0.04em] font-semibold text-[#86868b] block">
                  Base Location
                </span>
                <span className="text-[12px] font-mono text-[#86868b]">
                  {basePoint[0].toFixed(4)}° N, {basePoint[1].toFixed(4)}° E
                </span>
              </div>
            </div>
          </div>

          {/* Clean 7-Vehicle Cards Grid - Zero Duplicate Titles or Redundant Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {myDept && myDept.units.map(u => {
              const isAvailable = u.status === 'available';
              return (
                <div
                  key={u.id}
                  className="bg-[#ffffff] rounded-[16px] border border-[#e5e5ea] p-4 flex flex-col justify-between hover:border-[#86868b]/40 transition-colors"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <h3 className="text-[14px] font-semibold text-[#1d1d1f] tracking-tight leading-snug">
                        {u.name}
                      </h3>
                      <span
                        className={`text-[9.5px] font-semibold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                          isAvailable
                            ? 'bg-[#34c759]/10 text-[#248a3d]'
                            : 'bg-[#ff9500]/10 text-[#c93400]'
                        }`}
                      >
                        {u.status}
                      </span>
                    </div>

                    <div className="text-[12px] text-[#0066cc] font-medium leading-tight mb-1">
                      {u.role || u.vehicle}
                    </div>

                    {u.specs && (
                      <div className="text-[11px] text-[#86868b] leading-relaxed mb-3">
                        {u.specs}
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-[#f0f0f0] flex items-center justify-between text-[11px]">
                    <span className="text-[#86868b]">
                      {u.crew ? `Crew of ${u.crew}` : 'Standard Crew'}
                    </span>
                    <span className="font-semibold text-[#1d1d1f] bg-[#f5f5f7] px-2.5 py-0.5 rounded border border-[#e5e5ea]">
                      Cap: {u.capacity} Evacuees
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ════════ SECTION 3: DESIGNATED EVACUATION SHELTERS (FULL WIDTH) ════════ */}
        <section className="bg-[#ffffff] rounded-[20px] border border-[#e5e5ea] p-6 shadow-none w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-[#e5e5ea] mb-4">
            <div>
              <h2 className="text-[18px] font-semibold text-[#1d1d1f] tracking-[-0.02em]">
                Designated Evacuation Shelters & Relief Hubs
              </h2>
              <p className="text-[13px] text-[#86868b]">
                Official high-capacity refuge facilities synchronized with Pune district command
              </p>
            </div>
            <span className="text-[12px] text-[#86868b] font-normal">
              5 Regional Shelters Online
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {fleet && fleet.shelters.map(s => {
              const pct = Math.min(100, Math.round((s.current_occupancy / s.capacity) * 100));
              return (
                <div
                  key={s.id}
                  className="bg-[#ffffff] rounded-[16px] border border-[#e5e5ea] p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3 className="text-[13.5px] font-semibold text-[#1d1d1f] leading-snug">
                        {s.name}
                      </h3>
                      <span className="text-[9.5px] font-semibold uppercase bg-[#f5f5f7] text-[#86868b] px-2 py-0.5 rounded-full border border-[#e5e5ea]">
                        Hub
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-[#86868b] mb-3">
                      {s.lat.toFixed(3)}° N, {s.lon.toFixed(3)}° E
                    </div>
                  </div>

                  <div>
                    <div className="w-full bg-[#f5f5f7] rounded-full h-1.5 mb-2 overflow-hidden border border-[#e5e5ea]">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          s.overflow ? 'bg-[#ff3b30]' : pct > 80 ? 'bg-[#ff9500]' : 'bg-[#0066cc]'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-[#86868b]">
                      <span>Occupancy: {s.current_occupancy}/{s.capacity}</span>
                      <span className="font-semibold text-[#1d1d1f]">{s.remaining_capacity} free</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* ─── IMAGE LIGHTBOX MODAL (Apple Clean Gallery) ─── */}
      {modalImage && (
        <div
          onClick={() => setModalImage(null)}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-6 cursor-pointer"
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-[#1d1d1f] rounded-[20px] overflow-hidden border border-white/20 shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-white/10 text-white">
              <span className="text-[13px] font-medium tracking-tight">Citizen Ground Photo Evidence</span>
              <button
                onClick={() => setModalImage(null)}
                className="text-white/70 hover:text-white text-base font-semibold px-2 py-1 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2 bg-black flex items-center justify-center">
              <img
                src={modalImage}
                alt="Enlarged Ground Evidence"
                className="w-full max-h-[75vh] object-contain rounded-[14px]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
