'use client';

import React from 'react';

interface ReportIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportIncidentModal: React.FC<ReportIncidentModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-md select-none transition-all duration-300">
      <div className="bg-canvas border border-hairline max-w-lg w-full rounded-xl shadow-lg overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-canvas text-ink px-6 py-4 flex items-center justify-between border-b border-hairline">
          <h3 className="font-semibold text-[17px] tracking-[-0.374px]">
            Report an Incident
          </h3>
          <button
            onClick={onClose}
            className="text-ink-muted-48 hover:text-ink transition-colors"
            aria-label="Close modal"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Prototype notice badge */}
        <div className="bg-surface-pearl px-6 py-3 flex flex-col gap-1 border-b border-hairline">
          <span className="text-[12px] font-semibold tracking-[-0.12px] text-ink uppercase">
            Prototype Interface
          </span>
          <span className="text-[12px] text-ink-muted-80 tracking-[-0.12px]">
            Reporting backend will be connected in Phase 5
          </span>
        </div>

        {/* Modal content */}
        <div className="p-6 space-y-5">
          <p className="text-[14px] text-ink-muted-80 leading-[1.43] tracking-[-0.224px]">
            Report flooding, blocked roads, infrastructure damage, or people requiring assistance.
            Ground observations undergo multi-source verification and feed directly into the operational priority queue.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="space-y-4">
            {/* Location */}
            <div>
              <label className="block text-[12px] font-normal tracking-[-0.12px] text-ink-muted-48 mb-1.5 uppercase">
                Incident Location
              </label>
              <input
                type="text"
                placeholder="e.g. Pirangut Mutha River Causeway, Mulshi"
                disabled
                className="w-full bg-surface-pearl border border-hairline rounded-sm px-3 py-2.5 text-[14px] text-ink cursor-not-allowed opacity-70"
              />
            </div>

            {/* Incident Type */}
            <div>
              <label className="block text-[12px] font-normal tracking-[-0.12px] text-ink-muted-48 mb-1.5 uppercase">
                Classification
              </label>
              <select
                disabled
                className="w-full bg-surface-pearl border border-hairline rounded-sm px-3 py-2.5 text-[14px] text-ink cursor-not-allowed opacity-70"
              >
                <option>Bridge / Culvert Overflow</option>
                <option>Road Blockage / Landslide</option>
                <option>Power / Electrical Infrastructure Hazard</option>
                <option>Stranded Persons / Rescue Request</option>
                <option>Settlement Inundation</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-normal tracking-[-0.12px] text-ink-muted-48 mb-1.5 uppercase">
                Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe water depth, current speed, visible structural damage..."
                disabled
                className="w-full bg-surface-pearl border border-hairline rounded-sm px-3 py-2.5 text-[14px] text-ink cursor-not-allowed opacity-70 resize-none"
              />
            </div>

            {/* Photo Attachment (Visual mockup) */}
            <div>
              <label className="block text-[12px] font-normal tracking-[-0.12px] text-ink-muted-48 mb-1.5 uppercase">
                Photo Evidence
              </label>
              <div className="border border-dashed border-hairline bg-surface-pearl rounded-sm p-4 text-center cursor-not-allowed opacity-70">
                <span className="text-[14px] text-ink block mb-1">
                  Drag & drop photos or browse
                </span>
                <span className="text-[12px] text-ink-muted-80 block">
                  GPS EXIF metadata will be validated automatically
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 flex items-center justify-end gap-3 border-t border-divider-soft">
              <button
                type="button"
                onClick={onClose}
                className="bg-surface-pearl border border-hairline text-ink-muted-80 text-[14px] font-normal rounded-pill px-[18px] py-[10px] hover:scale-95 transition-transform"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-primary text-on-primary text-[14px] font-normal rounded-pill px-[22px] py-[10px] hover:scale-95 transition-transform shadow-sm"
              >
                Submit Report
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
