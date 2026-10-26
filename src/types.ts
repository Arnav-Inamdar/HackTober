export type RoleName = 'professor' | 'strict_examiner' | 'friendly_tutor' | 'interviewer' | 'coding_mentor' | 'custom';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type QuestionStyle = 'multiple_choice' | 'short_answer' | 'mixed';
export type QuestionType = 'multiple_choice' | 'short_answer';
export type AnswerStatus = 'correct' | 'partially_correct' | 'incorrect';
export type SourceMode = 'live_topic' | 'my_material';
export type QuestionCount = 5 | 10 | 15 | 20 | 30;

export interface RoleOption {
  id: RoleName;
  name: string;
  descriptor: string;
  voice: string;
  icon: string;
}

export interface HealthResponse {
  app: 'ok';
  ollama_connected: boolean;
  model_count: number;
  message?: string | null;
}

export interface ModelInfo {
  name: string;
  size?: number | null;
  modified_at?: string | null;
}

export interface ModelsResponse {
  connected: boolean;
  models: ModelInfo[];
  message?: string | null;
}

export interface IngestFileResult {
  name: string;
  size: number;
  status: 'success' | 'error';
  content: string;
  message?: string | null;
}

export interface IngestResponse {
  files: IngestFileResult[];
  content: string;
  warning?: string | null;
}

export interface PublicQuestion {
  question_id: string;
  question: string;
  type: QuestionType;
  options: string[];
  topic: string;
  difficulty: Difficulty;
}

export interface GenerateResponse {
  quiz_id: string;
  model: string;
  questions: PublicQuestion[];
  warning?: string | null;
  sources: SourceCitation[];
}

export interface SourceCitation {
  title: string;
  url: string;
}

export interface GenerateRequest {
  material: string;
  topic: string;
  source_mode: SourceMode;
  role: RoleName;
  custom_role: string;
  difficulty: Difficulty;
  count: QuestionCount;
  style: QuestionStyle;
  extra_instructions: string;
  model: string;
}

export interface EvaluationResponse {
  quiz_id: string;
  question_id: string;
  status: AnswerStatus;
  feedback: string;
  expected_answer: string;
  explanation: string;
}
