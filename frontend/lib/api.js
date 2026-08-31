import axios from 'axios';

// Use a relative URL by default so browser requests go through the Next.js
// proxy (next.config.js rewrites /api/* -> backend). This keeps the app working
// in sandboxed/preview environments where the browser cannot reach localhost.
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token && token !== 'null' && token !== 'undefined') {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        localStorage.removeItem('token');
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  updateProfile: (data) => api.put('/auth/profile', data),
  getGoogleAuthUrl: (mode = 'login') => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    return `${base}/auth/google?mode=${mode}`;
  },
  getGithubAuthUrl: (mode = 'login') => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
    return `${base}/auth/github?mode=${mode}`;
  }
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
  archive: (id) => api.post(`/requirements/${id}/archive`),
  revalidate: (id) => api.post(`/requirements/${id}/revalidate`),
  extract: (projectId, text) => api.post(`/projects/${projectId}/requirements/extract`, { text, previewOnly: false }),
  extractPreview: (projectId, text) => api.post(`/projects/${projectId}/requirements/extract`, { text, previewOnly: true }),
  batchCreate: (projectId, requirements) => api.post(`/projects/${projectId}/requirements/batch`, { requirements })
};

export const analysisAPI = {
  analyze: (projectId) => api.post(`/projects/${projectId}/requirements/analyze`),
  classify: (projectId, data) => api.post(`/projects/${projectId}/requirements/classify`, data),
  validate: (projectId) => api.post(`/projects/${projectId}/requirements/validate`),
  getIssues: (projectId) => api.get(`/projects/${projectId}/requirements/issues`),
  resolveIssue: (issueId, data) => api.put(`/issues/${issueId}/resolve`, data),
  getAlternativeSuggestion: (reqId) => api.post(`/requirements/${reqId}/alternative-suggestion`)
};

export const srsAPI = {
  generate: (projectId) => api.post(`/projects/${projectId}/srs/generate`),
  sync: (projectId) => api.post(`/projects/${projectId}/srs/generate`),
  regenerate: (projectId) => api.post(`/projects/${projectId}/srs/generate`),
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

export const systemAPI = {
  getHealth: () => api.get('/health'),
  getAIHealth: () => api.get('/health/ai')
};

export default api;
