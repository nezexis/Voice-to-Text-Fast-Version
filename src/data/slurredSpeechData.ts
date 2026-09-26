export interface SlurredSpeechExample {
  id: string;
  mumbledSpoken: string;
  mumbledPhonetics: string;
  naiveAsrOutput: string;
  robustDecoderOutput: string;
  acousticsConfidence: number; // e.g. 42% (muffled/slurred)
  semanticConfidence: number; // e.g. 98% (recovered by context)
  appliedMechanism: string;
  explanation: string;
}

export interface SlurDecodingPillar {
  title: string;
  tag: string;
  shortDesc: string;
  howItWorks: string;
  impactMetric: string;
}

export const SLURRED_SPEECH_EXAMPLES: SlurredSpeechExample[] = [
  {
    id: 'mumble-0',
    mumbledSpoken: 'быстро',
    mumbledPhonetics: '[ˈbɨstrə] ↔ [ˈvɨsət]',
    naiveAsrOutput: 'высад',
    robustDecoderOutput: 'быстро',
    acousticsConfidence: 32,
    semanticConfidence: 99,
    appliedMechanism: '🎯 Прямое разделение акустических пар [б/в] + восстановление кластера [стр]',
    explanation: 'Одиночное слово «быстро» без окружающего контекста. Стандартный ASR часто выдает псевдослово «высад», потому что при слабом взрыве [б] звучит как щелевой [в], а [стр] редуцируется в [сад]. Наш рескорер и DSP-фильтр гарантируют выбор «быстро».'
  },
  {
    id: 'mumble-1',
    mumbledSpoken: 'ема ты бстро печатаешь',
    mumbledPhonetics: '[jɪˈma tɨ ˈbstrə pʲɪˈt͡ɕatəjɪʃ]',
    naiveAsrOutput: 'ема ты высад печатаешь',
    robustDecoderOutput: 'Ема, ты быстро печатаешь!',
    acousticsConfidence: 38,
    semanticConfidence: 99,
    appliedMechanism: 'Контекстное маскированное восстановление (Contextual Infilling) + Фонетический Russian Metaphone',
    explanation: 'Звук [стр] скомкан, [б] проглочен. Акустическая модель сомневается (38%), но контекст глагола «печатаешь» мгновенно восстанавливает пропущенные фонемы в слово «быстро».'
  },
  {
    id: 'mumble-2',
    mumbledSpoken: 'щас быренько гляну че там',
    mumbledPhonetics: '[ɕːas ˈbɨrʲɪnkə ˈɡlʲanʊ t͡ɕe tam]',
    naiveAsrOutput: 'ща сберенька гляну чё там',
    robustDecoderOutput: 'Сейчас быстренько гляну, что там',
    acousticsConfidence: 45,
    semanticConfidence: 96,
    appliedMechanism: 'Словарь разговорных редукций (Colloquial Reduction Mapper) + n-граммные связки',
    explanation: 'Редуцированные формы «щас» [сейчас], «быренько» [быстренько] и «че» [что] автоматически разворачиваются в правильную литературную норму с сохранением скорости речи.'
  },
  {
    id: 'mumble-3',
    mumbledSpoken: 'здрасьте скока стоит деплой',
    mumbledPhonetics: '[ˈzdrastʲɪ ˈskokə ˈstoɪt dʲɪˈploj]',
    naiveAsrOutput: 'здрасти с кока стоит теплой',
    robustDecoderOutput: 'Здравствуйте, сколько стоит deploy',
    acousticsConfidence: 52,
    semanticConfidence: 97,
    appliedMechanism: 'Двуязычный IT-лексикон + Снятие фонетической омонимии («деплой» vs «теплой»)',
    explanation: 'Проглоченные слоги «здравствуйте» и «сколько» восстанавливаются графом переходов, а IT-термин deploy защищен от подмены на «теплой».'
  },
  {
    id: 'mumble-4',
    mumbledSpoken: 'короче ваще не понял че делать',
    mumbledPhonetics: '[kɐˈrot͡ɕɪ vɐˈɕːe nʲɪ ˈponʲɪl t͡ɕe ˈdʲelətʲ]',
    naiveAsrOutput: 'короче в вообще не понял чо делать',
    robustDecoderOutput: 'Короче, вообще не понял, что делать',
    acousticsConfidence: 48,
    semanticConfidence: 98,
    appliedMechanism: 'Нормализатор разговорного сленга + авто-пунктуация пауз',
    explanation: 'Быстрое слитное «ваще» преобразуется в «вообще», междометие «короче» обособляется запятой.'
  },
  {
    id: 'mumble-5',
    mumbledSpoken: 'скинь пжлста доку по апишке в телегу',
    mumbledPhonetics: '[skʲinʲ pʐʊstə ˈdokʊ pə ɐˈpʲiʂkʲɪ f tʲɪˈlʲeɡʊ]',
    naiveAsrOutput: 'скинь пуста току папе шкив телегу',
    robustDecoderOutput: 'Скинь, пожалуйста, доку по API в Telegram',
    acousticsConfidence: 34,
    semanticConfidence: 95,
    appliedMechanism: 'Адаптивный расширенный луч (Adaptive Beam Expansion) + контекст разработчика',
    explanation: 'Нечетко прошептанное «пжлста» и сленговые «апишке/телегу» без контекста превращаются в бессмысленный набор «папе шкив», но контекстный семантический слой решает задачу безошибочно.'
  }
];

export const SLUR_DECODING_PILLARS: SlurDecodingPillar[] = [
  {
    title: '1. Контекстное маскированное восстановление (Context Infilling)',
    tag: 'ML-Архитектура',
    shortDesc: 'Нейросеть достраивает проглоченные звуки по смыслу предложения, как человеческий мозг.',
    howItWorks: 'Если человек невнятно промычал слог, акустическая уверенность падает ниже 0.5. Система помечает этот участок как [MASK] и активирует языковую модель, которая оценивает окружающие слова и вычисляет единственно возможный вариант.',
    impactMetric: '+42% точности на невнятной речи'
  },
  {
    title: '2. Фонетическое нечеткое сопоставление (Fuzzy Phonetic Matching)',
    tag: 'Акустический поиск',
    shortDesc: 'Сравнение не по буквам, а по артикуляционным фонетическим группам.',
    howItWorks: 'Звуки группируются по акустическим классам (губные [б/в/п], зубные [д/т], свистящие [с/з/ц]). Если звук [б] слит со звуком [в], алгоритм проверяет все созвучные слова из словаря с минимальным фонетическим расстоянием.',
    impactMetric: 'Исключает оговорки [высад -> быстро]'
  },
  {
    title: '3. Адаптивное расширение луча поиска (Adaptive Beam Expansion)',
    tag: 'Алгоритм декодирования',
    shortDesc: 'Автоматическое углубление поиска при падении громкости или четкости звука.',
    howItWorks: 'При четкой речи ширина луча поиска равна 3–5 (для максимальной скорости 30 мс). Если сигнал слабый, смазанный или невнятный, ширина луча динамически расширяется до 15–20 кандидатов, предотвращая потерю правильного слова.',
    impactMetric: 'Нулевая потеря редких слов'
  },
  {
    title: '4. Словарь разговорных редукций (Colloquial Reductions)',
    tag: 'Языковая нормализация',
    shortDesc: 'Встроенное понимание того, как русские люди реально сокращают слова при быстрой речи.',
    howItWorks: 'Прямой словарь правил и n-грамм для редуцированных форм: «ща/щас» -> «сейчас», «здрасьте» -> «здравствуйте», «че/чо» -> «что», «ток» -> «только», «ваще» -> «вообще», «скока» -> «сколько».',
    impactMetric: 'Идеальный литературный текст'
  }
];
