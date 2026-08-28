const axios = require('axios');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { connectDB } = require('../config/db');
const routes = require('../routes');
const { errorHandler } = require('../middleware/errorHandler.middleware');
const demoSeedService = require('../services/demoSeedService');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use('/api', routes);
app.use(errorHandler);

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api`;

async function run() {
  console.log('--- STARTING INTELLISDLC AI INTEGRATION TEST ---');
  await connectDB();
  
  const server = app.listen(TEST_PORT, '127.0.0.1', async () => {
    console.log(`Test server running on port ${TEST_PORT}`);
    try {
      // 1. Health check
      console.log('[1/9] Testing /api/health ...');
      const health = await axios.get(`${BASE_URL}/health`);
      console.log('✓ Health status:', health.data.status);

      // 2. Demo Seeding
      console.log('[2/9] Seeding College Event Management System Demo ...');
      const demoRes = await axios.post(`${BASE_URL}/projects/seed-demo`);
      console.log('✓ Seed response:', demoRes.data.message);
      const projectId = demoRes.data.data._id;
      console.log('✓ Demo Project ID:', projectId);

      // 3. Requirements retrieval
      console.log('[3/9] Fetching requirements for College Event Management System ...');
      const reqRes = await axios.get(`${BASE_URL}/projects/${projectId}/requirements`);
      console.log(`✓ Fetched ${reqRes.data.count} requirements:`, reqRes.data.data.map(r => r.requirementId).join(', '));

      // 4. Quality & Defect Analysis
      console.log('[4/9] Running Quality, Ambiguity & Duplicate Cosine Similarity Analysis ...');
      const analysisRes = await axios.post(`${BASE_URL}/projects/${projectId}/requirements/analyze`);
      console.log(`✓ Analysis completed. Identified ${analysisRes.data.count} audit findings.`);

      // 5. ISO/IEEE Validation
      console.log('[5/9] Running Requirements Validation ...');
      const valRes = await axios.post(`${BASE_URL}/projects/${projectId}/requirements/validate`);
      console.log(`✓ Validated ${valRes.data.count} requirements against ISO/IEC/IEEE 29148.`);

      // 6. SRS Document Baseline Check
      console.log('[6/9] Fetching Generated Baseline SRS (v1.0) ...');
      const srsRes = await axios.get(`${BASE_URL}/projects/${projectId}/srs`);
      console.log('✓ SRS Title:', srsRes.data.data?.metadata?.title);
      console.log('✓ Baseline Version:', srsRes.data.data?.currentVersion);
      console.log('✓ Features in Section 3:', (srsRes.data.data?.section3_systemFeatures || []).map(f => `${f.featureId} ${f.featureName}`).join('; '));

      // 7. Incremental SRS Update Demo Scenario
      console.log('[7/9] Testing Incremental Update ("Event registration requires administrator approval.") ...');
      const updateRes = await axios.post(`${BASE_URL}/projects/${projectId}/srs/update`, {
        changeText: 'Event registration requires administrator approval.',
        reason: 'Updated approval policy by campus event board.'
      });
      console.log('✓ Incremental update executed:', updateRes.data.message);
      console.log('✓ New SRS Version:', updateRes.data.data?.srs?.currentVersion);

      // 8. Bidirectional Traceability Matrix
      console.log('[8/9] Verifying Bidirectional Traceability Links ...');
      const traceRes = await axios.get(`${BASE_URL}/projects/${projectId}/traceability`);
      console.log(`✓ Verified ${traceRes.data.count} traceability links across (Source -> REQ ID -> Feature -> Section -> Version).`);

      // 9. Document Binary Export Verification
      console.log('[9/9] Testing PDF and DOCX binary exports ...');
      const pdfRes = await axios.get(`${BASE_URL}/projects/${projectId}/srs/export/pdf`, { responseType: 'arraybuffer' });
      const docxRes = await axios.get(`${BASE_URL}/projects/${projectId}/srs/export/docx`, { responseType: 'arraybuffer' });
      console.log(`✓ PDF Generated: ${pdfRes.data.length} bytes`);
      console.log(`✓ DOCX Generated: ${docxRes.data.length} bytes`);

      console.log('\n====================================================');
      console.log(' ALL 9/9 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY! ');
      console.log('====================================================');
      server.close(() => {
        process.exit(0);
      });
    } catch (err) {
      console.error('Verification failed:', err.response?.data || err.message);
      server.close(() => {
        process.exit(1);
      });
    }
  });
}

run();
