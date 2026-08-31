'use client';

import React from 'react';
import StatusBadge from './StatusBadge';
import { FileText, Clock, AlertTriangle, Hash } from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
   SRSViewer
   Renders the SRS in the EXACT structure of the classic
   Karl E. Wiegers "Software Requirements Specification" template
   (srs_template.pdf):

     Cover Page  →  Table of Contents  →  Revision History  →
     1. Introduction  …  6. Other Requirements  →
     Appendix A: Glossary | Appendix B: Analysis Models |
     Appendix C: Issues List

   IMPORTANT: No backend / data-schema changes.
   Reads the exact same `srs` fields as before and keeps the
   same props: { srs, activeSection, onSelectSection }.
   ───────────────────────────────────────────────────────────────── */

// Wiegers template convention: use "TBD" as a placeholder when
// necessary information is not yet available.
const TBD = () => <span className="italic text-amber-400/80">TBD</span>;

const text = (value, fallback) =>
  value === undefined || value === null || String(value).trim() === ''
    ? (fallback !== undefined ? fallback : TBD())
    : value;

// Section 5 fields may arrive as a string OR an array — join arrays
// into prose, exactly like the previous version did.
const asText = (value) => (Array.isArray(value) ? value.join(' ') : value);

// Derive the project name for the cover page. Strips a leading
// "Software Requirements Specification (for)" / "SRS" prefix if the
// title already contains one, so the cover never duplicates itself.
const projectNameFrom = (srs) => {
  const raw = (srs?.metadata?.title || '').trim();
  if (!raw) return '<Project>';
  const cleaned = raw
    .replace(/^(software requirements specification|srs)\s*(for)?\s*:?\s*/i, '')
    .trim();
  return cleaned || '<Project>';
};

export default function SRSViewer({ srs, activeSection = 'all', onSelectSection = () => {} }) {
  if (!srs) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
        <FileText className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-300">No SRS Generated Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
          Complete the requirement interview or extraction step, then click "Generate SRS" to build the specification.
        </p>
      </div>
    );
  }

  const shouldShow = (secKey) => {
    return activeSection === 'all' || activeSection === secKey;
  };

  const projectName = projectNameFrom(srs);
  const features = srs.section3_systemFeatures || [];

  // ── Table of Contents rows — exact titles & order from the PDF ──
  const featureTocRows = features.length
    ? features.map((f, i) => ({
        key: 'sec3',
        label: `${f.featureId || `3.${i + 1}`} ${f.featureName || `System Feature ${i + 1}`}`,
        level: 1,
        page: `${3 + Math.floor(i / 2)}`
      }))
    : [
        { key: 'sec3', label: '3.1 System Feature 1', level: 1, page: '3' },
        { key: 'sec3', label: '3.2 System Feature 2 (and so on)', level: 1, page: '4' },
      ];

  const toc = [
    { key: 'toc', label: 'Table of Contents', level: 0, page: 'ii' },
    { key: 'revision', label: 'Revision History', level: 0, page: 'ii' },

    { key: 'sec1', label: '1. Introduction', level: 0, page: '1' },
    { key: 'sec1', label: '1.1 Purpose', level: 1, page: '1' },
    { key: 'sec1', label: '1.2 Document Conventions', level: 1, page: '1' },
    { key: 'sec1', label: '1.3 Intended Audience and Reading Suggestions', level: 1, page: '1' },
    { key: 'sec1', label: '1.4 Project Scope', level: 1, page: '1' },
    { key: 'sec1', label: '1.5 References', level: 1, page: '1' },

    { key: 'sec2', label: '2. Overall Description', level: 0, page: '2' },
    { key: 'sec2', label: '2.1 Product Perspective', level: 1, page: '2' },
    { key: 'sec2', label: '2.2 Product Features', level: 1, page: '2' },
    { key: 'sec2', label: '2.3 User Classes and Characteristics', level: 1, page: '2' },
    { key: 'sec2', label: '2.4 Operating Environment', level: 1, page: '2' },
    { key: 'sec2', label: '2.5 Design and Implementation Constraints', level: 1, page: '2' },
    { key: 'sec2', label: '2.6 User Documentation', level: 1, page: '2' },
    { key: 'sec2', label: '2.7 Assumptions and Dependencies', level: 1, page: '3' },

    { key: 'sec3', label: '3. System Features', level: 0, page: '3' },
    ...featureTocRows,

    { key: 'sec4', label: '4. External Interface Requirements', level: 0, page: '4' },
    { key: 'sec4', label: '4.1 User Interfaces', level: 1, page: '4' },
    { key: 'sec4', label: '4.2 Hardware Interfaces', level: 1, page: '4' },
    { key: 'sec4', label: '4.3 Software Interfaces', level: 1, page: '4' },
    { key: 'sec4', label: '4.4 Communications Interfaces', level: 1, page: '4' },

    { key: 'sec5', label: '5. Other Nonfunctional Requirements', level: 0, page: '5' },
    { key: 'sec5', label: '5.1 Performance Requirements', level: 1, page: '5' },
    { key: 'sec5', label: '5.2 Safety Requirements', level: 1, page: '5' },
    { key: 'sec5', label: '5.3 Security Requirements', level: 1, page: '5' },
    { key: 'sec5', label: '5.4 Software Quality Attributes', level: 1, page: '5' },

    { key: 'sec6', label: '6. Other Requirements', level: 0, page: '5' },

    { key: 'appA', label: 'Appendix A: Glossary', level: 0, page: '5' },
    { key: 'appB', label: 'Appendix B: Analysis Models', level: 0, page: '6' },
    { key: 'appC', label: 'Appendix C: Issues List', level: 0, page: '6' },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* ── COVER PAGE — exact Karl E. Wiegers standard title page ── */}
      <div className="px-8 md:px-14 py-12 border-b border-slate-800 bg-slate-950/40">
        {/* Top thick black bar */}
        <div className="w-full h-1 bg-slate-700/80 mb-14" />

        {/* Right-aligned title and metadata block */}
        <div className="text-right space-y-6 max-w-2xl ml-auto">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Software Requirements<br />Specification
            </h1>
            <p className="mt-4 text-base italic text-slate-400 font-semibold">for</p>
            <p className="mt-2 text-2xl md:text-3xl font-extrabold text-emerald-400">{projectName}</p>
          </div>

          <div className="pt-8 space-y-1.5 text-sm text-slate-300 font-semibold">
            <div className="flex items-center gap-2 justify-end">
              <span>Version {srs.currentVersion || '1.0'} approved</span>
              <StatusBadge status={srs.status} size="xs" />
            </div>
            <div>Prepared by {srs.metadata?.preparedBy || '<author>'}</div>
            <div>{srs.metadata?.organization || '<organization>'}</div>
            <div>{srs.metadata?.date || new Date().toISOString().split('T')[0]}</div>
          </div>
        </div>

        {/* Bottom copyright notice */}
        <p className="mt-20 text-[11px] leading-relaxed italic text-slate-500 text-left">
          Copyright © 2002 by Karl E. Wiegers. Permission is granted to use, modify, and distribute this document.
        </p>
      </div>

      {/* ── TABLE OF CONTENTS — every entry, dotted leaders, page numbers ── */}
      {shouldShow('toc') && (
        <div className="p-6 md:p-8 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400 italic mb-6 pb-2 border-b border-slate-800/60">
            <span>Software Requirements Specification for {projectName}</span>
            <span>Page ii</span>
          </div>

          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Hash className="w-4 h-4 text-emerald-400" />
            Table of Contents
          </h2>
          <div className="max-w-2xl space-y-1.5 text-xs">
            {toc.map((t, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectSection(t.key)}
                className={`w-full flex items-baseline gap-3 text-left group cursor-pointer ${t.level === 1 ? 'pl-6' : ''}`}
              >
                <span
                  className={`shrink-0 transition-colors ${
                    t.level === 0
                      ? 'text-slate-200 font-semibold group-hover:text-emerald-300'
                      : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </span>
                <span
                  aria-hidden="true"
                  className="flex-1 border-b border-dotted border-slate-700/70 relative -top-1 min-w-[24px]"
                />
                <span className="shrink-0 text-slate-400 font-mono text-xs group-hover:text-slate-200">
                  {t.page}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── REVISION HISTORY — Name | Date | Reason For Changes | Version ── */}
      {shouldShow('revision') && (
        <div className="p-6 md:p-8 border-b border-slate-800">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            Revision History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-lg">
              <thead className="bg-slate-800 text-slate-300 font-semibold">
                <tr>
                  <th className="p-2.5 border-b border-slate-700">Name</th>
                  <th className="p-2.5 border-b border-slate-700">Date</th>
                  <th className="p-2.5 border-b border-slate-700">Reason For Changes</th>
                  <th className="p-2.5 border-b border-slate-700">Version</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(srs.revisionHistory || []).map((rev, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="p-2.5 text-slate-300 font-medium">{rev.author || 'Reviewer'}</td>
                    <td className="p-2.5 text-slate-400">{rev.date}</td>
                    <td className="p-2.5 text-slate-300">{rev.reasonForChanges}</td>
                    <td className="p-2.5 font-mono text-emerald-400 font-bold">v{rev.version}</td>
                  </tr>
                ))}
                {(!srs.revisionHistory || srs.revisionHistory.length === 0) && (
                  <tr>
                    <td colSpan={4} className="p-2.5 text-slate-500 italic">No revisions recorded yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DOCUMENT BODY ── */}
      <div className="p-6 md:p-8 space-y-10 text-sm leading-relaxed text-slate-300">

        {/* 1. Introduction */}
        {shouldShow('sec1') && (
          <section id="sec1" className="space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">1. Introduction</h2>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.1 Purpose</h3>
              <p className="text-slate-300">{text(srs.section1_introduction?.purpose)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.2 Document Conventions</h3>
              <p className="text-slate-300">
                {text(
                  srs.section1_introduction?.documentConventions,
                  'Requirements are uniquely tagged using FR-XXX and NFR-XXX conventions.'
                )}
              </p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.3 Intended Audience and Reading Suggestions</h3>
              <p className="text-slate-300">{text(srs.section1_introduction?.intendedAudience)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.4 Project Scope</h3>
              <p className="text-slate-300">{text(srs.section1_introduction?.projectScope)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.5 References</h3>
              {(srs.section1_introduction?.references || []).length > 0 ? (
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  {srs.section1_introduction.references.map((ref, i) => (
                    <li key={i}>{ref}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-300">{TBD()}</p>
              )}
            </div>
          </section>
        )}

        {/* 2. Overall Description */}
        {shouldShow('sec2') && (
          <section id="sec2" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Overall Description</h2>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.1 Product Perspective</h3>
              <p className="text-slate-300">{text(srs.section2_overallDescription?.productPerspective)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.2 Product Features</h3>
              <p className="text-slate-300">{text(srs.section2_overallDescription?.productFeatures)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.3 User Classes and Characteristics</h3>
              <p className="text-slate-300">{text(srs.section2_overallDescription?.userClassesAndCharacteristics)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.4 Operating Environment</h3>
              <p className="text-slate-300">{text(srs.section2_overallDescription?.operatingEnvironment)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.5 Design and Implementation Constraints</h3>
              <p className="text-slate-300">{text(srs.section2_overallDescription?.designAndImplementationConstraints)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.6 User Documentation</h3>
              <p className="text-slate-300">{text(srs.section2_overallDescription?.userDocumentation)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.7 Assumptions and Dependencies</h3>
              <p className="text-slate-300">{text(srs.section2_overallDescription?.assumptionsAndDependencies)}</p>
            </div>
          </section>
        )}

        {/* 3. System Features — 3.x feature → 3.x.1 / 3.x.2 / 3.x.3 → REQ items */}
        {shouldShow('sec3') && (
          <section id="sec3" className="space-y-6 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">3. System Features</h2>

            {features.length === 0 && (
              <p className="text-slate-300">{TBD()}</p>
            )}

            {features.map((feat, idx) => {
              const fid = feat.featureId || `3.${idx + 1}`;
              return (
                <div key={idx} className="bg-slate-950/40 p-5 rounded-lg border border-slate-800 space-y-4">
                  <h3 className="text-base font-bold text-emerald-400">
                    {fid} {feat.featureName || `System Feature ${idx + 1}`}
                  </h3>

                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {fid}.1 Description and Priority
                    </h4>
                    <p className="text-slate-300 text-xs">{text(feat.descriptionAndPriority)}</p>
                  </div>

                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {fid}.2 Stimulus/Response Sequences
                    </h4>
                    {(feat.stimulusResponseSequences || []).length > 0 ? (
                      <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                        {feat.stimulusResponseSequences.map((seq, sIdx) => (
                          <li key={sIdx}>{seq}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-300">{TBD()}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {fid}.3 Functional Requirements
                    </h4>
                    {(feat.functionalRequirements || []).length > 0 ? (
                      <div className="space-y-2">
                        {feat.functionalRequirements.map((fr, frIdx) => (
                          <div key={frIdx} className="p-3 bg-slate-900/80 rounded border border-slate-800/80">
                            <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                              <span className="font-mono font-bold text-xs text-emerald-400">
                                {fr.requirementId || `REQ-${frIdx + 1}`}:
                              </span>
                              {fr.title && <span className="font-medium text-xs text-white">{fr.title}</span>}
                            </div>
                            <p className="text-xs text-slate-400">{fr.statement}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-300">{TBD()}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* 4. External Interface Requirements */}
        {shouldShow('sec4') && (
          <section id="sec4" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">4. External Interface Requirements</h2>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">4.1 User Interfaces</h3>
              <p className="text-slate-300">{text(srs.section4_externalInterfaceRequirements?.userInterfaces)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">4.2 Hardware Interfaces</h3>
              <p className="text-slate-300">{text(srs.section4_externalInterfaceRequirements?.hardwareInterfaces)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">4.3 Software Interfaces</h3>
              <p className="text-slate-300">{text(srs.section4_externalInterfaceRequirements?.softwareInterfaces)}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">4.4 Communications Interfaces</h3>
              <p className="text-slate-300">{text(srs.section4_externalInterfaceRequirements?.communicationsInterfaces)}</p>
            </div>
          </section>
        )}

        {/* 5. Other Nonfunctional Requirements */}
        {shouldShow('sec5') && (
          <section id="sec5" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">5. Other Nonfunctional Requirements</h2>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">5.1 Performance Requirements</h3>
              <p className="text-slate-300">{text(asText(srs.section5_otherNonfunctionalRequirements?.performanceRequirements))}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">5.2 Safety Requirements</h3>
              <p className="text-slate-300">{text(asText(srs.section5_otherNonfunctionalRequirements?.safetyRequirements))}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">5.3 Security Requirements</h3>
              <p className="text-slate-300">{text(asText(srs.section5_otherNonfunctionalRequirements?.securityRequirements))}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">5.4 Software Quality Attributes</h3>
              <p className="text-slate-300">{text(asText(srs.section5_otherNonfunctionalRequirements?.softwareQualityAttributes))}</p>
            </div>
          </section>
        )}

        {/* 6. Other Requirements */}
        {shouldShow('sec6') && (
          <section id="sec6" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">6. Other Requirements</h2>
            <p className="text-slate-300">{text(srs.section6_otherRequirements?.content, 'No additional requirements identified.')}</p>
          </section>
        )}

        {/* Appendix A: Glossary */}
        {shouldShow('appA') && (
          <section id="appA" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">Appendix A: Glossary</h2>
            {(srs.appendixA_glossary || []).length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {srs.appendixA_glossary.map((term, tIdx) => (
                  <div key={tIdx} className="p-3 bg-slate-950/40 rounded border border-slate-800 text-xs">
                    <span className="font-bold text-emerald-400 block mb-0.5">{term.term}</span>
                    <span className="text-slate-300">{term.definition}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-300">{TBD()}</p>
            )}
          </section>
        )}

        {/* Appendix B: Analysis Models */}
        {shouldShow('appB') && (
          <section id="appB" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">Appendix B: Analysis Models</h2>
            <p className="text-slate-300 text-xs">
              {text(srs.appendixB_analysisModels?.description, 'Optionally, include any pertinent analysis models, such as data flow diagrams, class diagrams, state-transition diagrams, or entity-relationship diagrams.')}
            </p>
            <div className="flex gap-2 flex-wrap">
              {(srs.appendixB_analysisModels?.diagramTypes || ['Data Flow Diagram', 'Entity Relationship Diagram']).map((d, di) => (
                <span key={di} className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-xs border border-slate-700">
                  {d}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Appendix C: Issues List */}
        {shouldShow('appC') && (
          <section id="appC" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Appendix C: Issues List
            </h2>
            {(!srs.appendixC_issuesList || srs.appendixC_issuesList.length === 0) ? (
              <p className="text-xs text-slate-400">All requirements validated. No pending TBDs or conflicts.</p>
            ) : (
              <div className="space-y-2">
                {srs.appendixC_issuesList.map((iss, iIdx) => {
                  const isResolved = iss.status === 'RESOLVED' || iss.status === 'CLOSED' || iss.status === 'MERGED' || iss.status === 'KEPT_BOTH';
                  return (
                    <div
                      key={iIdx}
                      className={`p-3 rounded text-xs flex justify-between items-center border ${
                        isResolved
                          ? 'bg-emerald-950/20 border-emerald-500/20'
                          : 'bg-amber-500/5 border-amber-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`font-mono font-bold ${isResolved ? 'text-emerald-400' : 'text-amber-400'}`}>
                          [{iss.issueId}]
                        </span>
                        <span className="text-slate-200">{iss.description}</span>
                        {iss.relatedRequirement && iss.relatedRequirement !== 'N/A' && (
                          <span className="text-[11px] text-slate-400">({iss.relatedRequirement})</span>
                        )}
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                          isResolved
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {iss.status || 'OPEN'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Document footer */}
      <div className="px-8 py-4 border-t border-slate-800 bg-slate-950/60 text-center text-[10px] text-slate-600">
        Software Requirements Specification for {projectName} — structured after the Karl E. Wiegers SRS template
      </div>
    </div>
  );
}