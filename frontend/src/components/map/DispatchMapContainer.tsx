'use client';

import React from 'react';
import dynamic from 'next/dynamic';

const DynamicDispatchMap = dynamic(
  () => import('./DispatchMap').then(mod => mod.DispatchMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full min-h-[420px] rounded-[18px] bg-slate-100 flex items-center justify-center border border-hairline">
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
          <span className="text-[12px] font-medium text-slate-500">Initializing Tactical Base Map...</span>
        </div>
      </div>
    ),
  }
);

export const DispatchMapContainer: React.FC<any> = (props) => {
  return <DynamicDispatchMap {...props} />;
};
