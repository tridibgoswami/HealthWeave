import { apiClient } from './client';

// ── Auth ──────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),

  register: (data: {
    email: string; password: string;
    first_name: string; last_name: string; phone?: string;
  }) => apiClient.post('/auth/register', data),

  me: () => apiClient.get('/auth/me'),

  refresh: (refresh_token: string) =>
    apiClient.post('/auth/refresh', { refresh_token }),
};

// ── Health Records ────────────────────────────────────────────
export const recordsApi = {
  list: (params?: { record_type?: string; limit?: number; offset?: number }) =>
    apiClient.get('/records', { params }),

  get: (id: string) => apiClient.get(`/records/${id}`),

  upload: (formData: FormData) =>
    apiClient.post('/records/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    }),

  delete: (id: string) => apiClient.delete(`/records/${id}`),

  getBiomarkers: (name: string, days?: number) =>
    apiClient.get(`/records/biomarkers/${name}`, { params: { days } }),
};

// ── Intelligence ──────────────────────────────────────────────
export const intelligenceApi = {
  getHealthScores: (limit = 1) =>
    apiClient.get('/intelligence/health-scores', { params: { limit } }),

  generateHealthScore: () =>
    apiClient.post('/intelligence/health-scores/generate'),

  getAlerts: (dismissed = false) =>
    apiClient.get('/intelligence/alerts', { params: { dismissed } }),

  dismissAlert: (id: string) =>
    apiClient.patch(`/intelligence/alerts/${id}/dismiss`),

  getCorrelations: () => apiClient.get('/intelligence/correlations'),

  getDoctorSummary: () => apiClient.get('/intelligence/doctor-summary'),

  chat: (message: string, session_id?: string) =>
    apiClient.post('/intelligence/chat', { message, session_id }),

  getChatHistory: (session_id: string) =>
    apiClient.get(`/intelligence/chat/${session_id}`),
};

// ── Emergency ─────────────────────────────────────────────────
export const emergencyApi = {
  getPassport: () => apiClient.get('/emergency/passport'),
  createPassport: (data: object) => apiClient.post('/emergency/passport', data),
  updatePassport: (data: object) => apiClient.put('/emergency/passport', data),
  getPassportByToken: (token: string) =>
    apiClient.get(`/emergency/passport/${token}`),
};

// ── Family ────────────────────────────────────────────────────
export const familyApi = {
  list: () => apiClient.get('/family'),
  add: (data: object) => apiClient.post('/family', data),
  remove: (id: string) => apiClient.delete(`/family/${id}`),
};

// ── Timeline ──────────────────────────────────────────────────
export const timelineApi = {
  get: (params?: { limit?: number; offset?: number; event_type?: string }) =>
    apiClient.get('/timeline', { params }),
};
