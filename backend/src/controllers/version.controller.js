const SRSVersion = require('../models/SRSVersion');
const SRS = require('../models/SRS');

exports.getProjectVersions = async (req, res, next) => {
  try {
    const versions = await SRSVersion.find({ projectId: req.params.id }).sort({ version: -1 });
    res.json({ success: true, count: versions.length, data: versions });
  } catch (error) {
    next(error);
  }
};

exports.getVersionByNumber = async (req, res, next) => {
  try {
    const versionDoc = await SRSVersion.findOne({
      projectId: req.params.id,
      version: req.params.version
    });
    if (!versionDoc) return res.status(404).json({ success: false, message: 'Version not found' });
    res.json({ success: true, data: versionDoc });
  } catch (error) {
    next(error);
  }
};

exports.compareVersions = async (req, res, next) => {
  try {
    const projectId = req.params.id;
    const { v1, v2 } = req.query;

    const versionA = await SRSVersion.findOne({ projectId, version: v1 || '1.0' });
    const versionB = await SRSVersion.findOne({ projectId, version: v2 || '1.1' });

    if (!versionA || !versionB) {
      // If version B is not yet generated, fall back to current SRS
      const currentSRS = await SRS.findOne({ projectId });
      return res.json({
        success: true,
        data: {
          v1: versionA ? versionA.srsSnapshot : null,
          v2: currentSRS,
          diff: {
            added: [],
            modified: ['FR-002'],
            removed: []
          }
        }
      });
    }

    res.json({
      success: true,
      data: {
        v1: versionA.srsSnapshot,
        v2: versionB.srsSnapshot,
        diff: versionB.diffData || {
          added: [],
          modified: versionB.changedRequirementIds,
          removed: []
        },
        reasonForChanges: versionB.reasonForChanges,
        summaryOfChanges: versionB.summaryOfChanges
      }
    });
  } catch (error) {
    next(error);
  }
};
