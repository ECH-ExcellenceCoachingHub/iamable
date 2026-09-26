const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  const authStorage = localStorage.getItem('auth-storage');
  if (authStorage) {
    try {
      const token = JSON.parse(authStorage).state?.accessToken;
      if (token) return token;
    } catch {
      // fall through to the plain token
    }
  }
  return localStorage.getItem('accessToken');
}

function extractMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const message = (body as { message: unknown }).message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return fallback;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAPI<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const token = getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new ApiError('Unable to reach the server. Check your connection and try again.', 0);
  }

  const text = await response.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    // A 401 on an authenticated request means the session expired. A 401 without a
    // token (e.g. wrong password on login) is a normal error the caller should show.
    if (response.status === 401 && token && typeof window !== 'undefined') {
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      const next = encodeURIComponent(window.location.pathname);
      window.location.href = `/login?expired=1&next=${next}`;
      throw new ApiError('Your session has expired. Please sign in again.', 401);
    }
    throw new ApiError(extractMessage(body, 'Something went wrong. Please try again.'), response.status);
  }

  return body as T;
}

export interface AdminUserFilters {
  role?: 'user' | 'admin';
  status?: 'active' | 'suspended';
  verified?: 'verified' | 'unverified';
  sortBy?: 'createdAt' | 'name' | 'email' | 'lastLoginAt';
  sortOrder?: 'asc' | 'desc';
}

export type AdminBulkAction = 'activate' | 'suspend' | 'delete' | 'make-admin' | 'make-user' | 'verify';

function buildUserQuery(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  return query.toString();
}

export const api = {
  auth: {
    register: (data: { name: string; email: string; password: string }) => fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    login: (data: { email: string; password: string }) => fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    refresh: (refreshToken: string) => fetchAPI('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
    me: () => fetchAPI('/auth/me'),
    forgotPassword: (email: string) => fetchAPI('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),
    resetPassword: (token: string, newPassword: string) => fetchAPI('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  },
  users: {
    getProfile: () => fetchAPI('/users/profile'),
    updateProfile: (data: { name?: string; password?: string; profileImage?: string }) => fetchAPI('/users/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    updateAccessibility: (preferences: Record<string, boolean>) => fetchAPI('/users/accessibility', {
      method: 'PUT',
      body: JSON.stringify({ preferences }),
    }),
  },
  translations: {
    create: (data: {
      inputType: 'sign-to-text' | 'text-to-sign' | 'voice-to-sign';
      inputContent: string;
      translatedText: string;
      confidenceScore?: number;
    }) => fetchAPI('/translations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getAll: () => fetchAPI('/translations'),
    getHistory: (limit?: number) => fetchAPI(`/translations/history${limit ? `?limit=${limit}` : ''}`),
    getSaved: () => fetchAPI('/translations/saved'),
    getStats: () => fetchAPI('/translations/stats'),
    save: (id: string, notes?: string) => fetchAPI(`/translations/${id}/save`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
    unsave: (id: string) => fetchAPI(`/translations/${id}/save`, {
      method: 'DELETE',
    }),
    update: (id: string, data: { inputContent?: string; translatedText?: string; confidenceScore?: number }) =>
      fetchAPI(`/translations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) => fetchAPI(`/translations/${id}`, {
      method: 'DELETE',
    }),
  },
  ai: {
    predict: (gestureData: unknown) => fetchAPI('/ai/predict', {
      method: 'POST',
      body: JSON.stringify({ gestureData }),
    }),
    getLogs: (limit?: number, source?: string) =>
      fetchAPI(`/ai/logs?limit=${limit || 100}${source ? `&source=${encodeURIComponent(source)}` : ''}`),
    logPrediction: (data: {
      gesture: string;
      confidence: number;
      processingTime?: number;
      modelVersion?: string;
      source?: 'sign-to-text' | 'knowledge-check';
      expected?: string;
    }) => fetchAPI('/ai/logs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getStats: () => fetchAPI('/ai/stats'),
    getActiveModel: () => fetchAPI('/ai/model/active'),
    getDataset: () => fetchAPI('/ai/samples'),
    addSamples: (label: string, vectors: number[][], recordingId?: string) => fetchAPI('/ai/samples', {
      method: 'POST',
      body: JSON.stringify({ label, vectors, recordingId }),
    }),
    deleteSign: (label: string) => fetchAPI(`/ai/samples/${encodeURIComponent(label)}`, {
      method: 'DELETE',
    }),
    undoLatestSamples: (label: string, count: number) =>
      fetchAPI(`/ai/samples/${encodeURIComponent(label)}/latest?count=${count}`, {
        method: 'DELETE',
      }),
    createTraining: (data: Record<string, unknown>) => fetchAPI('/ai/training', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getTrainingHistory: () => fetchAPI('/ai/training'),
    getTraining: (id: string) => fetchAPI(`/ai/training/${id}`),
    getTrainingModel: (id: string) => fetchAPI(`/ai/training/${id}/model`),
    deployTraining: (id: string) => fetchAPI(`/ai/training/${id}/deploy`, {
      method: 'POST',
    }),
    undeployModel: () => fetchAPI('/ai/training/undeploy', {
      method: 'POST',
    }),
    deleteTraining: (id: string) => fetchAPI(`/ai/training/${id}`, {
      method: 'DELETE',
    }),
    updateTrainingStatus: (id: string, status: string, accuracy?: number, loss?: number, errorMessage?: string) =>
      fetchAPI(`/ai/training/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, accuracy, loss, errorMessage }),
      }),
  },
  admin: {
    getReports: () => fetchAPI('/admin/reports'),
    createReport: (data: { reportType: string; message: string }) => fetchAPI('/admin/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    updateReportStatus: (id: string, status: string, adminResponse?: string) => 
      fetchAPI(`/admin/reports/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status, adminResponse }),
      }),
    getStats: () => fetchAPI('/admin/stats'),
    getAllUsers: (page?: number, limit?: number, search?: string, filters: AdminUserFilters = {}) =>
      fetchAPI(`/admin/users?${buildUserQuery({ page: page || 1, limit: limit || 10, search, ...filters })}`),
    getUserStats: () => fetchAPI('/admin/users/stats'),
    exportUsers: (search?: string, filters: AdminUserFilters = {}) =>
      fetchAPI(`/admin/users/export?${buildUserQuery({ search, ...filters })}`),
    getUserById: (id: string) => fetchAPI(`/admin/users/${id}`),
    createUser: (data: { name: string; email: string; password: string; role?: string; isEmailVerified?: boolean }) =>
      fetchAPI('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateUser: (
      id: string,
      data: Partial<{ name: string; email: string; role: string; isEmailVerified: boolean; isActive: boolean; profileImage: string }>
    ) =>
      fetchAPI(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateUserRole: (id: string, role: string) => fetchAPI(`/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),
    updateUserStatus: (id: string, isActive: boolean, reason?: string) =>
      fetchAPI(`/admin/users/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ isActive, ...(reason ? { reason } : {}) }),
      }),
    resetUserPassword: (id: string, password: string) =>
      fetchAPI(`/admin/users/${id}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      }),
    bulkUserAction: (ids: string[], action: AdminBulkAction) =>
      fetchAPI('/admin/users/bulk', {
        method: 'POST',
        body: JSON.stringify({ ids, action }),
      }),
    deleteUser: (id: string) => fetchAPI(`/admin/users/${id}`, {
      method: 'DELETE',
    }),
    logSystemMetric: (data: Record<string, unknown>) => fetchAPI('/admin/system/metrics', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    getSystemMetrics: (limit?: number, type?: string) => 
      fetchAPI(`/admin/system/metrics?limit=${limit || 100}${type ? `&type=${type}` : ''}`),
    getDashboardStats: () => fetchAPI('/admin/system/dashboard'),
  },
  notifications: {
    getAll: () => fetchAPI('/notifications'),
    getUnread: () => fetchAPI('/notifications/unread'),
    getUnreadCount: () => fetchAPI('/notifications/count'),
    create: (data: Record<string, unknown>) => fetchAPI('/notifications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    markAsRead: (id: string) => fetchAPI(`/notifications/${id}/read`, {
      method: 'PUT',
    }),
    markAllAsRead: () => fetchAPI('/notifications/read-all', {
      method: 'PUT',
    }),
    delete: (id: string) => fetchAPI(`/notifications/${id}`, {
      method: 'DELETE',
    }),
    clearAll: () => fetchAPI('/notifications/clear-all', {
      method: 'DELETE',
    }),
    getPushPublicKey: () => fetchAPI<{ publicKey: string | null; enabled: boolean }>('/notifications/push/public-key'),
    subscribePush: (subscription: PushSubscriptionJSON) => fetchAPI('/notifications/push/subscribe', {
      method: 'POST',
      body: JSON.stringify(subscription),
    }),
    unsubscribePush: (endpoint: string) => fetchAPI('/notifications/push/unsubscribe', {
      method: 'POST',
      body: JSON.stringify({ endpoint }),
    }),
    sendTestPush: () => fetchAPI<{ devices: number }>('/notifications/push/test', {
      method: 'POST',
    }),
  },
};
