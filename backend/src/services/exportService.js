const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType } = require('docx');
const PDFDocument = require('pdfkit');

class ExportService {
  /**
   * Generate DOCX Buffer for an SRS Document adhering strictly to template
   */
  async generateDOCX(srsDoc) {
    const docChildren = [];

    // Title & Metadata
    docChildren.push(
      new Paragraph({
        text: srsDoc.metadata?.title || "Software Requirements Specification",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "Version: ", bold: true }),
          new TextRun(srsDoc.currentVersion || "1.0"),
          new TextRun({ text: "\nPrepared by: ", bold: true }),
          new TextRun(srsDoc.metadata?.preparedBy || "Requirements Engineering Team"),
          new TextRun({ text: "\nOrganization: ", bold: true }),
          new TextRun(srsDoc.metadata?.organization || "IntelliSDLC AI Platform"),
          new TextRun({ text: "\nDate: ", bold: true }),
          new TextRun(srsDoc.metadata?.date || new Date().toISOString().split('T')[0])
        ],
        spacing: { after: 400 }
      }),
      new Paragraph({
        text: "Table of Contents",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun("1. Introduction\n2. Overall Description\n3. System Features\n4. External Interface Requirements\n5. Other Nonfunctional Requirements\n6. Other Requirements\nAppendix A: Glossary\nAppendix B: Analysis Models\nAppendix C: Issues List")
        ],
        spacing: { after: 400 }
      }),
      new Paragraph({
        text: "Revision History",
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );

    // Revision History Table
    const revRows = [
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Name", bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Reason For Changes", bold: true })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Version", bold: true })] })] })
        ]
      })
    ];

    (srsDoc.revisionHistory || []).forEach(rev => {
      revRows.push(
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph(rev.author || "Reviewer")] }),
            new TableCell({ children: [new Paragraph(rev.date || "")] }),
            new TableCell({ children: [new Paragraph(rev.reasonForChanges || "")] }),
            new TableCell({ children: [new Paragraph(rev.version || "")] })
          ]
        })
      );
    });

    docChildren.push(
      new Table({
        rows: revRows,
        width: { size: 100, type: WidthType.PERCENTAGE }
      }),
      new Paragraph({ text: "", spacing: { after: 300 } })
    );

    // Helper for headings
    const addSectionHeading = (title, level = HeadingLevel.HEADING_1) => {
      docChildren.push(
        new Paragraph({
          text: title,
          heading: level,
          spacing: { before: 240, after: 120 }
        })
      );
    };

    const asText = (text) => Array.isArray(text) ? text.filter(Boolean).join(' ') : (text || "TBD — Needs Clarification");
    const addParagraph = (text) => {
      docChildren.push(
        new Paragraph({
          text: asText(text),
          spacing: { after: 140 }
        })
      );
    };

    // 1. Introduction
    addSectionHeading("1. Introduction");
    addSectionHeading("1.1 Purpose", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section1_introduction?.purpose);
    addSectionHeading("1.2 Document Conventions", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section1_introduction?.documentConventions);
    addSectionHeading("1.3 Intended Audience and Reading Suggestions", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section1_introduction?.intendedAudience);
    addSectionHeading("1.4 Project Scope", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section1_introduction?.projectScope);
    addSectionHeading("1.5 References", HeadingLevel.HEADING_2);
    (srsDoc.section1_introduction?.references || []).forEach(ref => addParagraph(`• ${ref}`));

    // 2. Overall Description
    addSectionHeading("2. Overall Description");
    addSectionHeading("2.1 Product Perspective", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section2_overallDescription?.productPerspective);
    addSectionHeading("2.2 Product Features", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section2_overallDescription?.productFeatures);
    addSectionHeading("2.3 User Classes and Characteristics", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section2_overallDescription?.userClassesAndCharacteristics);
    addSectionHeading("2.4 Operating Environment", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section2_overallDescription?.operatingEnvironment);
    addSectionHeading("2.5 Design and Implementation Constraints", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section2_overallDescription?.designAndImplementationConstraints);
    addSectionHeading("2.6 User Documentation", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section2_overallDescription?.userDocumentation);
    addSectionHeading("2.7 Assumptions and Dependencies", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section2_overallDescription?.assumptionsAndDependencies);

    // 3. System Features
    addSectionHeading("3. System Features");
    (srsDoc.section3_systemFeatures || []).forEach((feat, idx) => {
      addSectionHeading(`${feat.featureId || `3.${idx + 1}`} ${feat.featureName}`, HeadingLevel.HEADING_2);
      addSectionHeading(`${feat.featureId || `3.${idx + 1}`}.1 Description and Priority`, HeadingLevel.HEADING_3);
      addParagraph(feat.descriptionAndPriority);
      
      addSectionHeading(`${feat.featureId || `3.${idx + 1}`}.2 Stimulus/Response Sequences`, HeadingLevel.HEADING_3);
      (feat.stimulusResponseSequences || []).forEach(seq => addParagraph(`• ${seq}`));

      addSectionHeading(`${feat.featureId || `3.${idx + 1}`}.3 Functional Requirements`, HeadingLevel.HEADING_3);
      (feat.functionalRequirements || []).forEach(fr => {
        addParagraph(`${fr.requirementId}: ${fr.title} — ${fr.statement}`);
      });
    });

    // 4. External Interface Requirements
    addSectionHeading("4. External Interface Requirements");
    addSectionHeading("4.1 User Interfaces", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section4_externalInterfaceRequirements?.userInterfaces);
    addSectionHeading("4.2 Hardware Interfaces", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section4_externalInterfaceRequirements?.hardwareInterfaces);
    addSectionHeading("4.3 Software Interfaces", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section4_externalInterfaceRequirements?.softwareInterfaces);
    addSectionHeading("4.4 Communications Interfaces", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section4_externalInterfaceRequirements?.communicationsInterfaces);

    // 5. Other Nonfunctional Requirements
    addSectionHeading("5. Other Nonfunctional Requirements");
    addSectionHeading("5.1 Performance Requirements", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section5_otherNonfunctionalRequirements?.performanceRequirements);
    addSectionHeading("5.2 Safety Requirements", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section5_otherNonfunctionalRequirements?.safetyRequirements);
    addSectionHeading("5.3 Security Requirements", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section5_otherNonfunctionalRequirements?.securityRequirements);
    addSectionHeading("5.4 Software Quality Attributes", HeadingLevel.HEADING_2);
    addParagraph(srsDoc.section5_otherNonfunctionalRequirements?.softwareQualityAttributes);

    // 6. Other Requirements
    addSectionHeading("6. Other Requirements");
    addParagraph(srsDoc.section6_otherRequirements?.content);

    // Appendix A
    addSectionHeading("Appendix A: Glossary");
    (srsDoc.appendixA_glossary || []).forEach(g => {
      addParagraph(`${g.term}: ${g.definition}`);
    });

    // Appendix B
    addSectionHeading("Appendix B: Analysis Models");
    addParagraph(srsDoc.appendixB_analysisModels?.description);

    // Appendix C
    addSectionHeading("Appendix C: Issues List");
    if (!srsDoc.appendixC_issuesList || srsDoc.appendixC_issuesList.length === 0) {
      addParagraph("No unresolved issues or conflicts remaining.");
    } else {
      srsDoc.appendixC_issuesList.forEach(iss => {
        addParagraph(`[${iss.issueId}] ${iss.description} (Related: ${iss.relatedRequirement || 'General'}, Status: ${iss.status || 'OPEN'})`);
      });
    }

    const doc = new Document({
      sections: [{
        properties: {},
        children: docChildren
      }]
    });

    return await Packer.toBuffer(doc);
  }

  /**
   * Generate PDF Buffer for an SRS Document adhering strictly to template
   */
  async generatePDF(srsDoc) {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      doc.on('error', reject);

      // Title & Header
      doc.fontSize(22).font('Helvetica-Bold').text(srsDoc.metadata?.title || 'Software Requirements Specification', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica').text(`Version: ${srsDoc.currentVersion || '1.0'} | Date: ${srsDoc.metadata?.date || new Date().toISOString().split('T')[0]}`, { align: 'center' });
      doc.text(`Prepared by: ${srsDoc.metadata?.preparedBy || 'Requirements Engineering Team'} | ${srsDoc.metadata?.organization || 'IntelliSDLC AI Platform'}`, { align: 'center' });
      doc.moveDown(1.5);

      // Helper function for rendering sections
      const renderHeading = (text, size = 16) => {
        doc.moveDown(0.8);
        doc.fontSize(size).font('Helvetica-Bold').fillColor('#1e293b').text(text);
        doc.fillColor('#334155').font('Helvetica').fontSize(10);
        doc.moveDown(0.3);
      };

      const renderBody = (text) => {
        const body = Array.isArray(text) ? text.filter(Boolean).join(' ') : (text || 'TBD — Needs Clarification');
        doc.fontSize(10).font('Helvetica').fillColor('#334155').text(body, { lineGap: 3 });
      };

      // TOC
      renderHeading('Table of Contents', 14);
      renderBody('1. Introduction\n2. Overall Description\n3. System Features\n4. External Interface Requirements\n5. Other Nonfunctional Requirements\n6. Other Requirements\nAppendix A: Glossary | Appendix B: Analysis Models | Appendix C: Issues List');

      // Revision History
      renderHeading('Revision History', 14);
      (srsDoc.revisionHistory || []).forEach(rev => {
        renderBody(`• v${rev.version} (${rev.date}): ${rev.reasonForChanges} - By: ${rev.author}`);
      });

      // Section 1
      renderHeading('1. Introduction', 14);
      renderHeading('1.1 Purpose', 11);
      renderBody(srsDoc.section1_introduction?.purpose);
      renderHeading('1.2 Document Conventions', 11);
      renderBody(srsDoc.section1_introduction?.documentConventions);
      renderHeading('1.3 Intended Audience and Reading Suggestions', 11);
      renderBody(srsDoc.section1_introduction?.intendedAudience);
      renderHeading('1.4 Project Scope', 11);
      renderBody(srsDoc.section1_introduction?.projectScope);
      renderHeading('1.5 References', 11);
      renderBody((srsDoc.section1_introduction?.references || []).join('\n'));

      // Section 2
      renderHeading('2. Overall Description', 14);
      renderHeading('2.1 Product Perspective', 11);
      renderBody(srsDoc.section2_overallDescription?.productPerspective);
      renderHeading('2.2 Product Features', 11);
      renderBody(srsDoc.section2_overallDescription?.productFeatures);
      renderHeading('2.3 User Classes and Characteristics', 11);
      renderBody(srsDoc.section2_overallDescription?.userClassesAndCharacteristics);
      renderHeading('2.4 Operating Environment', 11);
      renderBody(srsDoc.section2_overallDescription?.operatingEnvironment);
      renderHeading('2.5 Design and Implementation Constraints', 11);
      renderBody(srsDoc.section2_overallDescription?.designAndImplementationConstraints);
      renderHeading('2.6 User Documentation', 11);
      renderBody(srsDoc.section2_overallDescription?.userDocumentation);
      renderHeading('2.7 Assumptions and Dependencies', 11);
      renderBody(srsDoc.section2_overallDescription?.assumptionsAndDependencies);

      // Section 3
      renderHeading('3. System Features', 14);
      (srsDoc.section3_systemFeatures || []).forEach(feat => {
        renderHeading(`${feat.featureId} ${feat.featureName}`, 12);
        renderBody(`Description & Priority: ${feat.descriptionAndPriority}`);
        renderBody(`Stimulus/Response Sequences:\n${(feat.stimulusResponseSequences || []).map(s => `  • ${s}`).join('\n')}`);
        renderBody(`Functional Requirements:\n${(feat.functionalRequirements || []).map(fr => `  [${fr.requirementId}] ${fr.title}: ${fr.statement}`).join('\n')}`);
      });

      // Section 4
      renderHeading('4. External Interface Requirements', 14);
      renderHeading('4.1 User Interfaces', 11);
      renderBody(srsDoc.section4_externalInterfaceRequirements?.userInterfaces);
      renderHeading('4.2 Hardware Interfaces', 11);
      renderBody(srsDoc.section4_externalInterfaceRequirements?.hardwareInterfaces);
      renderHeading('4.3 Software Interfaces', 11);
      renderBody(srsDoc.section4_externalInterfaceRequirements?.softwareInterfaces);
      renderHeading('4.4 Communications Interfaces', 11);
      renderBody(srsDoc.section4_externalInterfaceRequirements?.communicationsInterfaces);

      // Section 5
      renderHeading('5. Other Nonfunctional Requirements', 14);
      renderHeading('5.1 Performance Requirements', 11);
      renderBody(srsDoc.section5_otherNonfunctionalRequirements?.performanceRequirements);
      renderHeading('5.2 Safety Requirements', 11);
      renderBody(srsDoc.section5_otherNonfunctionalRequirements?.safetyRequirements);
      renderHeading('5.3 Security Requirements', 11);
      renderBody(srsDoc.section5_otherNonfunctionalRequirements?.securityRequirements);
      renderHeading('5.4 Software Quality Attributes', 11);
      renderBody(srsDoc.section5_otherNonfunctionalRequirements?.softwareQualityAttributes);

      // Section 6
      renderHeading('6. Other Requirements', 14);
      renderBody(srsDoc.section6_otherRequirements?.content);

      // Appendices
      renderHeading('Appendix A: Glossary', 14);
      renderBody((srsDoc.appendixA_glossary || []).map(g => `• ${g.term}: ${g.definition}`).join('\n'));

      renderHeading('Appendix B: Analysis Models', 14);
      renderBody(srsDoc.appendixB_analysisModels?.description);

      renderHeading('Appendix C: Issues List', 14);
      if (!srsDoc.appendixC_issuesList || srsDoc.appendixC_issuesList.length === 0) {
        renderBody('No unresolved issues tracked.');
      } else {
        renderBody(srsDoc.appendixC_issuesList.map(i => `• [${i.issueId}] ${i.description} (${i.status || 'OPEN'})`).join('\n'));
      }

      doc.end();
    });
  }
}

module.exports = new ExportService();
