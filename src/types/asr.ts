export interface ASREngine {
  id: string;
  name: string;
  category: 'local-streaming' | 'local-kaldi' | 'local-whisper' | 'os-native' | 'cloud-streaming';
  categoryLabel: string;
  principle: string;
  speedRating: 'Ultra-fast (<150ms)' | 'Fast (150-300ms)' | 'Moderate (300-600ms)' | 'High Latency (>800ms)';
  firstTokenLatencyMs: number;
  finalSentenceLatencyMs: number;
  werRussianEstimate: string;
  russianQualityNotes: string;
  localOffline: boolean;
  streamingNative: boolean;
  resourceRequirements: {
    ram: string;
    cpu: string;
    gpuOptional: boolean;
    modelDiskSize: string;
  };
  license: string;
  maturityScore: number; // 1-10
  maintenanceStatus: 'Active (2025-2026)' | 'Stable/Maintenance' | 'Legacy';
  integrationComplexity: 'Low' | 'Medium' | 'High';
  bestFor: string;
  limitations: string[];
  officialRepoOrSource: string;
}

export interface LatencyStage {
  id: string;
  name: string;
  category: 'audio' | 'vad' | 'network' | 'inference' | 'postproc' | 'ui';
  baseMs: number;
  description: string;
  optimizationTechnique: string;
  canBeEliminated: boolean;
}
