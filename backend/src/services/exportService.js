const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  AlignmentType,
  Header,
  PageNumber,
  NumberFormat,
  TableOfContents,
  TabStopType
} = require('docx');
const PDFDocument = require('pdfkit');

/* ═══════════════════════════════════════════════════════════════════
   ExportService — DOCX + PDF export laid out EXACTLY like the
   Karl E. Wiegers "Software Requirements Specification" template
   (srs_template.pdf reference):

     • US Letter page, reference margins
     • Cover page: right-aligned Arial bold block + copyright footer
     • Page ii: Table of Contents (dot leaders + REAL page numbers)
                + Revision History table (Name | Date | Reason |
                Version)
     • Body: every major section (1–6, Appendix A/B/C) starts on its
       own page; running header "SRS for <Project>" + "Page N"
     • Section 3 features numbered 3.x → 3.x.1 / 3.x.2 / 3.x.3 with
       REQ-style tagged functional requirements
     • Missing values render as "TBD" (template convention)

   PUBLIC INTERFACE UNCHANGED:
     generateDOCX(srsDoc) -> Promise<Buffer>
     generatePDF(srsDoc)  -> Promise<Buffer>
   Same input schema, same module export — nothing else in the
   backend needs to change.
   ═══════════════════════════════════════════════════════════════════ */

function projectNameFrom(srsDoc) {
  const raw = (srsDoc?.metadata?.title || '').trim();
  if (!raw) return '<Project>';
  const cleaned = raw.replace(/^(software requirements specification|srs)\s*(for)?\s*:?\s*/i, '').trim();
  return cleaned || '<Project>';
}

function asText(value, fallback = 'TBD') {
  const t = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
  return t === undefined || t === null || String(t).trim() === '' ? fallback : String(t);
}

const COPYRIGHT_LINE =
  'Copyright © 2002 by Karl E. Wiegers. Permission is granted to use, modify, and distribute this document.';

class ExportService {
  /**
   * Generate DOCX Buffer for an SRS Document adhering strictly to
   * the Karl E. Wiegers template.
   */
  async generateDOCX(srsDoc) {
    const projectName = projectNameFrom(srsDoc);
    const ARIAL = 'Arial';
    const TIMES = 'Times New Roman';

    // Content width: Letter (12240 twips) - 2 × 1300 twips (65pt) margins
    const CONTENT_W = 9640;
    const PAGE = { width: 12240, height: 15840 }; // US Letter
    const MARGIN = { top: 1980, bottom: 1200, left: 1300, right: 1300, header: 760 };

    const today = srsDoc.metadata?.date || new Date().toISOString().split('T')[0];

    /* ── Running header: "SRS for <Project> …… Page N" ── */
    const runningHeader = () =>
      new Header({
        children: [
          new Paragraph({
            tabStops: [{ type: TabStopType.RIGHT, position: CONTENT_W }],
            children: [
              new TextRun({
                text: `Software Requirements Specification for ${projectName}`,
                bold: true,
                italics: true,
                font: TIMES,
                size: 20 // 10pt
              }),
              new TextRun({ text: '\tPage ', bold: true, italics: true, font: TIMES, size: 20 }),
              new TextRun({ children: [PageNumber.CURRENT], bold: true, italics: true, font: TIMES, size: 20 })
            ]
          })
        ]
      });

    /* ══════════════ SECTION 1 — COVER PAGE (no header) ══════════════ */
    // NOTE: every line is its own Paragraph (TextRun "\n" does NOT
    // create real line breaks in Word — that was scrambling the cover).
    const coverChildren = [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { before: 1000, after: 140 },
        children: [new TextRun({ text: 'Software Requirements Specification', bold: true, font: ARIAL, size: 64 })] // 32pt
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 140 },
        children: [new TextRun({ text: 'for', bold: true, font: ARIAL, size: 40 })] // 20pt
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 1100 },
        children: [new TextRun({ text: projectName, bold: true, font: ARIAL, size: 64 })] // 32pt
      }),
      ...[
        `Version ${srsDoc.currentVersion || '1.0'} approved`,
        `Prepared by ${srsDoc.metadata?.preparedBy || '<author>'}`,
        srsDoc.metadata?.organization || '<organization>',
        today
      ].map(
        (line, i, arr) =>
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { after: i === arr.length - 1 ? 0 : 760 },
            children: [new TextRun({ text: line, bold: true, font: ARIAL, size: 28 })] // 14pt
          })
      ),
      new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { before: 2800 },
        children: [new TextRun({ text: COPYRIGHT_LINE, bold: true, italics: true, font: TIMES, size: 20 })] // 10pt
      })
    ];

    /* ══════════ SECTION 2 — PAGE ii: TOC + REVISION HISTORY ══════════ */
    const border = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
    const REV_COLS = [2180, 1180, 5100, 1180]; // sums to CONTENT_W

    const revCell = (text, colIdx, bold = false) =>
      new TableCell({
        width: { size: REV_COLS[colIdx], type: WidthType.DXA },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: String(text ?? ''), bold, font: TIMES, size: 22 })]
          })
        ]
      });

    const revList = srsDoc.revisionHistory || [];
    const revDataRows = revList.length
      ? revList.map(
          (rev) =>
            new TableRow({
              children: [
                revCell(rev.author || 'Reviewer', 0),
                revCell(rev.date || '', 1),
                revCell(rev.reasonForChanges || '', 2),
                revCell(rev.version ? `v${rev.version}` : '', 3)
              ]
            })
        )
      : [
          new TableRow({
            children: [
              revCell('Initial Baseline', 0),
              revCell(today, 1),
              revCell('Initial SRS draft generation', 2),
              revCell(`v${srsDoc.currentVersion || '1.0'}`, 3)
            ]
          })
        ];

    const frontChildren = [
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        children: [new TextRun({ text: 'Table of Contents' })]
      }),
      // Real Word TOC field → correct page numbers + dot leaders +
      // clickable entries. Auto-refreshed on open via updateFields.
      new TableOfContents('Table of Contents', {
        hyperlink: true,
        headingStyleRange: '1-2'
      }),
      new Paragraph({
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 500 },
        children: [new TextRun({ text: 'Revision History' })]
      }),
      new Table({
        width: { size: CONTENT_W, type: WidthType.DXA },
        columnWidths: REV_COLS,
        borders: {
          top: border,
          bottom: border,
          left: border,
          right: border,
          insideHorizontal: border,
          insideVertical: border
        },
        rows: [
          new TableRow({
            tableHeader: true,
            children: [
              revCell('Name', 0, true),
              revCell('Date', 1, true),
              revCell('Reason For Changes', 2, true),
              revCell('Version', 3, true)
            ]
          }),
          ...revDataRows
        ]
      })
    ];

    /* ═══════════════ SECTION 3 — BODY (Page 1, 2, …) ═══════════════ */
    const bodyChildren = [];

    // Every major section starts on its own page (except the very
    // first, which already starts the new section on a fresh page).
    const H1 = (text, first = false) =>
      bodyChildren.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          pageBreakBefore: !first,
          children: [new TextRun({ text })]
        })
      );
    const H2 = (text) =>
      bodyChildren.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text })] }));
    const H3 = (text) =>
      bodyChildren.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text })] }));

    const P = (value, fallback = 'TBD') =>
      bodyChildren.push(
        new Paragraph({
          spacing: { after: 160 },
          children: [new TextRun({ text: asText(value, fallback), font: TIMES, size: 22 })]
        })
      );

    const BULLET = (value) =>
      bodyChildren.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 80 },
          children: [new TextRun({ text: String(value), font: TIMES, size: 22 })]
        })
      );

    const FR = (fr, idx) =>
      bodyChildren.push(
        new Paragraph({
          spacing: { after: 140 },
          children: [
            new TextRun({ text: `${fr.requirementId || `REQ-${idx + 1}`}: `, bold: true, font: TIMES, size: 22 }),
            new TextRun({
              text: `${fr.title ? `${fr.title} — ` : ''}${fr.statement || ''}`,
              font: TIMES,
              size: 22
            })
          ]
        })
      );

    const listOrTbd = (items, render) => {
      if (items && items.length > 0) items.forEach(render);
      else P(undefined);
    };

    // 1. Introduction
    H1('1. Introduction', true);
    H2('1.1 Purpose');
    P(srsDoc.section1_introduction?.purpose);
    H2('1.2 Document Conventions');
    P(
      srsDoc.section1_introduction?.documentConventions,
      'Requirements are uniquely tagged using FR-XXX and NFR-XXX conventions.'
    );
    H2('1.3 Intended Audience and Reading Suggestions');
    P(srsDoc.section1_introduction?.intendedAudience);
    H2('1.4 Project Scope');
    P(srsDoc.section1_introduction?.projectScope);
    H2('1.5 References');
    listOrTbd(srsDoc.section1_introduction?.references, (ref) => BULLET(ref));

    // 2. Overall Description
    H1('2. Overall Description');
    H2('2.1 Product Perspective');
    P(srsDoc.section2_overallDescription?.productPerspective);
    H2('2.2 Product Features');
    P(srsDoc.section2_overallDescription?.productFeatures);
    H2('2.3 User Classes and Characteristics');
    P(srsDoc.section2_overallDescription?.userClassesAndCharacteristics);
    H2('2.4 Operating Environment');
    P(srsDoc.section2_overallDescription?.operatingEnvironment);
    H2('2.5 Design and Implementation Constraints');
    P(srsDoc.section2_overallDescription?.designAndImplementationConstraints);
    H2('2.6 User Documentation');
    P(srsDoc.section2_overallDescription?.userDocumentation);
    H2('2.7 Assumptions and Dependencies');
    P(srsDoc.section2_overallDescription?.assumptionsAndDependencies);

    // 3. System Features
    H1('3. System Features');
    const features = srsDoc.section3_systemFeatures || [];
    if (features.length === 0) P(undefined);
    features.forEach((feat, idx) => {
      const fid = feat.featureId || `3.${idx + 1}`;
      H2(`${fid} ${feat.featureName || `System Feature ${idx + 1}`}`);
      H3(`${fid}.1 Description and Priority`);
      P(feat.descriptionAndPriority);
      H3(`${fid}.2 Stimulus/Response Sequences`);
      listOrTbd(feat.stimulusResponseSequences, (seq) => BULLET(seq));
      H3(`${fid}.3 Functional Requirements`);
      listOrTbd(feat.functionalRequirements, (fr, i) => FR(fr, i));
    });

    // 4. External Interface Requirements
    H1('4. External Interface Requirements');
    H2('4.1 User Interfaces');
    P(srsDoc.section4_externalInterfaceRequirements?.userInterfaces);
    H2('4.2 Hardware Interfaces');
    P(srsDoc.section4_externalInterfaceRequirements?.hardwareInterfaces);
    H2('4.3 Software Interfaces');
    P(srsDoc.section4_externalInterfaceRequirements?.softwareInterfaces);
    H2('4.4 Communications Interfaces');
    P(srsDoc.section4_externalInterfaceRequirements?.communicationsInterfaces);

    // 5. Other Nonfunctional Requirements
    H1('5. Other Nonfunctional Requirements');
    H2('5.1 Performance Requirements');
    P(srsDoc.section5_otherNonfunctionalRequirements?.performanceRequirements);
    H2('5.2 Safety Requirements');
    P(srsDoc.section5_otherNonfunctionalRequirements?.safetyRequirements);
    H2('5.3 Security Requirements');
    P(srsDoc.section5_otherNonfunctionalRequirements?.securityRequirements);
    H2('5.4 Software Quality Attributes');
    P(srsDoc.section5_otherNonfunctionalRequirements?.softwareQualityAttributes);

    // 6. Other Requirements
    H1('6. Other Requirements');
    P(srsDoc.section6_otherRequirements?.content, 'No additional requirements identified.');

    // Appendix A: Glossary
    H1('Appendix A: Glossary');
    listOrTbd(srsDoc.appendixA_glossary, (g) => BULLET(`${g.term}: ${g.definition}`));

    // Appendix B: Analysis Models
    H1('Appendix B: Analysis Models');
    P(
      srsDoc.appendixB_analysisModels?.description,
      'Optionally, include any pertinent analysis models, such as data flow diagrams, class diagrams, state-transition diagrams, or entity-relationship diagrams.'
    );

    // Appendix C: Issues List
    H1('Appendix C: Issues List');
    const issues = srsDoc.appendixC_issuesList || [];
    if (issues.length === 0) {
      P('All requirements validated. No pending TBDs or conflicts.');
    } else {
      issues.forEach((iss) =>
        P(`[${iss.issueId}] ${iss.description} (Related: ${iss.relatedRequirement || 'General'}, Status: ${iss.status || 'OPEN'})`)
      );
    }

    /* ════════════════════════ ASSEMBLE DOCUMENT ════════════════════════ */
    const doc = new Document({
      creator: srsDoc.metadata?.organization || 'IntelliSDLC AI',
      title: `Software Requirements Specification for ${projectName}`,
      description: 'Software Requirements Specification structured after the Karl E. Wiegers template',
      features: { updateFields: true }, // Word refreshes the TOC page numbers on open
      styles: {
        default: {
          document: { run: { font: TIMES, size: 22 } }, // Times New Roman 11pt
          heading1: {
            run: { font: TIMES, size: 36, bold: true, color: '000000' }, // 18pt
            paragraph: { spacing: { before: 0, after: 220 } }
          },
          heading2: {
            run: { font: TIMES, size: 28, bold: true, color: '000000' }, // 14pt
            paragraph: { spacing: { before: 280, after: 140 } }
          },
          heading3: {
            run: { font: TIMES, size: 24, bold: true, color: '000000' }, // 12pt
            paragraph: { spacing: { before: 220, after: 120 } }
          }
        }
      },
      sections: [
        {
          // Cover — no running header
          properties: {
            page: { size: PAGE, margin: { top: 1440, bottom: 1440, left: 1300, right: 1300 } }
          },
          children: coverChildren
        },
        {
          // Front matter — "Page ii" (lower roman, starts at 2)
          properties: {
            page: { size: PAGE, margin: MARGIN, pageNumbers: { start: 2, formatType: NumberFormat.LOWER_ROMAN } }
          },
          headers: { default: runningHeader() },
          children: frontChildren
        },
        {
          // Body — "Page 1, 2, …" (decimal, restarts at 1)
          properties: {
            page: { size: PAGE, margin: MARGIN, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } }
          },
          headers: { default: runningHeader() },
          children: bodyChildren
        }
      ]
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Generate PDF Buffer for an SRS Document adhering strictly to the
   * Karl E. Wiegers standard template.
   */
  async generatePDF(srsDoc) {
    return new Promise((resolve, reject) => {
      try {
        const projectName = projectNameFrom(srsDoc);

        // US Letter, same geometry as the reference template
        const PAGE_W = 612;
        const PAGE_H = 792;
        const M = { left: 65, right: 65, top: 99, bottom: 62 };
        const CW = PAGE_W - M.left - M.right; // 482
        const RIGHT_X = PAGE_W - M.right; // 547
        const BLACK = '#000000';
        const BODY_COLOR = '#111111';

        const doc = new PDFDocument({
          size: 'LETTER',
          bufferPages: true,
          margins: { top: M.top, bottom: M.bottom, left: M.left, right: M.right }
        });

        const buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        // Truncate text (at the currently selected font/size) so it
        // never overflows its column.
        const ellipsize = (text, maxW) => {
          if (doc.widthOfString(text) <= maxW) return text;
          let t = text;
          while (t.length > 1 && doc.widthOfString(`${t}…`) > maxW) t = t.slice(0, -1);
          return `${t}…`;
        };

        /* ─────────────────────────────────────────────
           1. COVER PAGE (right-aligned, like the reference)
           ───────────────────────────────────────────── */
        doc.fillColor(BLACK);
        doc.font('Helvetica-Bold').fontSize(32);
        doc.text('Software Requirements', M.left, 112, { width: CW, align: 'right', lineBreak: false });
        doc.text('Specification', M.left, 158, { width: CW, align: 'right', lineBreak: false });

        doc.font('Helvetica-Bold').fontSize(20);
        doc.text('for', M.left, 232, { width: CW, align: 'right', lineBreak: false });

        doc.font('Helvetica-Bold').fontSize(32);
        doc.text(projectName, M.left, 282, { width: CW, align: 'right' }); // may wrap → doc.y advances

        let y = Math.max(doc.y + 60, 368);
        const metaLines = [
          `Version ${srsDoc.currentVersion || '1.0'} approved`,
          `Prepared by ${srsDoc.metadata?.preparedBy || '<author>'}`,
          srsDoc.metadata?.organization || '<organization>',
          srsDoc.metadata?.date || new Date().toISOString().split('T')[0]
        ];
        metaLines.forEach((line) => {
          doc.font('Helvetica-Bold').fontSize(14);
          doc.text(line, M.left, y, { width: CW, align: 'right', lineBreak: false });
          y += 64;
        });

        doc.font('Times-BoldItalic').fontSize(10);
        doc.text(COPYRIGHT_LINE, M.left + 24, 742, { width: CW - 24, align: 'left' });

        /* ─────────────────────────────────────────────
           2. Reserve page ii for TOC + Revision History.
              It is FILLED AFTER the body is rendered, so the TOC can
              show REAL page numbers (two-pass).
           ───────────────────────────────────────────── */
        doc.addPage(); // page index 1

        /* ─────────────────────────────────────────────
           3. BODY — every major section starts a new page
           ───────────────────────────────────────────── */
        const sectionPages = {}; // key → body page number (1-based)
        const bodyPageLabel = () => doc.bufferedPageRange().count - 2;

        const startSection = (key) => {
          doc.addPage();
          doc.y = M.top;
          sectionPages[key] = bodyPageLabel();
        };

        const ensureSpace = (needed) => {
          if (doc.y + needed > PAGE_H - M.bottom) {
            doc.addPage();
            doc.y = M.top;
          }
        };

        const h1 = (title) => {
          doc.font('Times-Bold').fontSize(18).fillColor(BLACK);
          doc.text(title, M.left, doc.y, { width: CW, align: 'left' });
          doc.y += 10;
        };
        const h2 = (title) => {
          ensureSpace(85);
          doc.y += 14;
          doc.font('Times-Bold').fontSize(14).fillColor(BLACK);
          doc.text(title, M.left, doc.y, { width: CW, align: 'left' });
          doc.y += 6;
        };
        const h3 = (title) => {
          ensureSpace(75);
          doc.y += 10;
          doc.font('Times-Bold').fontSize(12).fillColor(BLACK);
          doc.text(title, M.left, doc.y, { width: CW, align: 'left' });
          doc.y += 4;
        };
        const body = (value, fallback = 'TBD') => {
          doc.font('Times-Roman').fontSize(11).fillColor(BODY_COLOR);
          doc.text(asText(value, fallback), M.left, doc.y, { width: CW, align: 'left', lineGap: 2.4 });
          doc.y += 7;
        };
        const bullet = (value) => {
          doc.font('Times-Roman').fontSize(11).fillColor(BODY_COLOR);
          doc.text(`•  ${value}`, M.left + 16, doc.y, { width: CW - 16, align: 'left', lineGap: 2.4 });
          doc.y += 5;
        };
        const frItem = (fr, idx) => {
          const id = fr.requirementId || `REQ-${idx + 1}`;
          const rest = `${fr.title ? `${fr.title} — ` : ''}${fr.statement || ''}`;
          doc.font('Times-Bold').fontSize(11).fillColor(BLACK);
          doc.text(`${id}: `, M.left, doc.y, { width: CW, align: 'left', lineGap: 2.4, continued: true });
          doc.font('Times-Roman').fillColor(BODY_COLOR);
          doc.text(rest, { width: CW, align: 'left', lineGap: 2.4 });
          doc.y += 7;
        };
        const listOrTbd = (items, render) => {
          if (items && items.length > 0) items.forEach(render);
          else body(undefined);
        };

        // 1. Introduction
        startSection('sec1');
        h1('1. Introduction');
        h2('1.1 Purpose');
        body(srsDoc.section1_introduction?.purpose);
        h2('1.2 Document Conventions');
        body(
          srsDoc.section1_introduction?.documentConventions,
          'Requirements are uniquely tagged using FR-XXX and NFR-XXX conventions.'
        );
        h2('1.3 Intended Audience and Reading Suggestions');
        body(srsDoc.section1_introduction?.intendedAudience);
        h2('1.4 Project Scope');
        body(srsDoc.section1_introduction?.projectScope);
        h2('1.5 References');
        listOrTbd(srsDoc.section1_introduction?.references, (ref) => bullet(ref));

        // 2. Overall Description
        startSection('sec2');
        h1('2. Overall Description');
        h2('2.1 Product Perspective');
        body(srsDoc.section2_overallDescription?.productPerspective);
        h2('2.2 Product Features');
        body(srsDoc.section2_overallDescription?.productFeatures);
        h2('2.3 User Classes and Characteristics');
        body(srsDoc.section2_overallDescription?.userClassesAndCharacteristics);
        h2('2.4 Operating Environment');
        body(srsDoc.section2_overallDescription?.operatingEnvironment);
        h2('2.5 Design and Implementation Constraints');
        body(srsDoc.section2_overallDescription?.designAndImplementationConstraints);
        h2('2.6 User Documentation');
        body(srsDoc.section2_overallDescription?.userDocumentation);
        h2('2.7 Assumptions and Dependencies');
        body(srsDoc.section2_overallDescription?.assumptionsAndDependencies);

        // 3. System Features
        startSection('sec3');
        h1('3. System Features');
        const features = srsDoc.section3_systemFeatures || [];
        if (features.length === 0) body(undefined);
        features.forEach((feat, idx) => {
          const fid = feat.featureId || `3.${idx + 1}`;
          h2(`${fid} ${feat.featureName || `System Feature ${idx + 1}`}`);
          h3(`${fid}.1 Description and Priority`);
          body(feat.descriptionAndPriority);
          h3(`${fid}.2 Stimulus/Response Sequences`);
          listOrTbd(feat.stimulusResponseSequences, (seq) => bullet(seq));
          h3(`${fid}.3 Functional Requirements`);
          listOrTbd(feat.functionalRequirements, (fr, i) => frItem(fr, i));
        });

        // 4. External Interface Requirements
        startSection('sec4');
        h1('4. External Interface Requirements');
        h2('4.1 User Interfaces');
        body(srsDoc.section4_externalInterfaceRequirements?.userInterfaces);
        h2('4.2 Hardware Interfaces');
        body(srsDoc.section4_externalInterfaceRequirements?.hardwareInterfaces);
        h2('4.3 Software Interfaces');
        body(srsDoc.section4_externalInterfaceRequirements?.softwareInterfaces);
        h2('4.4 Communications Interfaces');
        body(srsDoc.section4_externalInterfaceRequirements?.communicationsInterfaces);

        // 5. Other Nonfunctional Requirements
        startSection('sec5');
        h1('5. Other Nonfunctional Requirements');
        h2('5.1 Performance Requirements');
        body(srsDoc.section5_otherNonfunctionalRequirements?.performanceRequirements);
        h2('5.2 Safety Requirements');
        body(srsDoc.section5_otherNonfunctionalRequirements?.safetyRequirements);
        h2('5.3 Security Requirements');
        body(srsDoc.section5_otherNonfunctionalRequirements?.securityRequirements);
        h2('5.4 Software Quality Attributes');
        body(srsDoc.section5_otherNonfunctionalRequirements?.softwareQualityAttributes);

        // 6. Other Requirements
        startSection('sec6');
        h1('6. Other Requirements');
        body(srsDoc.section6_otherRequirements?.content, 'No additional requirements identified.');

        // Appendix A: Glossary
        startSection('appA');
        h1('Appendix A: Glossary');
        listOrTbd(srsDoc.appendixA_glossary, (g) => bullet(`${g.term}: ${g.definition}`));

        // Appendix B: Analysis Models
        startSection('appB');
        h1('Appendix B: Analysis Models');
        body(
          srsDoc.appendixB_analysisModels?.description,
          'Optionally, include any pertinent analysis models, such as data flow diagrams, class diagrams, state-transition diagrams, or entity-relationship diagrams.'
        );

        // Appendix C: Issues List
        startSection('appC');
        h1('Appendix C: Issues List');
        const issues = srsDoc.appendixC_issuesList || [];
        if (issues.length === 0) {
          body('All requirements validated. No pending TBDs or conflicts.');
        } else {
          issues.forEach((iss) =>
            body(`[${iss.issueId}] ${iss.description} (Related: ${iss.relatedRequirement || 'General'}, Status: ${iss.status || 'OPEN'})`)
          );
        }

        /* ─────────────────────────────────────────────
           4. PAGE ii — Table of Contents (with the REAL
          page numbers recorded above) + Revision History
           ───────────────────────────────────────────── */
        doc.switchToPage(1);

        doc.font('Times-Bold').fontSize(18).fillColor(BLACK);
        doc.text('Table of Contents', M.left, 81, { lineBreak: false });

        const featureRows = features.length
          ? features.map((f, i) => ({
              label: `${f.featureId || `3.${i + 1}`} ${f.featureName || `System Feature ${i + 1}`}`,
              level: 1,
              key: 'sec3'
            }))
          : [
              { label: '3.1 System Feature 1', level: 1, key: 'sec3' },
              { label: '3.2 System Feature 2 (and so on)', level: 1, key: 'sec3' }
            ];

        const tocEntries = [
          { label: 'Table of Contents', level: 0, page: 'ii' },
          { label: 'Revision History', level: 0, page: 'ii' },
          { label: '1. Introduction', level: 0, key: 'sec1' },
          { label: '1.1 Purpose', level: 1, key: 'sec1' },
          { label: '1.2 Document Conventions', level: 1, key: 'sec1' },
          { label: '1.3 Intended Audience and Reading Suggestions', level: 1, key: 'sec1' },
          { label: '1.4 Project Scope', level: 1, key: 'sec1' },
          { label: '1.5 References', level: 1, key: 'sec1' },
          { label: '2. Overall Description', level: 0, key: 'sec2' },
          { label: '2.1 Product Perspective', level: 1, key: 'sec2' },
          { label: '2.2 Product Features', level: 1, key: 'sec2' },
          { label: '2.3 User Classes and Characteristics', level: 1, key: 'sec2' },
          { label: '2.4 Operating Environment', level: 1, key: 'sec2' },
          { label: '2.5 Design and Implementation Constraints', level: 1, key: 'sec2' },
          { label: '2.6 User Documentation', level: 1, key: 'sec2' },
          { label: '2.7 Assumptions and Dependencies', level: 1, key: 'sec2' },
          { label: '3. System Features', level: 0, key: 'sec3' },
          ...featureRows,
          { label: '4. External Interface Requirements', level: 0, key: 'sec4' },
          { label: '4.1 User Interfaces', level: 1, key: 'sec4' },
          { label: '4.2 Hardware Interfaces', level: 1, key: 'sec4' },
          { label: '4.3 Software Interfaces', level: 1, key: 'sec4' },
          { label: '4.4 Communications Interfaces', level: 1, key: 'sec4' },
          { label: '5. Other Nonfunctional Requirements', level: 0, key: 'sec5' },
          { label: '5.1 Performance Requirements', level: 1, key: 'sec5' },
          { label: '5.2 Safety Requirements', level: 1, key: 'sec5' },
          { label: '5.3 Security Requirements', level: 1, key: 'sec5' },
          { label: '5.4 Software Quality Attributes', level: 1, key: 'sec5' },
          { label: '6. Other Requirements', level: 0, key: 'sec6' },
          { label: 'Appendix A: Glossary', level: 0, key: 'appA' },
          { label: 'Appendix B: Analysis Models', level: 0, key: 'appB' },
          { label: 'Appendix C: Issues List', level: 0, key: 'appC' }
        ];

        let ty = 113;
        tocEntries.forEach((entry, i) => {
          const next = tocEntries[i + 1];
          const x = M.left + (entry.level === 1 ? 14 : 0);
          const font = entry.level === 0 ? 'Times-Bold' : 'Times-Roman';
          const size = entry.level === 0 ? 12 : 11;

          doc.font(font).fontSize(size).fillColor(BLACK);
          const label = ellipsize(entry.label, CW - 60);
          const pageStr = String(entry.key ? sectionPages[entry.key] ?? '' : entry.page);

          doc.text(label, x, ty, { lineBreak: false });

          const labelW = doc.widthOfString(label);
          const pageW = doc.widthOfString(pageStr);
          const dotsStart = x + labelW + 5;
          const dotsEnd = RIGHT_X - pageW - 6;
          if (dotsEnd > dotsStart) {
            const dotW = doc.widthOfString('.');
            const nDots = Math.floor((dotsEnd - dotsStart) / dotW);
            if (nDots > 0) {
              doc.font('Times-Roman').fontSize(11).fillColor('#555555');
              doc.text('.'.repeat(nDots), dotsStart, ty + 0.5, { lineBreak: false });
            }
          }

          doc.font(font).fontSize(size).fillColor(BLACK);
          doc.text(pageStr, RIGHT_X - pageW, ty, { lineBreak: false });

          ty += !next || next.level === 0 ? 13 : entry.level === 0 ? 12 : 11;
        });

        /* ── Revision History table (Name | Date | Reason | Version) ── */
        ty += 20;
        doc.font('Times-Bold').fontSize(18).fillColor(BLACK);
        doc.text('Revision History', M.left, ty, { lineBreak: false });
        ty += 30;

        const revList = srsDoc.revisionHistory || [];
        const revRows = revList.length
          ? revList.map((r) => [r.author || 'Reviewer', r.date || '', r.reasonForChanges || '', r.version ? `v${r.version}` : ''])
          : [
              [
                'Initial Baseline',
                srsDoc.metadata?.date || new Date().toISOString().split('T')[0],
                'Initial SRS generation',
                `v${srsDoc.currentVersion || '1.0'}`
              ]
            ];

        const colWs = [112, 66, 246, 58]; // = 482
        doc.lineWidth(0.75).strokeColor(BLACK);

        const drawRevRow = (cells, bold) => {
          // Row height adapts to wrapped cell text → nothing overflows
          doc.font('Times-Roman').fontSize(11);
          let rh = 20;
          cells.forEach((c, ci) => {
            rh = Math.max(rh, doc.heightOfString(String(c || ''), { width: colWs[ci] - 10 }) + 10);
          });
          let cx = M.left;
          cells.forEach((c, ci) => {
            doc.rect(cx, ty, colWs[ci], rh).stroke();
            doc.font(bold ? 'Times-Bold' : 'Times-Roman').fontSize(bold ? 12 : 11).fillColor(BLACK);
            doc.text(String(c || ''), cx + 5, ty + 5, { width: colWs[ci] - 10, align: 'left' });
            cx += colWs[ci];
          });
          ty += rh;
        };

        drawRevRow(['Name', 'Date', 'Reason For Changes', 'Version'], true);
        revRows.forEach((r) => drawRevRow(r, false));

        /* ─────────────────────────────────────────────
           5. RUNNING HEADERS on every page except the
          cover: "SRS for <Project>" + "Page ii / 1 / 2 …"
           ───────────────────────────────────────────── */
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
          if (i === 0) continue; // cover has no running header
          doc.switchToPage(i);
          doc.font('Times-BoldItalic').fontSize(10).fillColor(BLACK);
          const headerText = ellipsize(`Software Requirements Specification for ${projectName}`, CW - 130);
          doc.text(headerText, M.left, 38, { lineBreak: false });
          const pageLabel = i === 1 ? 'Page ii' : `Page ${i - 1}`;
          const lw = doc.widthOfString(pageLabel);
          doc.text(pageLabel, RIGHT_X - lw, 38, { lineBreak: false });
        }

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new ExportService();
