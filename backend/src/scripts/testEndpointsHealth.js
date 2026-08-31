const axios = require('axios');

async function testHealth() {
  console.log('Testing Backend & Frontend API routes...');
  try {
    const backendRes = await axios.get('http://localhost:5000/api/health');
    console.log('✓ Backend /api/health:', backendRes.status, backendRes.data);
  } catch (e) {
    console.error('Backend health check error:', e.message);
  }

  try {
    const projectsRes = await axios.get('http://localhost:5000/api/projects');
    console.log('✓ Backend /api/projects:', projectsRes.status, `(${projectsRes.data?.data?.length || 0} projects)`);
    if (projectsRes.data?.data?.length > 0) {
      const p = projectsRes.data.data[0];
      const pId = p._id;
      console.log(`Testing Project ${p.projectName} (ID: ${pId})...`);

      const singleProj = await axios.get(`http://localhost:5000/api/projects/${pId}`);
      console.log('✓ GET /api/projects/:id ->', singleProj.status);

      const interview = await axios.get(`http://localhost:5000/api/projects/${pId}/interview`);
      console.log('✓ GET /api/projects/:id/interview ->', interview.status);

      const srs = await axios.get(`http://localhost:5000/api/projects/${pId}/srs`);
      console.log('✓ GET /api/projects/:id/srs ->', srs.status);
    }
  } catch (e) {
    console.error('Project routes check error:', e.message);
  }
}

testHealth();
