import re

with open('frontend/src/components/response/DistrictIntelligence.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# We will inject the selectedTeam state right after selectedIncident
code = code.replace(
    'const [selectedIncident, setSelectedIncident] = useState<IncidentMarkerData | null>(null);',
    'const [selectedIncident, setSelectedIncident] = useState<IncidentMarkerData | null>(null);\n  const [selectedTeam, setSelectedTeam] = useState<string>(\'\');'
)

# Rewrite handleDispatch
old_handle_dispatch = re.search(r'const handleDispatch = async \(\) => \{.*?catch \(e\) \{\n      alert\(\'Error calculating route: \' \+ e\);\n    \}\n  \};', code, re.DOTALL).group(0)

new_handle_dispatch = """const handleDispatch = async () => {
    if (!selectedTeam) {
      alert('Please select a Response Team first.');
      return;
    }
    
    try {
      let originLat = 18.5033; // Default Kothrud
      let originLon = 73.8066;
      
      if (selectedTeam === 'pimpri-rescue') {
        originLat = 18.6519; // PCCOE base
        originLon = 73.7619;
      }
      
      // Destination MIT WPU
      const destLat = 18.5182017;
      const destLon = 73.8152712;
      
      const res = await fetch('http://localhost:5000/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin_lat: originLat,
          origin_lon: originLon,
          dest_lat: destLat,
          dest_lon: destLon,
          team_name: selectedTeam
        })
      });
      const data = await res.json();
      
      const missionData = {
        title: 'Emergency: MIT WPU Flooding',
        description: 'Road flooded and people need help immediately.',
        population: 500,
        brief: [
          'Evacuate students and staff from ground floors.',
          'Beware of deep water on primary approach roads.',
          'Follow the dynamically generated safe route.'
        ],
        route: data.waypoints || [],
        distance_km: data.distance_km,
        duration_minutes: data.duration_minutes,
        risk_score: data.overall_risk_score,
        safety_status: data.safety_status
      };
      
      localStorage.setItem('sahayak_active_mission', JSON.stringify(missionData));
      alert('Mission Dispatched successfully! Safe route calculated via NetworkX.');
    } catch (e) {
      alert('Error calculating route: ' + e);
    }
  };"""

code = code.replace(old_handle_dispatch, new_handle_dispatch)

# Rewrite the select dropdown
old_select = """<select
              className="text-[12px] font-medium tracking-[-0.12px] px-3 py-1.5 border border-hairline bg-surface-pearl text-ink rounded-sm focus:outline-none"
              defaultValue=""
            >
              <option value="" disabled>Select Response Team</option>
              <option value="medical-kothrud">Medical-Kothrud Team</option>
              <option value="ndrf-alpha">NDRF Alpha Unit</option>
              <option value="local-police">Local Police Reserve</option>
            </select>"""

new_select = """<select
              className="text-[12px] font-medium tracking-[-0.12px] px-3 py-1.5 border border-hairline bg-surface-pearl text-ink rounded-sm focus:outline-none"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
            >
              <option value="" disabled>Select Response Team</option>
              <option value="medical-kothrud">Medical-Kothrud Team</option>
              <option value="pimpri-rescue">PCCOE Rescue Team</option>
              <option value="ndrf-alpha">NDRF Alpha Unit</option>
              <option value="local-police">Local Police Reserve</option>
            </select>"""

code = code.replace(old_select, new_select)

with open('frontend/src/components/response/DistrictIntelligence.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print('Updated DistrictIntelligence.tsx')
