// Simple HTTP client for FriendlyVoice backend
// Base URL via env var with dev fallback
const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    let errorData: any = null;
    try { 
      const j = await res.json(); 
      errorData = j;
      // Capturar mensaje de error del backend (puede estar en 'error' o 'message')
      msg = j.message || j.error || msg;
    } catch (e) {
      // Si no se puede parsear JSON, usar el mensaje de estado HTTP
      console.warn("No se pudo parsear respuesta de error como JSON:", e);
    }
    const error = new Error(msg);
    (error as any).status = res.status;
    (error as any).data = errorData; // Incluir datos completos del error para mejor depuración
    console.error(`API Error [${res.status}]:`, { path, message: msg, data: errorData });
    throw error;
  }
  try { return await res.json(); } catch { return undefined as unknown as T; }
}

export const api = {
  get: <T>(path: string, options?: RequestInit) => request<T>(path, { method: 'GET', ...(options||{}) }),
  post: <T>(path: string, body?: any, options?: RequestInit) => request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined, ...(options||{}) }),
  put: <T>(path: string, body?: any, options?: RequestInit) => request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined, ...(options||{}) }),
  delete: <T>(path: string, options?: RequestInit) => request<T>(path, { method: 'DELETE', ...(options||{}) }),
  baseUrl: BASE_URL,
};
