import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me')
};

export const projectAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  seedDemo: () => api.post('/projects/seed-demo')
};

export const interviewAPI = {
  start: (projectId) => api.post(`/projects/${projectId}/interview/start`),
  send: (projectId, data) => api.post(`/projects/${projectId}/interview/message`, data),
  get: (projectId) => api.get(`/projects/${projectId}/interview`)
};

export const requirementAPI = {
  getAll: (projectId, params) => api.get(`/projects/${projectId}/requirements`, { params }),
  create: (projectId, data) => api.post(`/projects/${projectId}/requirements`, data),
  update: (id, data) => api.put(`/requirements/${id}`, data),
  delete: (id) => api.delete(`/requirements/${id}`),
  extract: (projectId, text) => api.post(`/projects/${projectId}/requirements/extract`, { text }),
  merge: (projectId, data) => api.post(`/projects/${projectId}/requirements/merge`, data)
};

export const analysisAPI = {
  analyze: (projectId) => api.post(`/projects/${projectId}/requirements/analyze`),
  classify: (projectId, data) => api.post(`/projects/${projectId}/requirements/classify`, data),
  validate: (projectId) => api.post(`/projects/${projectId}/requirements/validate`),
  getIssues: (projectId) => api.get(`/projects/${projectId}/requirements/issues`),
  resolveIssue: (issueId, data) => api.put(`/issues/${issueId}/resolve`, data),
  mergeRequirements: (projectId, data) => api.post(`/projects/${projectId}/requirements/merge`, data)
};

export const srsAPI = {
  generate: (projectId) => api.post(`/projects/${projectId}/srs/generate`),
  get: (projectId) => api.get(`/projects/${projectId}/srs`),
  update: (id, data) => api.put(`/srs/${id}`, data),
  review: (id) => api.post(`/srs/${id}/review`),
  approve: (id) => api.post(`/srs/${id}/approve`),
  incrementalUpdate: (projectId, data) => api.post(`/projects/${projectId}/srs/update`, data),
  getVersions: (projectId) => api.get(`/projects/${projectId}/srs/versions`),
  getVersion: (projectId, version) => api.get(`/projects/${projectId}/srs/versions/${version}`),
  compareVersions: (projectId, v1, v2) => api.get(`/projects/${projectId}/srs/compare?v1=${v1}&v2=${v2}`),
  getTraceability: (projectId) => api.get(`/projects/${projectId}/traceability`),
  getExportPDFUrl: (projectId) => `${API_BASE}/projects/${projectId}/srs/export/pdf`,
  getExportDOCXUrl: (projectId) => `${API_BASE}/projects/${projectId}/srs/export/docx`
};

export default api;
