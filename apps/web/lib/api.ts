export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
export const API_BASE_URL = API_URL.replace('/api/v1', '');

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  timeout?: number;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { params, timeout = 5000, ...fetchOptions } = options;

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
  const token = typeof window !== 'undefined'
    ? (localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'))
    : null;

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
    // 401 Unauthorized - 토큰 만료/무효 시 로그인으로 리다이렉트
    if (response.status === 401 && typeof window !== 'undefined') {
      console.error('[API] 401 Unauthorized 응답 받음:', {
        url,
        endpoint,
        hasToken: !!token,
        tokenPrefix: token?.substring(0, 20),
      });

      // 로그인 페이지가 아닌 경우에만 리다이렉트
      if (!window.location.pathname.includes('/login')) {
        console.log('[API] 토큰 만료/무효 - 토큰 삭제 및 로그인 페이지로 이동');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('auth-storage');
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('refreshToken');
        sessionStorage.removeItem('auth-storage');

        // 대시보드 경로면 관리자 로그인으로, 그 외에는 일반 로그인으로
        const isDashboard = window.location.pathname.startsWith('/dashboard') ||
          window.location.pathname.startsWith('/company') ||
          window.location.pathname.startsWith('/product') ||
          window.location.pathname.startsWith('/order') ||
          window.location.pathname.startsWith('/production') ||
          window.location.pathname.startsWith('/cs') ||
          window.location.pathname.startsWith('/settings') ||
          window.location.pathname.startsWith('/statistics');
        window.location.href = isDashboard ? '/admin-login' : '/login';
      }
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
    request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) }),

  put: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data), timeout: 30000 }),

  patch: <T>(endpoint: string, data?: unknown) =>
    request<T>(endpoint, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: <T>(endpoint: string) =>
    request<T>(endpoint, { method: 'DELETE' }),
};
