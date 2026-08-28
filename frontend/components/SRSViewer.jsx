'use client';

import React from 'react';
import StatusBadge from './StatusBadge';
import { FileText, Clock, AlertTriangle, Shield, CheckCircle, Hash } from 'lucide-react';

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

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Document Cover Header */}
      <div className="p-8 border-b border-slate-800 bg-gradient-to-b from-slate-850 to-slate-900 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-4">
          ISO/IEC/IEEE 29148:2018 & IEEE 830 Aligned
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-3">
          {srs.metadata?.title || "Software Requirements Specification"}
        </h1>
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400">
          <div><strong className="text-slate-200">Version:</strong> {srs.currentVersion || '1.0'}</div>
          <div><strong className="text-slate-200">Prepared by:</strong> {srs.metadata?.preparedBy || 'Requirements Engineering Team'}</div>
          <div><strong className="text-slate-200">Organization:</strong> {srs.metadata?.organization || 'IntelliSDLC AI'}</div>
          <div><strong className="text-slate-200">Date:</strong> {srs.metadata?.date || new Date().toISOString().split('T')[0]}</div>
          <div><strong className="text-slate-200">Status:</strong> <StatusBadge status={srs.status} size="xs" /></div>
        </div>
      </div>

      {/* Table of Contents Summary */}
      {shouldShow('toc') && (
        <div className="p-6 border-b border-slate-800 bg-slate-950/40">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Hash className="w-4 h-4 text-brand-400" />
            Table of Contents
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-400">
            <div>1. Introduction (1.1 - 1.5)</div>
            <div>2. Overall Description (2.1 - 2.7)</div>
            <div>3. System Features (3.1 - 3.X)</div>
            <div>4. External Interface Requirements (4.1 - 4.4)</div>
            <div>5. Other Nonfunctional Requirements (5.1 - 5.4)</div>
            <div>6. Other Requirements</div>
            <div>Appendix A: Glossary | Appendix B: Analysis Models | Appendix C: Issues List</div>
          </div>
        </div>
      )}

      {/* Revision History */}
      {shouldShow('revision') && (
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-400" />
            Revision History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-lg">
              <thead className="bg-slate-800 text-slate-300 font-semibold">
                <tr>
                  <th className="p-2.5 border-b border-slate-700">Name / Author</th>
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
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Body Sections */}
      <div className="p-8 space-y-10 text-sm leading-relaxed text-slate-300">
        {/* Section 1: Introduction */}
        {shouldShow('sec1') && (
          <section id="sec1" className="space-y-4">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">1. Introduction</h2>
            
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.1 Purpose</h3>
              <p className="text-slate-300">{srs.section1_introduction?.purpose || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.2 Document Conventions</h3>
              <p className="text-slate-300">{srs.section1_introduction?.documentConventions || 'Requirements are uniquely tagged using FR-XXX and NFR-XXX conventions.'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.3 Intended Audience and Reading Suggestions</h3>
              <p className="text-slate-300">{srs.section1_introduction?.intendedAudience || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.4 Project Scope</h3>
              <p className="text-slate-300">{srs.section1_introduction?.projectScope || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">1.5 References</h3>
              <ul className="list-disc list-inside text-slate-400 space-y-1">
                {(srs.section1_introduction?.references || []).map((ref, i) => (
                  <li key={i}>{ref}</li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* Section 2: Overall Description */}
        {shouldShow('sec2') && (
          <section id="sec2" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">2. Overall Description</h2>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.1 Product Perspective</h3>
              <p className="text-slate-300">{srs.section2_overallDescription?.productPerspective || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.2 Product Features</h3>
              <p className="text-slate-300">{srs.section2_overallDescription?.productFeatures || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.3 User Classes and Characteristics</h3>
              <p className="text-slate-300">{srs.section2_overallDescription?.userClassesAndCharacteristics || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.4 Operating Environment</h3>
              <p className="text-slate-300">{srs.section2_overallDescription?.operatingEnvironment || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.5 Design and Implementation Constraints</h3>
              <p className="text-slate-300">{srs.section2_overallDescription?.designAndImplementationConstraints || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.6 User Documentation</h3>
              <p className="text-slate-300">{srs.section2_overallDescription?.userDocumentation || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">2.7 Assumptions and Dependencies</h3>
              <p className="text-slate-300">{srs.section2_overallDescription?.assumptionsAndDependencies || 'TBD — Needs Clarification'}</p>
            </div>
          </section>
        )}

        {/* Section 3: System Features */}
        {shouldShow('sec3') && (
          <section id="sec3" className="space-y-6 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">3. System Features</h2>

            {(srs.section3_systemFeatures || []).map((feat, idx) => (
              <div key={idx} className="bg-slate-950/40 p-5 rounded-lg border border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-emerald-400">
                  {feat.featureId || `3.${idx + 1}`} {feat.featureName}
                </h3>

                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {feat.featureId || `3.${idx + 1}`}.1 Description and Priority
                  </h4>
                  <p className="text-slate-300 text-xs">{feat.descriptionAndPriority}</p>
                </div>

                <div className="space-y-1">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {feat.featureId || `3.${idx + 1}`}.2 Stimulus/Response Sequences
                  </h4>
                  <ul className="list-disc list-inside text-xs text-slate-300 space-y-1">
                    {(feat.stimulusResponseSequences || []).map((seq, sIdx) => (
                      <li key={sIdx}>{seq}</li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {feat.featureId || `3.${idx + 1}`}.3 Functional Requirements
                  </h4>
                  <div className="space-y-2">
                    {(feat.functionalRequirements || []).map((fr, frIdx) => (
                      <div key={frIdx} className="p-3 bg-slate-900/80 rounded border border-slate-800/80">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-xs text-emerald-400">{fr.requirementId}</span>
                          <span className="font-medium text-xs text-white">{fr.title}</span>
                        </div>
                        <p className="text-xs text-slate-400">{fr.statement}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Section 4: External Interfaces */}
        {shouldShow('sec4') && (
          <section id="sec4" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">4. External Interface Requirements</h2>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">4.1 User Interfaces</h3>
              <p className="text-slate-300">{srs.section4_externalInterfaceRequirements?.userInterfaces || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">4.2 Hardware Interfaces</h3>
              <p className="text-slate-300">{srs.section4_externalInterfaceRequirements?.hardwareInterfaces || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">4.3 Software Interfaces</h3>
              <p className="text-slate-300">{srs.section4_externalInterfaceRequirements?.softwareInterfaces || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">4.4 Communications Interfaces</h3>
              <p className="text-slate-300">{srs.section4_externalInterfaceRequirements?.communicationsInterfaces || 'TBD — Needs Clarification'}</p>
            </div>
          </section>
        )}

        {/* Section 5: Other Nonfunctional Requirements */}
        {shouldShow('sec5') && (
          <section id="sec5" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">5. Other Nonfunctional Requirements</h2>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">5.1 Performance Requirements</h3>
              <p className="text-slate-300">{srs.section5_otherNonfunctionalRequirements?.performanceRequirements || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">5.2 Safety Requirements</h3>
              <p className="text-slate-300">{srs.section5_otherNonfunctionalRequirements?.safetyRequirements || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">5.3 Security Requirements</h3>
              <p className="text-slate-300">{srs.section5_otherNonfunctionalRequirements?.securityRequirements || 'TBD — Needs Clarification'}</p>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-emerald-400">5.4 Software Quality Attributes</h3>
              <p className="text-slate-300">{srs.section5_otherNonfunctionalRequirements?.softwareQualityAttributes || 'TBD — Needs Clarification'}</p>
            </div>
          </section>
        )}

        {/* Section 6: Other Requirements */}
        {shouldShow('sec6') && (
          <section id="sec6" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">6. Other Requirements</h2>
            <p className="text-slate-300">{srs.section6_otherRequirements?.content || 'No additional requirements identified.'}</p>
          </section>
        )}

        {/* Appendix A: Glossary */}
        {shouldShow('appA') && (
          <section id="appA" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">Appendix A: Glossary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(srs.appendixA_glossary || []).map((term, tIdx) => (
                <div key={tIdx} className="p-3 bg-slate-950/40 rounded border border-slate-800 text-xs">
                  <span className="font-bold text-emerald-400 block mb-0.5">{term.term}</span>
                  <span className="text-slate-300">{term.definition}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Appendix B: Analysis Models */}
        {shouldShow('appB') && (
          <section id="appB" className="space-y-4 pt-6 border-t border-slate-800">
            <h2 className="text-xl font-bold text-white border-b border-slate-800 pb-2">Appendix B: Analysis Models</h2>
            <p className="text-slate-300 text-xs">{srs.appendixB_analysisModels?.description || 'Data flow and entity behavioral models.'}</p>
            <div className="flex gap-2">
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
                {srs.appendixC_issuesList.map((iss, iIdx) => (
                  <div key={iIdx} className="p-3 bg-amber-500/5 border border-amber-500/20 rounded text-xs flex justify-between items-center">
                    <div>
                      <span className="font-mono font-bold text-amber-400 mr-2">[{iss.issueId}]</span>
                      <span className="text-slate-200">{iss.description}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-semibold">{iss.status || 'OPEN'}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
