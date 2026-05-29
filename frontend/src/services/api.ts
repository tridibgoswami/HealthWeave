/**
 * HealthWeave API Client
 * Centralized axios instance with auth interceptors.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "/api/v1";

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { "Content-Type": "application/json" },
});

// Attach JWT token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem("hw_access_token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — refresh token flow
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem("hw_refresh_token");
      if (refresh) {
        try {
          const res = await axios.post(`${BASE_URL}/auth/refresh`, {
            refresh_token: refresh,
          });
          const { access_token, refresh_token } = res.data;
          localStorage.setItem("hw_access_token", access_token);
          localStorage.setItem("hw_refresh_token", refresh_token);
          if (original.headers) {
            original.headers.Authorization = `Bearer ${access_token}`;
          }
          return api(original);
        } catch {
          localStorage.removeItem("hw_access_token");
          localStorage.removeItem("hw_refresh_token");
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (data: {
    email: string; password: string; first_name: string; last_name: string;
    phone?: string; role?: string; specialization?: string;
    medical_registration_number?: string; organization_name?: string;
  }) => api.post("/auth/register", data),

  login: (data: { email: string; password: string }) =>
    api.post("/auth/login", data),

  getMe: () => api.get("/auth/me"),
};

// ── Health Records ─────────────────────────────────────────────────────────────

export const recordsApi = {
  upload: (formData: FormData) =>
    api.post("/records/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120000,
    }),

  list: (params?: {
    record_type?: string;
    from_date?: string;
    to_date?: string;
    page?: number;
    page_size?: number;
  }) => api.get("/records/", { params }),

  get: (id: string) => api.get(`/records/${id}`),

  getBiomarkerTrend: (biomarker: string, months = 24) =>
    api.get("/records/biomarkers/trends", { params: { biomarker_name: biomarker, months } }),
};

// ── AI Chat ────────────────────────────────────────────────────────────────────

export const chatApi = {
  createSession: (data: { title?: string; session_type?: string }) =>
    api.post("/chat/sessions", data),

  listSessions: () => api.get("/chat/sessions"),

  sendMessage: (sessionId: string, message: string, stream = false) =>
    api.post(`/chat/sessions/${sessionId}/messages`, { message, stream }),

  getMessages: (sessionId: string) =>
    api.get(`/chat/sessions/${sessionId}/messages`),

  streamMessage: (sessionId: string, message: string): EventSource => {
    const token = localStorage.getItem("hw_access_token");
    const url = `${BASE_URL}/chat/sessions/${sessionId}/messages/stream?message=${encodeURIComponent(message)}&token=${token}`;
    return new EventSource(url);
  },
};

// ── Intelligence ────────────────────────────────────────────────────────────────

export const intelligenceApi = {
  getHealthScores: (limit = 30) =>
    api.get("/intelligence/health-scores", { params: { limit } }),

  computeScores: () => api.post("/intelligence/health-scores/compute"),

  getAlerts: (dismissed = false) =>
    api.get("/intelligence/alerts", { params: { dismissed } }),

  generateAlerts: () => api.post("/intelligence/alerts/generate"),

  dismissAlert: (alertId: string) =>
    api.post(`/intelligence/alerts/${alertId}/dismiss`),

  getCorrelations: () => api.get("/intelligence/correlations"),

  runCorrelations: () => api.post("/intelligence/correlations/run"),

  getDoctorSummary: () => api.get("/intelligence/doctor-summary"),

  getTimeline: (params?: { year?: number; event_types?: string[]; limit?: number }) =>
    api.get("/intelligence/timeline", { params }),

  compareReports: (id1: string, id2: string) =>
    api.get("/intelligence/timeline/compare", {
      params: { record_id_1: id1, record_id_2: id2 },
    }),

  getBiomarkerTrends: (months = 24) =>
    api.get("/intelligence/biomarker-trends", { params: { months } }),

  getRiskPredictions: () => api.get("/intelligence/risk-predictions"),

  runRiskPredictions: () => api.post("/intelligence/risk-predictions/run"),

  getMedicineInteractions: () => api.get("/intelligence/medicine-interactions"),

  checkMedicineInteractions: () => api.post("/intelligence/medicine-interactions/check"),

  acknowledgeInteraction: (id: string) =>
    api.post(`/intelligence/medicine-interactions/${id}/acknowledge`),

  getKnowledgeGraph: () => api.get("/intelligence/knowledge-graph"),
};

// ── Emergency ──────────────────────────────────────────────────────────────────

export const emergencyApi = {
  getPassportByToken: (qrToken: string) =>
    axios.get(`${BASE_URL}/emergency/passport/${qrToken}`),

  getMyPassport: () => api.get("/emergency/my-passport"),

  savePassport: (data: object) => api.post("/emergency/my-passport", data),

  autoUpdate: () => api.post("/emergency/my-passport/auto-update"),
};

// ── Organizations ──────────────────────────────────────────────────────────────

export const orgApi = {
  create: (data: object) => api.post("/organizations/", data),
  getMyOrg: () => api.get("/organizations/me"),
  listMembers: (orgId: string) => api.get(`/organizations/${orgId}/members`),
  inviteDoctor: (orgId: string, data: { email: string; role?: string }) =>
    api.post(`/organizations/${orgId}/invite`, data),
  acceptInvitation: (data: { token: string; password: string; first_name?: string; last_name?: string }) =>
    api.post("/organizations/invitations/accept", data),
  getStats: (orgId: string) => api.get(`/organizations/${orgId}/stats`),
  search: (q: string) => api.get("/organizations/search", { params: { q } }),
  getDepartments: () => api.get("/organizations/departments"),
};

// ── Doctor Portal ──────────────────────────────────────────────────────────────

export const doctorApi = {
  getProfile: () => api.get("/doctor/profile"),
  updateProfile: (data: object) => api.put("/doctor/profile", data),
  search: (q: string) => api.get("/doctor/search", { params: { q } }),
  listPatients: () => api.get("/doctor/patients"),
  getPatientSummary: (patientId: string) => api.get(`/doctor/patients/${patientId}/summary`),
  getPatientBiomarkers: (patientId: string, months = 12) =>
    api.get(`/doctor/patients/${patientId}/biomarkers`, { params: { months } }),
  addClinicalNote: (patientId: string, data: object) =>
    api.post(`/doctor/patients/${patientId}/notes`, data),
  listClinicalNotes: (patientId: string) =>
    api.get(`/doctor/patients/${patientId}/notes`),
  requestLabs: (patientId: string, data: object) =>
    api.post(`/doctor/patients/${patientId}/lab-requests`, data),
};

// ── Consent ────────────────────────────────────────────────────────────────────

export const consentApi = {
  sendReport: (data: {
    target_type: "doctor" | "hospital";
    doctor_email?: string;
    organization_id?: string;
    department?: string;
    patient_message: string;
    share_full_history?: boolean;
    share_biomarkers?: boolean;
    share_prescriptions?: boolean;
    share_lab_reports?: boolean;
    share_scans?: boolean;
    valid_days?: number;
  }) => api.post("/consent/send-report", data),
  grantConsent: (data: {
    doctor_email: string; share_full_history?: boolean;
    share_biomarkers?: boolean; share_prescriptions?: boolean;
    share_lab_reports?: boolean; share_scans?: boolean;
    valid_days?: number; purpose?: string;
  }) => api.post("/consent/grant", data),
  listConsents: () => api.get("/consent/"),
  revokeConsent: (consentId: string) => api.post("/consent/revoke", { consent_id: consentId }),
};

// ── Notifications ──────────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (unreadOnly = false) => api.get("/notifications/", { params: { unread_only: unreadOnly } }),
  unreadCount: () => api.get("/notifications/unread-count"),
  markRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllRead: () => api.post("/notifications/mark-all-read"),
};
