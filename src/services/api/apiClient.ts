/**
 * Cliente HTTP desacoplado para comunicação com a API REST
 * Suporta injeção automática de JWT, timeouts configuráveis e tratamento de respostas
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  meta?: any;
  pagination?: { pagina: number; limite: number; total: number; total_paginas: number };
  error?: {
    code: string;
    message: string;
    details?: any;
    requestId?: string;
  };
}

export class ApiClient {
  private static getToken(): string | null {
    return localStorage.getItem('@ssa:token');
  }

  static async request<T = any>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>)
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Configuração de timeout defensivo (10s)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const json: ApiResponse<T> = await response.json().catch(() => ({
        success: false,
        error: {
          code: 'INVALID_RESPONSE',
          message: 'Não foi possível interpretar a resposta do servidor'
        }
      }));

      if (!response.ok) {
        if (response.status === 401 && !endpoint.includes('/auth/login')) {
          localStorage.removeItem('@ssa:token');
          window.location.href = '/login';
        }
        return json;
      }

      return json;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: 'A requisição excedeu o tempo limite de espera (10s)'
          }
        };
      }
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: 'Erro de conexão com o servidor. Verifique se o backend está em execução.'
        }
      };
    }
  }

  static get<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  static post<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  static put<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  static patch<T = any>(endpoint: string, body?: any) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined
    });
  }

  static delete<T = any>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}
