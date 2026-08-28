const SRS = require('../models/SRS');
const exportService = require('../services/exportService');

exports.exportPDF = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const srs = await SRS.findOne({ projectId });
    if (!srs) return res.status(404).json({ success: false, message: 'SRS document not found' });

    const pdfBuffer = await exportService.generatePDF(srs);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=SRS_${srs.metadata?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'document'}_v${srs.currentVersion}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
};

exports.exportDOCX = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const srs = await SRS.findOne({ projectId });
    if (!srs) return res.status(404).json({ success: false, message: 'SRS document not found' });

    const docxBuffer = await exportService.generateDOCX(srs);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename=SRS_${srs.metadata?.title?.replace(/[^a-zA-Z0-9]/g, '_') || 'document'}_v${srs.currentVersion}.docx`);
    res.send(docxBuffer);
  } catch (error) {
    next(error);
  }
};
