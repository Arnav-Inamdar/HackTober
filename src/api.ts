import type {
  EvaluationResponse,
  GenerateRequest,
  GenerateResponse,
  HealthResponse,
  IngestResponse,
  ModelsResponse,
} from './types';

async function request<T>(path: string, init?: RequestInit, timeoutMs = 180_000): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, {
      ...init,
      signal: controller.signal,
      headers: init?.body instanceof FormData
        ? init.headers
        : { 'Content-Type': 'application/json', ...init?.headers },
    });
    const payload = await response.json().catch(() => null) as { detail?: unknown; message?: string } | null;
    if (!response.ok) {
      const detail = payload?.detail;
      const readableDetail = typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail.map((item: unknown) => typeof item === 'object' && item !== null && 'message' in item ? String(item.message) : 'Invalid request').join(' · ')
          : undefined;
      throw new Error(readableDetail || payload?.message || `Request failed (${response.status}).`);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('AVIA is taking longer than expected. You can retry, or try fewer questions/a smaller model.');
    }
    if (error instanceof TypeError) {
      throw new Error('AVIA could not reach its local service. Make sure the FastAPI backend is running.');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export const api = {
  health: () => request<HealthResponse>('/api/health', undefined, 8_000),
  models: () => request<ModelsResponse>('/api/models', undefined, 8_000),
  ingest: (files: File[], model: string) => {
    const body = new FormData();
    files.forEach((file) => body.append('files', file));
    if (model) body.append('model', model);
    return request<IngestResponse>('/api/content/ingest', { method: 'POST', body }, 180_000);
  },
  generate: (input: GenerateRequest) => request<GenerateResponse>('/api/quiz/generate', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  evaluate: (quizId: string, questionId: string, answer: string) => request<EvaluationResponse>('/api/quiz/evaluate', {
    method: 'POST',
    body: JSON.stringify({ quiz_id: quizId, question_id: questionId, answer }),
  }),
};
