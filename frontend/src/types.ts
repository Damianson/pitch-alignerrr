export interface WordTiming {
  text: string;
  score?: number | null;
  reference_start_ms: number | null;
  reference_duration_ms: number | null;
  learner_start_ms: number | null;
  learner_duration_ms: number | null;
  duration_difference_ms: number | null;
  start_difference_ms: number | null;
}

export interface PitchData {
  axis: number[];
  reference: (number | null)[];
  learner: (number | null)[];
}

export interface ComparisonResult {
  sentence: string;
  reference_duration_ms: number;
  learner_duration_ms: number;
  duration_difference_ms: number;
  words: WordTiming[];
  pitch: PitchData;
  warnings?: string[];
}

export type HealthStatus = 'checking' | 'online' | 'offline';

