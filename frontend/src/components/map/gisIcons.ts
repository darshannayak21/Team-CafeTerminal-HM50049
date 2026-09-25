import { IncidentMarkerData } from '@/types/prototype';

/**
 * Returns clean SVG markup for map incident and facility markers.
 * Avoids emoji overload and renders crisp, professional GIS icons.
 */
export function getIncidentMarkerSvg(type: IncidentMarkerData['type'], severity: IncidentMarkerData['severity']): string {
  const color = severity === 'CRITICAL' ? '#B66F55' : severity === 'HIGH' ? '#8A624E' : '#557A95';

  let iconContent = '';
  switch (type) {
    case 'bridge':
      // Bridge arch with water waves
      iconContent = `
        <path d="M4 14h16M4 10h16M7 10v4M11 10v4M15 10v4M19 10v4M3 18c2 0 3-1 5-1s3 1 5 1 3-1 5-1 3 1 5 1" stroke="#FAF8F3" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      `;
      break;
    case 'road':
      // Road barrier / blockage symbol
      iconContent = `
        <path d="M5 8h14v8H5zM8 8v8M12 8v8M16 8v8M3 18h18" stroke="#FAF8F3" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      `;
      break;
    case 'power':
      // High-voltage transmission tower / lightning bolt
      iconContent = `
        <path d="M13 3L6 13h5l-2 8 8-10h-5l2-8z" stroke="#FAF8F3" stroke-width="1.6" stroke-linejoin="round" fill="#FAF8F3"/>
      `;
      break;
    case 'people':
      // People rescue / assistance figure
      iconContent = `
        <circle cx="12" cy="7" r="3" stroke="#FAF8F3" stroke-width="1.8" fill="none"/>
        <path d="M6 19v-2a4 4 0 014-4h4a4 4 0 014 4v2M12 11v6M9 14h6" stroke="#FAF8F3" stroke-width="1.8" stroke-linecap="round" fill="none"/>
      `;
      break;
    case 'settlement':
    default:
      // Settlement cluster / dwellings
      iconContent = `
        <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9zM9 20v-6h6v6" stroke="#FAF8F3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      `;
      break;
  }

  return `
    <div style="
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      background-color: ${color};
      border: 2px solid #FAF8F3;
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
      cursor: pointer;
    ">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        ${iconContent}
      </svg>
    </div>
  `;
}
