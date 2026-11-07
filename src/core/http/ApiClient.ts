import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
  InternalAxiosRequestConfig,
} from 'axios';
import { config } from '../../config/env.config';
import { logger } from '../utils/logger';
import { authManager } from './AuthManager';

export interface ApiResponse<T = any> {
  status: number;
  data: T;
  headers: Record<string, any>;
  durationMs: number;
}

export interface RequestOptions extends AxiosRequestConfig {
  authContext?: string;
  retries?: number;
  retryDelayMs?: number;
  skipAuth?: boolean;
}

export class ApiError extends Error {
  public status: number;
  public statusText: string;
  public data: any;
  public config: AxiosRequestConfig;

  constructor(message: string, status: number, statusText: string, data: any, config: AxiosRequestConfig) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.data = data;
    this.config = config;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export class ApiClient {
  private client: AxiosInstance;
  private defaultRetries: number;
  private defaultRetryDelayMs: number;

  constructor(baseURL: string = config.BASE_URL, defaultRetries = 2, defaultRetryDelayMs = 500) {
    this.defaultRetries = defaultRetries;
    this.defaultRetryDelayMs = defaultRetryDelayMs;

    this.client = axios.create({
      baseURL,
      timeout: config.TIMEOUT_MS,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request Interceptor
    this.client.interceptors.request.use(
      (requestConfig: InternalAxiosRequestConfig) => {
        (requestConfig as any).metadata = { startTime: Date.now() };

        const customOpts = requestConfig as RequestOptions;
        if (!customOpts.skipAuth) {
          const authHeaders = authManager.getHeaders(customOpts.authContext || 'default');
          Object.assign(requestConfig.headers, authHeaders);
        }

        logger.debug(`[HTTP OUT] ${requestConfig.method?.toUpperCase()} ${requestConfig.url}`, {
          baseURL: requestConfig.baseURL,
          params: requestConfig.params,
        });

        return requestConfig;
      },
      (error) => {
        logger.error('[HTTP REQUEST ERROR]', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response Interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const startTime = (response.config as any).metadata?.startTime || Date.now();
        const durationMs = Date.now() - startTime;
        (response as any).durationMs = durationMs;

        logger.debug(
          `[HTTP IN] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${durationMs}ms)`
        );

        return response;
      },
      (error: AxiosError) => {
        const startTime = (error.config as any)?.metadata?.startTime;
        const durationMs = startTime ? Date.now() - startTime : 0;

        if (error.response) {
          logger.warn(
            `[HTTP ERROR] ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url} (${durationMs}ms)`,
            { responseData: error.response.data }
          );
          throw new ApiError(
            `API call failed with status ${error.response.status}: ${JSON.stringify(error.response.data)}`,
            error.response.status,
            error.response.statusText,
            error.response.data,
            error.config || {}
          );
        } else if (error.request) {
          logger.error(`[HTTP NETWORK ERROR] No response received for ${error.config?.url}`, {
            message: error.message,
          });
          throw new ApiError(`Network error: ${error.message}`, 0, 'NETWORK_ERROR', null, error.config || {});
        } else {
          logger.error(`[HTTP CLIENT ERROR] ${error.message}`);
          throw error;
        }
      }
    );
  }

  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    retries: number,
    delayMs: number
  ): Promise<ApiResponse<T>> {
    let attempt = 0;
    while (true) {
      try {
        const response = await requestFn();
        return {
          status: response.status,
          data: response.data,
          headers: response.headers as Record<string, any>,
          durationMs: (response as any).durationMs || 0,
        };
      } catch (err: any) {
        attempt++;
        const isRetryable =
          err instanceof ApiError &&
          (err.status >= 500 || err.status === 429 || err.status === 0);

        if (attempt <= retries && isRetryable) {
          const backoff = delayMs * Math.pow(2, attempt - 1);
          logger.warn(`Retrying request (attempt ${attempt}/${retries}) in ${backoff}ms...`);
          await new Promise((res) => setTimeout(res, backoff));
          continue;
        }
        throw err;
      }
    }
  }

  public async get<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const retries = options.retries ?? this.defaultRetries;
    const delay = options.retryDelayMs ?? this.defaultRetryDelayMs;
    return this.executeWithRetry(() => this.client.get<T>(url, options), retries, delay);
  }

  public async post<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const retries = options.retries ?? 0; // default no retry on POST to avoid duplicate side effects unless configured
    const delay = options.retryDelayMs ?? this.defaultRetryDelayMs;
    return this.executeWithRetry(() => this.client.post<T>(url, data, options), retries, delay);
  }

  public async put<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const retries = options.retries ?? this.defaultRetries;
    const delay = options.retryDelayMs ?? this.defaultRetryDelayMs;
    return this.executeWithRetry(() => this.client.put<T>(url, data, options), retries, delay);
  }

  public async patch<T = any>(url: string, data?: any, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const retries = options.retries ?? this.defaultRetries;
    const delay = options.retryDelayMs ?? this.defaultRetryDelayMs;
    return this.executeWithRetry(() => this.client.patch<T>(url, data, options), retries, delay);
  }

  public async delete<T = any>(url: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const retries = options.retries ?? this.defaultRetries;
    const delay = options.retryDelayMs ?? this.defaultRetryDelayMs;
    return this.executeWithRetry(() => this.client.delete<T>(url, options), retries, delay);
  }

  public getRawAxios(): AxiosInstance {
    return this.client;
  }
}

export const defaultApiClient = new ApiClient();
