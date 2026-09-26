export interface OpenModelSpec {
  id: string;
  name: string;
  developer: string;
  russianHoursTrained: string;
  baseWerRussian: string;
  vanillaLatencyMs: number;
  turbochargedLatencyMs: number;
  speedupFactor: string;
  originalSizeMb: number;
  quantizedSizeMb: number;
  architectureType: 'CTC Non-Autoregressive' | 'Encoder-Decoder Transformer' | 'Streaming Transducer (RNN-T)';
  license: string;
  huggingFaceUrl: string;
  howToAccelerate: string[];
  selfLearningCapability: string;
  verdict: string;
}

export interface LearnedWordEntry {
  id: string;
  word: string;
  frequency: number;
  boostDb: number;
  contextTag: string;
  lastTrained: string;
  source: 'auto-recognized' | 'manual-addition' | 'error-correction';
  beforeCorrection?: string;
}

export const TOP_OPEN_RUSSIAN_MODELS: OpenModelSpec[] = [
  {
    id: 'gigaam-ctc',
    name: 'GigaAM-CTC v2 (SberDevices / SaluteSpeech)',
    developer: 'Sber AI Lab & SaluteSpeech Team',
    russianHoursTrained: '50 000+ часов аутентичной русской речи',
    baseWerRussian: '3.8% (Топ-1 на бенчмарках Golos и Russian Open Speech)',
    vanillaLatencyMs: 280,
    turbochargedLatencyMs: 45,
    speedupFactor: '6.2x ускорение',
    originalSizeMb: 920,
    quantizedSizeMb: 230,
    architectureType: 'CTC Non-Autoregressive',
    license: 'MIT / Apache 2.0 (Полный открытый доступ на Hugging Face)',
    huggingFaceUrl: 'salute-developers/GigaAM',
    howToAccelerate: [
      'Экспорт в ONNX Runtime с INT8 квантованием весов',
      'Замена классического Beam Search на CTC Greedy Search + легкая N-gram языковая модель KenLM',
      'Не требует авторегрессионного декодера: выдает все токены слова параллельно за один проход нейросети',
      'Инференс одного чанка занимает 15–30 мс на обычном 4-ядерном процессоре ноутбука'
    ],
    selfLearningCapability: 'Через подмешивание пользовательского N-граммного графа KenLM и динамический Bias-словарь на лету без дообучения весов.',
    verdict: 'Абсолютный лидер для русского языка. За счет архитектуры CTC не имеет галлюцинаций Whisper и разгоняется до сверхзвуковой скорости.'
  },
  {
    id: 'whisper-large-v3-turbo',
    name: 'Whisper Large-v3 Turbo (OpenAI + CTranslate2)',
    developer: 'OpenAI (оптимизация SYSTRAN & GGML)',
    russianHoursTrained: '1 000 000+ часов мультиязычных аудио (десятки тысяч часов русского)',
    baseWerRussian: '4.5%',
    vanillaLatencyMs: 1400,
    turbochargedLatencyMs: 180,
    speedupFactor: '7.7x ускорение',
    originalSizeMb: 3100,
    quantizedSizeMb: 780,
    architectureType: 'Encoder-Decoder Transformer',
    license: 'MIT',
    huggingFaceUrl: 'openai/whisper-large-v3-turbo',
    howToAccelerate: [
      'Конвертация весов в движок CTranslate2 с квантованием INT8/FP16',
      'Спекулятивное декодирование (Speculative Decoding): черновик токенов генерирует крошечный Whisper-tiny (15 мс), а Large-v3 Turbo валидирует их за один шаг энкодера',
      'Нарезка потока через Silero VAD на смысловые фразы по 2–4 секунды вместо ожидания 30-секундных спектрограмм',
      'FlashAttention-2 для ускорения внимания энкодера на AVX-512 или GPU'
    ],
    selfLearningCapability: 'Через динамический промптинг (Initial Prompt injection) и параллельный семантический рескорер.',
    verdict: 'Идеальное качество пунктуации и понимание редких терминов при разгоне через CTranslate2 до 180 мс.'
  },
  {
    id: 'streaming-zipformer-ru',
    name: 'Streaming Zipformer-ru (sherpa-onnx / k2-fsa)',
    developer: 'Next-gen Kaldi Core Team',
    russianHoursTrained: '20 000+ часов (корпуса Vosk, RuLibri, OpenSpeech)',
    baseWerRussian: '6.5%',
    vanillaLatencyMs: 160,
    turbochargedLatencyMs: 35,
    speedupFactor: '4.5x ускорение',
    originalSizeMb: 110,
    quantizedSizeMb: 42,
    architectureType: 'Streaming Transducer (RNN-T)',
    license: 'Apache 2.0',
    huggingFaceUrl: 'csukuangfj/sherpa-onnx-streaming-zipformer-ru',
    howToAccelerate: [
      'Уже аппаратно оптимизирован для микро-квантов 100-160 мс',
      'Квантование в INT8 (вес всей модели на диске всего 42 МБ)',
      'Инференс одного кванта в 8-15 миллисекунд',
      'Прямая интеграция в C/C++/Rust без тяжелых питоновских зависимостей'
    ],
    selfLearningCapability: 'Прямая поддержка Hotwords-графа и весов контекстного смещения (FST Biasing).',
    verdict: 'Самый легкий и быстрый автономный движок для мгновенного появления букв под курсором.'
  }
];

export const INITIAL_LEARNED_LEXICON: LearnedWordEntry[] = [
  {
    id: '1',
    word: 'Ема',
    frequency: 18,
    boostDb: 9.5,
    contextTag: 'Разговорный сленг',
    lastTrained: 'Только что',
    source: 'error-correction',
    beforeCorrection: 'высад / ева'
  },
  {
    id: '2',
    word: 'быстро',
    frequency: 64,
    boostDb: 15.0,
    contextTag: 'Анти-путаница фонем',
    lastTrained: 'Только что',
    source: 'error-correction',
    beforeCorrection: 'высад / высат / бстро'
  },
  {
    id: '3',
    word: 'pull request',
    frequency: 27,
    boostDb: 11.0,
    contextTag: 'IT / Git',
    lastTrained: '12 мин назад',
    source: 'error-correction',
    beforeCorrection: 'пол реквест'
  },
  {
    id: '4',
    word: 'backend',
    frequency: 31,
    boostDb: 10.5,
    contextTag: 'Архитектура',
    lastTrained: '1 час назад',
    source: 'auto-recognized'
  },
  {
    id: '5',
    word: 'JSON',
    frequency: 19,
    boostDb: 9.0,
    contextTag: 'Формат данных',
    lastTrained: 'Вчера',
    source: 'error-correction',
    beforeCorrection: 'джейсон'
  }
];
