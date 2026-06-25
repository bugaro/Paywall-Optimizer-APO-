import { logger } from '../lib/logger';
import { ApiError, ValidationError } from './errors';

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function fetchClient(url: string, init?: RequestInit): Promise<any> {
  const correlationId = (init?.headers as Record<string, string>)?.[
    'X-Correlation-ID'
  ] || generateUUID();

  const headers = new Headers(init?.headers);
  if (!headers.has('X-Correlation-ID')) {
    headers.set('X-Correlation-ID', correlationId);
  }
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const signal = controller.signal;

  // Link external signal if provided
  if (init?.signal) {
    init.signal.addEventListener('abort', () => controller.abort());
  }

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  const startTime = performance.now();

  try {
    const response = await fetch(url, {
      ...init,
      headers,
      signal,
    });

    clearTimeout(timeoutId);

    const duration = performance.now() - startTime;
    const contentType = response.headers.get('Content-Type') || '';
    const isHtml = contentType.includes('text/html');

    if (!response.ok) {
      logger.error(`[API Request] FAILURE: ${url}`, {
        url,
        status: response.status,
        correlationId,
      });

      let errMsg: string;
      if (isHtml) {
        errMsg = `Backend service unavailable (HTTP ${response.status}). Please try again later.`;
      } else if (response.status === 400) {
        try {
          const body = await response.json();
          errMsg = body.error || 'Bad Request';
        } catch {
          errMsg = 'Bad Request';
        }
      } else if (response.status === 502 || response.status === 503) {
        errMsg = `Telemetry analytics service is not responding (HTTP ${response.status}). The service may be restarting.`;
      } else {
        errMsg = `Request failed with status ${response.status}`;
      }

      if (response.status === 400) {
        throw new ValidationError(errMsg);
      }
      throw new ApiError(errMsg, response.status);
    }

    logger.info(`[API Request] SUCCESS: ${url}`, {
      url,
      status: response.status,
      correlationId,
      duration,
    });

    if (response.status === 204) {
      return null;
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    if (isHtml) {
      throw new ApiError(`Unexpected HTML response from API. The backend service may be unavailable.`, response.status);
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ApiError('Request timed out after 5000ms');
    }

    if (error instanceof ValidationError || error instanceof ApiError) {
      throw error;
    }

    logger.error(`[API Request] FAILURE: ${url}`, {
      url,
      status: 0,
      correlationId,
    });

    throw new ApiError(error instanceof Error ? error.message : String(error));
  }
}
