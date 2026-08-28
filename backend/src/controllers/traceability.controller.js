const traceabilityService = require('../services/traceabilityService');
const TraceabilityLink = require('../models/TraceabilityLink');
const Project = require('../models/Project');

exports.getTraceabilityMatrix = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    let links = await TraceabilityLink.find({ projectId }).sort({ requirementId: 1 });
    
    if (links.length === 0) {
      links = await traceabilityService.generateLinksForProject(projectId);
    }

    const matrix = await traceabilityService.getMatrix(projectId);

    // Build flow graph nodes and edges
    const graphData = {
      nodes: [],
      edges: []
    };

    const addedNodes = new Set();
    links.forEach((l, idx) => {
      const srcId = `SRC-${l.sourceType}-${idx}`;
      const reqId = `REQ-${l.requirementId}`;
      const featId = `FEAT-${l.systemFeatureId || '3.1'}`;
      const secId = `SEC-${l.srsSection || '3.1.3'}`;
      const verId = `VER-${l.srsVersion || '1.0'}`;

      if (!addedNodes.has(srcId)) {
        graphData.nodes.push({ id: srcId, label: `${l.sourceType}: ${l.sourceReference}`, group: 'source' });
        addedNodes.add(srcId);
      }
      if (!addedNodes.has(reqId)) {
        graphData.nodes.push({ id: reqId, label: `${l.requirementId}: ${l.requirementTitle}`, group: 'requirement' });
        addedNodes.add(reqId);
      }
      if (!addedNodes.has(featId)) {
        graphData.nodes.push({ id: featId, label: `Feature ${l.systemFeatureId}`, group: 'feature' });
        addedNodes.add(featId);
      }
      if (!addedNodes.has(secId)) {
        graphData.nodes.push({ id: secId, label: `Section ${l.srsSection}`, group: 'section' });
        addedNodes.add(secId);
      }
      if (!addedNodes.has(verId)) {
        graphData.nodes.push({ id: verId, label: `SRS v${l.srsVersion}`, group: 'version' });
        addedNodes.add(verId);
      }

      graphData.edges.push(
        { from: srcId, to: reqId, label: 'elicits' },
        { from: reqId, to: featId, label: 'maps to' },
        { from: featId, to: secId, label: 'documented in' },
        { from: secId, to: verId, label: 'released in' }
      );
    });

    res.json({
      success: true,
      count: matrix.length,
      data: {
        matrix,
        graphData
      }
    });
  } catch (error) {
    next(error);
  }
};
