import { IncidentMarkerData } from '@/types/prototype';

export const PROTOTYPE_INCIDENTS: IncidentMarkerData[] = [
  // ── Mulshi Incidents (Detailed Scenario) ──────────────────────────────
  {
    id: 'inc-mul-01',
    talukaId: 'mulshi',
    type: 'bridge',
    title: 'Bridge Affected',
    locationName: 'Pirangut Bridge Over Mutha',
    timestamp: '19:42',
    description: 'Bridge reported inaccessible due to turbulent flash overflow and debris accumulation.',
    source: 'Ground Report — SIMULATED',
    coordinates: [18.512, 73.678],
    severity: 'CRITICAL'
  },
  {
    id: 'inc-mul-02',
    talukaId: 'mulshi',
    type: 'road',
    title: 'Road Blocked',
    locationName: 'Paud-Tamhini Ghat Road (SH-60)',
    timestamp: '19:21',
    description: 'Mudslide spanning 40m across both lanes near Tamhini descent; heavy vehicular transit halted.',
    source: 'PWD Field Team — SIMULATED',
    coordinates: [18.472, 73.498],
    severity: 'CRITICAL'
  },
  {
    id: 'inc-mul-03',
    talukaId: 'mulshi',
    type: 'power',
    title: 'Power Infrastructure Damaged',
    locationName: 'Mulshi Dam Substation Sector 3',
    timestamp: '19:15',
    description: 'High-tension feeder pole collapsed from waterlogged soil bank; local feeder disconnected safely.',
    source: 'MSEDCL Grid Telemetry — SIMULATED',
    coordinates: [18.535, 73.512],
    severity: 'HIGH'
  },
  {
    id: 'inc-mul-04',
    talukaId: 'mulshi',
    type: 'people',
    title: 'People Requiring Assistance',
    locationName: 'Male Low-Lying Wasti',
    timestamp: '18:50',
    description: 'Approximately 18 residents stranded on higher ground as approach culvert became submerged.',
    source: 'Gram Panchayat Radio — SIMULATED',
    coordinates: [18.548, 73.542],
    severity: 'CRITICAL'
  },
  {
    id: 'inc-mul-05',
    talukaId: 'mulshi',
    type: 'settlement',
    title: 'Affected Settlement Cluster',
    locationName: 'Paud Central Ward',
    timestamp: '18:35',
    description: 'Water ingress into 240 riverside dwellings; community hall opened for temporary shelter.',
    source: 'Revenue Office Inspection — SIMULATED',
    coordinates: [18.532, 73.612],
    severity: 'HIGH'
  },

  // ── Maval Incidents (Detailed Scenario) ───────────────────────────────
  {
    id: 'inc-mav-01',
    talukaId: 'maval',
    type: 'road',
    title: 'Road Disruption',
    locationName: 'Old Mumbai-Pune Highway (Near Kamshet)',
    timestamp: '19:28',
    description: '30cm standing water across lower expressway service lanes; single-lane escorted transit active.',
    source: 'Highway Patrol Briefing — SIMULATED',
    coordinates: [18.761, 73.560],
    severity: 'HIGH'
  },
  {
    id: 'inc-mav-02',
    talukaId: 'maval',
    type: 'settlement',
    title: 'Affected Settlement Cluster',
    locationName: 'Lonavala Lower Bazaar Ward',
    timestamp: '18:55',
    description: 'Drainage overflow triggered basement inundation in 65 commercial and residential units.',
    source: 'Municipal Fire Brigade — SIMULATED',
    coordinates: [18.755, 73.408],
    severity: 'HIGH'
  },
  {
    id: 'inc-mav-03',
    talukaId: 'maval',
    type: 'power',
    title: 'Infrastructure Incident',
    locationName: 'Talegaon Dabhade Pumping Unit 2',
    timestamp: '18:10',
    description: 'Auxiliary backup generator flooded; main pump switchboard switching to high-stand generator.',
    source: 'Irrigation Dept Telemetry — SIMULATED',
    coordinates: [18.730, 73.675],
    severity: 'MODERATE'
  },

  // ── Khed Incidents (Detailed Scenario) ────────────────────────────────
  {
    id: 'inc-khd-01',
    talukaId: 'khed',
    type: 'road',
    title: 'Flooded Road Segment',
    locationName: 'Chakan-Shikrapur MIDC Corridor',
    timestamp: '19:12',
    description: 'Industrial stream overflowed culvert pipe, causing severe 2km transport bottleneck.',
    source: 'Traffic Control Branch — SIMULATED',
    coordinates: [18.758, 73.855],
    severity: 'HIGH'
  },
  {
    id: 'inc-khd-02',
    talukaId: 'khed',
    type: 'settlement',
    title: 'Settlement Impact',
    locationName: 'Rajgurunagar Riverside Hamlet',
    timestamp: '18:40',
    description: 'Bhima river backflow encroaching pasture land and peripheral farm huts; 110 families alerted.',
    source: 'Tehsildar Ground Inspection — SIMULATED',
    coordinates: [18.861, 73.918],
    severity: 'HIGH'
  },
  {
    id: 'inc-khd-03',
    talukaId: 'khed',
    type: 'people',
    title: 'Ground Assistance Request',
    locationName: 'Chakan Phase II Labor Housing',
    timestamp: '18:15',
    description: 'Workers requesting sandbags and high-clearance tractor for water egress from dorm quarters.',
    source: 'Citizen Ground Report — SIMULATED',
    coordinates: [18.790, 73.872],
    severity: 'MODERATE'
  },

  // ── Haveli Incidents ──────────────────────────────────────────────────
  {
    id: 'inc-hav-01',
    talukaId: 'haveli',
    type: 'road',
    title: 'Waterlogged Underpass',
    locationName: 'Sinhagad Road Canal Crossing',
    timestamp: '18:22',
    description: 'Stormwater accumulation up to 25cm; passenger vehicles diverted via elevated arterial.',
    source: 'PMC Disaster Cell — SIMULATED',
    coordinates: [18.482, 73.818],
    severity: 'MODERATE'
  }
];
