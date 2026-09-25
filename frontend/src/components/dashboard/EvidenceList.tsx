import React from 'react';

interface EvidenceListProps {
  evidence: string[];
}

export const EvidenceList: React.FC<EvidenceListProps> = ({ evidence }) => {
  if (!evidence || evidence.length === 0) {
    return (
      <p className="text-xs font-mono text-[#68747B] italic">
        No active evidence factors reported.
      </p>
    );
  }

  return (
    <ul className="space-y-1.5 font-mono text-xs">
      {evidence.map((item, idx) => (
        <li 
          key={idx}
          className="flex items-start gap-2 text-[#273038] bg-[#F3EEE5]/40 border border-[#D9D0C4]/70 p-2"
        >
          <span className="text-[#8A624E] font-bold shrink-0">›</span>
          <span className="leading-snug text-[11px]">{item}</span>
        </li>
      ))}
    </ul>
  );
};
