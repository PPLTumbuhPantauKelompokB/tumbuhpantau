let csrfTokenInMemory = '';

export function setCsrfToken(token) {
  if (token) {
    csrfTokenInMemory = token;
  }
}

export function getCsrfToken() {
  return csrfTokenInMemory;
}

export async function apiRequest(path, { method = 'GET', body = undefined, headers = {} } = {}) {
  const reqHeaders = {
    Accept: 'application/json',
    ...headers
  };

  const upperMethod = method.toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(upperMethod) && csrfTokenInMemory) {
    reqHeaders['X-CSRF-Token'] = csrfTokenInMemory;
  }

  if (body !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`/api/v1${path}`, {
    method: upperMethod,
    credentials: 'include',
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  const headerCsrf = response.headers.get('x-csrf-token');
  if (headerCsrf) {
    csrfTokenInMemory = headerCsrf;
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (!response.ok) {
      throw new Error(`Permintaan gagal (${response.status})`);
    }
    return response;
  }

  const payload = await response.json();
  if (payload?.data?.csrfToken) {
    csrfTokenInMemory = payload.data.csrfToken;
  }

  if (!response.ok || payload?.success === false) {
    const err = new Error(payload?.error?.message || 'Terjadi kesalahan saat memproses permintaan.');
    err.status = response.status;
    err.code = payload?.error?.code || 'ERROR';
    err.fieldErrors = payload?.error?.fieldErrors || null;
    throw err;
  }

  return payload.data;
}
