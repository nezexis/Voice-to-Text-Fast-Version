export interface CaseStudyStep {
  stage: string;
  rawBehavior: string;
  optimizedBehavior: string;
  explanation: string;
  improvementGain: string;
}

export interface BilingualTerm {
  category: 'Dev / IT' | 'Slang / Conversational' | 'Mixed Alphabet';
  spokenPhrase: string;
  naiveRecognition: string;
  enhancedRecognition: string;
  reasonForConfusion: string;
  solutionApplied: string;
}

export const CLARITY_CASE_STUDY: CaseStudyStep[] = [
  {
    stage: '1. Захват звука и спектральный срез (Акустический DSP)',
    rawBehavior: '«Ема» сказано быстро, на вдохе. Низкочастотный гул микрофона (до 100 Гц) размывает взрывной согласный [б] в слове «быстро».',
    optimizedBehavior: 'Фильтр High-Pass (85 Гц) срезает бубнение, Pre-emphasis (+5 дБ на 2.5–5 кГц) выделяет форманты согласных [б], [с], [т], [р].',
    explanation: 'Без фильтрации взрывной согласный [б] acoustically маскируется и декодер воспринимает его как мягкий/щелевой [в].',
    improvementGain: '+35% четкость согласных'
  },
  {
    stage: '2. Токенизация и словарная вероятность (Language Model Prior)',
    rawBehavior: 'Слово «ема» отсутствует в стандартном N-граммном словаре как официальное слово. Вектор истории сбивается, вероятность P(быстро | ема ты) падает до нуля.',
    optimizedBehavior: 'Разговорный лексикон с поддержкой междометий («ема», «емае», «блин») + динамическое контекстное смещение (Context Biasing).',
    explanation: 'Когда языковая модель не находит «ема ты», Beam Search переходит в режим аварийного акустического поиска, выбирая случайное созвучное слово «высад».',
    improvementGain: 'Исключение тупика языковой модели'
  },
  {
    stage: '3. Потоковый декодер (1-й проход: Fast Streaming)',
    rawBehavior: 'Декодирует с минимальной задержкой, но без учета будущего контекста «печатаешь».',
    optimizedBehavior: 'Генерирует N-best список гипотез (Top-3): 1. «высад» (акустическая), 2. «быстро» (фонетическая), 3. «выход». Передает в быстрый рескорер.',
    explanation: 'Однопроходный жадный декодер фиксирует первую гипотезу без возможности исправить ее соседними словами.',
    improvementGain: 'Сохранение кандидатов для 2-го прохода'
  },
  {
    stage: '4. Контекстный рескорер (2-й проход: Rescoring / Micro-LM)',
    rawBehavior: 'Финальный текст выдается без проверки семантической сочетаемости.',
    optimizedBehavior: 'Рескорер оценивает биграмму «[X] печатаешь». Сочетаемость «быстро печатаешь» в 840 раз вероятнее «высад печатаешь». Акустический штраф перекрывается семантикой за 20 мс.',
    explanation: '«Высад печатаешь» семантически невозможно в русском языке. Рескорер мгновенно исправляет фразу до того, как пользователь успеет заметить ошибку.',
    improvementGain: '100% устранение смысловых искажений'
  },
  {
    stage: '5. Автоматическая пунктуация и нормализация',
    rawBehavior: '«ема ты высад печатаешь» (нижний регистр, отсутствие пауз и запятых).',
    optimizedBehavior: '«Ема, ты быстро печатаешь!» (выделение междометия запятой, заглавная буква, восклицательный знак по интонации).',
    explanation: 'Нейросетевой пунктуатор восстанавливает структуру предложения по просодике и паузам.',
    improvementGain: 'Готовый литературный текст'
  }
];

export const BILINGUAL_EXAMPLES: BilingualTerm[] = [
  {
    category: 'Slang / Conversational',
    spokenPhrase: 'Ема ты быстро печатаешь',
    naiveRecognition: 'ема ты высад печатаешь',
    enhancedRecognition: 'Ема, ты быстро печатаешь!',
    reasonForConfusion: 'Акустическое слияние [б/в] + [стр/сад] из-за отсутствия триграммы «ема ты» в книжном словаре.',
    solutionApplied: 'Разговорный лексикон междометий + семантический рескорер глагольных связок.'
  },
  {
    category: 'Dev / IT',
    spokenPhrase: 'Сделай pull request и запушь в dev',
    naiveRecognition: 'сделай пол реквест и за пуш в дев',
    enhancedRecognition: 'Сделай pull request и запушь в dev',
    reasonForConfusion: 'Одноязычная модель пытается фонетически транслитерировать английские термины русскими буквами.',
    solutionApplied: 'Двуязычный BPE токенизатор + Hotwords словарь (pull request, commit, dev, deploy, api).'
  },
  {
    category: 'Mixed Alphabet',
    spokenPhrase: 'Отправь JSON через post запрос на backend',
    naiveRecognition: 'отправь джейсон через пост запрос на бэкенд',
    enhancedRecognition: 'Отправь JSON через POST-запрос на backend',
    reasonForConfusion: 'Аббревиатуры и методы HTTP (JSON, POST, GET) распознаются как нарицательные имена.',
    solutionApplied: 'IT-нормализатор акронимов и протоколов на базе контекста разработки.'
  },
  {
    category: 'Dev / IT',
    spokenPhrase: 'Проверь UI в браузере Safari',
    naiveRecognition: 'проверь юай в браузере сафари',
    enhancedRecognition: 'Проверь UI в браузере Safari',
    reasonForConfusion: 'Фонетическая каша из отдельных букв «U-I» и названия бренда «Safari».',
    solutionApplied: 'Автоматическое определение языка (LID) на уровне подслов без переключения режима.'
  },
  {
    category: 'Slang / Conversational',
    spokenPhrase: 'Короче залей фичу на прод',
    naiveRecognition: 'короче за лейфи чуна прот',
    enhancedRecognition: 'Короче, залей фичу на прод',
    reasonForConfusion: 'Слитное произношение («залейфичу») разбивается на ошибочные псевдослова.',
    solutionApplied: 'Специальный сленговый словарь терминов русскоязычной IT-разработки.'
  }
];
