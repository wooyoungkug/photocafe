export const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
export const API_BASE_URL = API_URL.replace('/api/v1', '');

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
  _isRetry?: boolean; // 토큰 갱신 후 재시도 플래그
}

// 토큰 갱신 중복 방지
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  // sessionStorage 우선: 대리로그인 등 탭별 독립 세션 지원
  return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
}

function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
}

function isRememberMe(): boolean {
  if (typeof window === 'undefined') return false;
  return !!localStorage.getItem('accessToken');
}

function saveTokens(accessToken: string, refreshToken?: string) {
  if (typeof window === 'undefined') return;
  const storage = isRememberMe() ? localStorage : sessionStorage;
  storage.setItem('accessToken', accessToken);
  if (refreshToken) {
    storage.setItem('refreshToken', refreshToken);
  }
}

function clearAllAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('auth-storage');
  sessionStorage.removeItem('accessToken');
  sessionStorage.removeItem('refreshToken');
  sessionStorage.removeItem('auth-storage');
}

function redirectToLogin() {
  if (typeof window === 'undefined') return;
  if (window.location.pathname.includes('/login')) return;

  const isDashboard = window.location.pathname.startsWith('/dashboard') ||
    window.location.pathname.startsWith('/company') ||
    window.location.pathname.startsWith('/product') ||
    window.location.pathname.startsWith('/order') ||
    window.location.pathname.startsWith('/production') ||
    window.location.pathname.startsWith('/pricing') ||
    window.location.pathname.startsWith('/schedule') ||
    window.location.pathname.startsWith('/master') ||
    window.location.pathname.startsWith('/accounting') ||
    window.location.pathname.startsWith('/cs') ||
    window.location.pathname.startsWith('/settings') ||
    window.location.pathname.startsWith('/statistics');
  window.location.href = isDashboard ? '/admin-login' : '/login';
}

// refresh token으로 새 access token 발급
async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  // 이미 갱신 중이면 기존 Promise 재사용 (중복 요청 방지)
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      saveTokens(data.accessToken, data.refreshToken);

      // Zustand auth store도 동기화
      try {
        const storageKey = 'auth-storage';
        const storage = isRememberMe() ? localStorage : sessionStorage;
        const stored = storage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.state) {
            parsed.state.accessToken = data.accessToken;
            if (data.refreshToken) {
              parsed.state.refreshToken = data.refreshToken;
            }
            storage.setItem(storageKey, JSON.stringify(parsed));
          }
        }
      } catch {
        // 스토어 동기화 실패해도 토큰 갱신은 성공
      }

      return data.accessToken as string;
    } catch {
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, timeout = 5000, _isRetry = false, ...fetchOptions } = options;

  let url = `${API_URL}${endpoint}`;

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  // localStorage 또는 sessionStorage에서 토큰 가져오기
  const token = getAccessToken();

  // 타임아웃 처리를 위한 AbortController
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let response: Response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...fetchOptions.headers,
      },
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('요청 시간이 초과되었습니다. 서버 연결을 확인해주세요.');
    }
    // 네트워크 에러
    throw new Error('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.');
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    // 401 Unauthorized - 토큰 갱신 시도
    // 로그인/인증 관련 엔드포인트는 리다이렉트하지 않고 에러만 던짐
    const isAuthEndpoint = endpoint.startsWith('/auth/') && !endpoint.startsWith('/auth/impersonate');
    if (response.status === 401 && typeof window !== 'undefined' && !isAuthEndpoint) {
      // 재시도가 아닌 경우에만 refresh 시도
      if (!_isRetry) {
        const newToken = await refreshAccessToken();
        if (newToken) {
          // 새 토큰으로 원래 요청 재시도
          return request<T>(endpoint, { ...options, _isRetry: true });
        }
      }

      // refresh 실패 → 로그인 페이지로 이동
      console.log('[API] 토큰 갱신 실패 - 로그인 페이지로 이동');
      clearAllAuth();
      redirectToLogin();
      throw new Error('Unauthorized');
    }
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    console.error('[API Error]', response.status, error);
    const message = Array.isArray(error.message) ? error.message.join(', ') : (error.message || `HTTP error ${response.status}`);
    throw new Error(message);
  }

  // 204 No Content 또는 빈 응답 처리
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : undefined as T;
}

export const api = {
  get: <T>(endpoint: string, params?: Record<string, string | number | boolean | undefined>) =>
    request<T>(endpoint, { method: 'GET', params }),

  post: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data), timeout: 30000 }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data), timeout: 30000 }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),

  downloadBlob: async (endpoint: string, defaultFileName: string = 'download') => {
    const token = getAccessToken();
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'GET',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: '다운로드 실패' }));
      throw new Error(error.message || `HTTP error ${response.status}`);
    }

    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition');
    let fileName = defaultFileName;
    if (disposition) {
      const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\s]+)/i);
      if (match) fileName = decodeURIComponent(match[1]);
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
};
