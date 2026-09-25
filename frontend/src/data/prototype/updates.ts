import { SimulatedUpdate } from '@/types/prototype';

export const PROTOTYPE_LIVE_UPDATES: SimulatedUpdate[] = [
  {
    id: 'upd-01',
    time: '19:42',
    severity: 'CRITICAL',
    eventDescription: 'Bridge reported inaccessible due to flash water overflow',
    location: 'Pirangut, Mulshi',
    talukaId: 'mulshi'
  },
  {
    id: 'upd-02',
    time: '19:36',
    severity: 'HIGH',
    eventDescription: 'Heavy rainfall threshold exceeded (42 mm/h recorded at Tamhini station)',
    location: 'Upper Mulshi Catchment',
    talukaId: 'mulshi'
  },
  {
    id: 'upd-03',
    time: '19:28',
    severity: 'HIGH',
    eventDescription: 'Highway underpass water accumulation restricting traffic flow to single lane',
    location: 'Kamshet Corridor, Maval',
    talukaId: 'maval'
  },
  {
    id: 'upd-04',
    time: '19:21',
    severity: 'CRITICAL',
    eventDescription: 'Road disruption reported; 40m debris slide across Paud-Tamhini highway',
    location: 'SH-60 Descent, Mulshi',
    talukaId: 'mulshi'
  },
  {
    id: 'upd-05',
    time: '19:12',
    severity: 'HIGH',
    eventDescription: 'Culvert capacity breached; industrial freight traffic diverted to alternate ring road',
    location: 'Chakan MIDC Phase 2, Khed',
    talukaId: 'khed'
  },
  {
    id: 'upd-06',
    time: '19:05',
    severity: 'CRITICAL',
    eventDescription: 'Settlement impact increased; 240 riverside dwellings experiencing water ingress',
    location: 'Paud Central Ward, Mulshi',
    talukaId: 'mulshi'
  },
  {
    id: 'upd-07',
    time: '18:50',
    severity: 'CRITICAL',
    eventDescription: 'Ground assistance request logged: 18 residents sheltered on elevated school terrace',
    location: 'Male Wasti, Mulshi',
    talukaId: 'mulshi'
  },
  {
    id: 'upd-08',
    time: '18:35',
    severity: 'MODERATE',
    eventDescription: 'Canal sluice gates opened by 15%; continuous monitoring active downstream',
    location: 'Khadakwasla Basin, Haveli',
    talukaId: 'haveli'
  }
];
