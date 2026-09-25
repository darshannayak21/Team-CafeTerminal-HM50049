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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-[#FAF8F3] border-2 border-[#18324A] max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-[#18324A] text-[#FAF8F3] px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 bg-[#B66F55]" />
            <h3 className="font-serif font-bold text-base tracking-normal">
              Ground Reporting Module
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#8FAFC2] hover:text-[#FAF8F3] text-lg font-mono font-bold leading-none cursor-pointer"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Prototype notice badge */}
        <div className="bg-[#F3EEE5] border-b border-[#D9D0C4] px-5 py-2 flex items-center justify-between text-xs font-mono text-[#654536]">
          <span className="font-bold uppercase tracking-wider">
            Prototype Interface
          </span>
          <span>Reporting backend will be connected in Phase 5</span>
        </div>

        {/* Modal content */}
        <div className="p-5 space-y-4">
          <p className="text-xs text-[#273038] font-sans leading-relaxed">
            Report flooding, blocked roads, infrastructure damage, or people requiring assistance.
            Ground observations undergo multi-source verification and feed directly into the operational priority queue.
          </p>

          <form onSubmit={(e) => { e.preventDefault(); onClose(); }} className="space-y-3">
            {/* Location */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68747B] mb-1">
                Incident Location (Pincode / Landmark / GPS)
              </label>
              <input
                type="text"
                placeholder="e.g. Pirangut Mutha River Causeway, Mulshi"
                disabled
                className="w-full bg-[#F3EEE5]/50 border border-[#D9D0C4] px-3 py-2 text-xs font-sans text-[#273038] cursor-not-allowed opacity-80"
              />
            </div>

            {/* Incident Type */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68747B] mb-1">
                Incident Classification
              </label>
              <select
                disabled
                className="w-full bg-[#F3EEE5]/50 border border-[#D9D0C4] px-3 py-2 text-xs font-sans text-[#273038] cursor-not-allowed opacity-80"
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
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68747B] mb-1">
                Field Observation Description
              </label>
              <textarea
                rows={3}
                placeholder="Describe water depth, current speed, visible structural damage, or number of stranded individuals..."
                disabled
                className="w-full bg-[#F3EEE5]/50 border border-[#D9D0C4] px-3 py-2 text-xs font-sans text-[#273038] cursor-not-allowed opacity-80 resize-none"
              />
            </div>

            {/* Photo Attachment (Visual mockup) */}
            <div>
              <label className="block text-[11px] font-mono uppercase tracking-wider text-[#68747B] mb-1">
                Geotagged Photo Evidence
              </label>
              <div className="border border-dashed border-[#D9D0C4] bg-[#FAF8F3] p-3 text-center cursor-not-allowed opacity-75">
                <span className="text-xs text-[#68747B] font-mono block">
                  Drag &amp; drop field photos or click to browse
                </span>
                <span className="text-[10px] text-[#8FAFC2] block mt-0.5">
                  GPS EXIF metadata will be validated automatically
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-between border-t border-[#D9D0C4]">
              <span className="text-[11px] font-mono text-[#8A624E]">
                Prototype — reporting will be connected later.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 border border-[#D9D0C4] text-xs font-mono text-[#654536] hover:bg-[#F3EEE5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-[#B66F55] hover:bg-[#8A624E] text-[#FAF8F3] text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
