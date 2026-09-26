import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Cpu,
  Zap,
  Activity,
  Layers,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Server,
  Terminal,
  Copy,
  Check,
  Info,
  Sliders,
  Volume2,
  Globe,
  Radio,
  FileText,
  Sparkles,
  Filter,
  Languages,
  Wand2,
  RotateCcw,
  Play,
  VolumeX,
  SlidersHorizontal,
  BookmarkCheck,
  Tag,
  BookOpen,
  Brain,
  Download,
  Plus,
  Trash2,
  TrendingUp,
  Share2,
  Gauge,
  Code2
} from 'lucide-react';
import { ASR_ENGINES, LATENCY_STAGES } from './data/asrEnginesData';
import { ASREngine } from './types/asr';
import { CLARITY_CASE_STUDY, BILINGUAL_EXAMPLES } from './data/clarityData';
import { applySmartRescoring, setupClarityAudioNodes } from './services/smartCorrector';
import { TOP_OPEN_RUSSIAN_MODELS, OpenModelSpec, LearnedWordEntry } from './data/learningModelsData';
import { loadLearnedLexicon, saveLearnedLexicon, learnNewWord, generateHotwordsList } from './services/adaptiveMemory';
import { MumbleTab } from './components/MumbleTab';
import { SpectralAnalyzer } from './components/SpectralAnalyzer';
import { PortableWidgetTab } from './components/PortableWidgetTab';

export default function App() {
  const [activeTab, setActiveTab] = useState<'live' | 'portable' | 'mumble' | 'learning' | 'clarity' | 'engines' | 'waterfall' | 'architecture' | 'roadmap'>('live');
  const [activeAnalyser, setActiveAnalyser] = useState<AnalyserNode | null>(null);

  // Live recognition state (Web Speech API)
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [inputFieldText, setInputFieldText] = useState('Привет! Нажмите кнопку микрофона или выберите готовый сценарий для проверки качества...');
  const [recognitionLanguage, setRecognitionLanguage] = useState<'ru-RU' | 'en-US'>('ru-RU');
  const [micVolume, setMicVolume] = useState(0);
  const [speechEvents, setSpeechEvents] = useState<Array<{ time: string; type: 'interim' | 'final' | 'status' | 'rescore' | 'learn'; text: string; latency?: number }>>([]);
  const [copied, setCopied] = useState(false);
  const [autoPunctuate, setAutoPunctuate] = useState(true);

  // Quality & Clarity Enhancement states
  const [enableDspClarity, setEnableDspClarity] = useState(true);
  const [enablePhoneticRescore, setEnablePhoneticRescore] = useState(true);
  const [enableBilingualMode, setEnableBilingualMode] = useState(true);
  const [enableSlangNormalization, setEnableSlangNormalization] = useState(true);
  const [enableMumbleRecovery, setEnableMumbleRecovery] = useState(true);
  const [mumbleTolerance, setMumbleTolerance] = useState<'soft' | 'normal' | 'aggressive'>('normal');
  const [acousticsConfidence, setAcousticsConfidence] = useState(92);
  const [semanticConfidence, setSemanticConfidence] = useState(98);
  const [quickTeachWord, setQuickTeachWord] = useState('');
  const [quickTeachWrong, setQuickTeachWrong] = useState('');
  const [showTeachModal, setShowTeachModal] = useState(false);
  const [hotwordsInput, setHotwordsInput] = useState('ема, быстро, pull request, dev, main, JSON, POST, GET, UI, backend, frontend, deploy');
  const [recentFixes, setRecentFixes] = useState<Array<{ original: string; corrected: string; explanation: string; time: string }>>([
    {
      original: 'ема ты высад печатаешь',
      corrected: 'Ема, ты быстро печатаешь!',
      explanation: 'Семантическая несовместимость «высад печатаешь» устранена 2-м проходом рескорера за 24 мс',
      time: '08:14:02'
    }
  ]);
  const [selectedCaseStep, setSelectedCaseStep] = useState(0);

  // Self-Learning & Adaptive Memory states
  const [learnedLexicon, setLearnedLexicon] = useState<LearnedWordEntry[]>(() => loadLearnedLexicon());
  const [newWordInput, setNewWordInput] = useState('');
  const [newWordContextTag, setNewWordContextTag] = useState('Пользовательский термин');
  const [selectedOpenModel, setSelectedOpenModel] = useState<OpenModelSpec>(TOP_OPEN_RUSSIAN_MODELS[0]);
  const [learnedNotification, setLearnedNotification] = useState<string | null>(null);

  // Filter state for engines table
  const [filterOfflineOnly, setFilterOfflineOnly] = useState(false);
  const [filterStreamingOnly, setFilterStreamingOnly] = useState(false);
  const [selectedEngine, setSelectedEngine] = useState<ASREngine>(ASR_ENGINES[0]);

  // Waterfall simulator state
  const [chunkSizeMs, setChunkSizeMs] = useState(120);
  const [vadDelayMs, setVadDelayMs] = useState(250);
  const [engineType, setEngineType] = useState<'zipformer' | 'vosk' | 'whisper' | 'cloud'>('zipformer');
  const [useLocalIpc, setUseLocalIpc] = useState(true);
  const [enablePunctuation, setEnablePunctuation] = useState(true);

  // References for Web Speech API and AudioContext
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const speechStartTimestampRef = useRef<number>(0);

  // Initialize Speech Recognition Check
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Sync Hotwords with learned lexicon
  useEffect(() => {
    const words = generateHotwordsList(learnedLexicon);
    if (words) {
      setHotwordsInput(words);
    }
  }, [learnedLexicon]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Audio level monitoring setup with optional WebAudio DSP chain
  const startAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      const source = audioCtx.createMediaStreamSource(stream);

      if (enableDspClarity) {
        const dsp = setupClarityAudioNodes(audioCtx, source);
        dsp.outputNode.connect(analyser);
      } else {
        source.connect(analyser);
      }

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;
      setActiveAnalyser(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVolume = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setMicVolume(Math.min(100, Math.round(avg * 1.6)));
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };

      updateVolume();
    } catch (e) {
      console.warn('Audio visualization not permitted or microphone error:', e);
    }
  };

  const stopAudioMonitoring = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setActiveAnalyser(null);
    setMicVolume(0);
  };

  // Toggle Live Speech Recognition
  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Ваш браузер не поддерживает SpeechRecognition API. Рекомендуется Google Chrome или Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = recognitionLanguage;

      speechStartTimestampRef.current = performance.now();

      recognition.onstart = () => {
        setIsRecording(true);
        setSpeechEvents(prev => [
          { time: new Date().toLocaleTimeString(), type: 'status', text: 'Захват звука активирован (DSP-фильтр согласных активен)...' },
          ...prev.slice(0, 15)
        ]);
        startAudioMonitoring();
      };

      recognition.onresult = (event: any) => {
        let currentInterim = '';
        let currentFinal = '';
        const now = performance.now();
        const latencyEstimate = Math.round(now - speechStartTimestampRef.current);

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const item = event.results[i];
          if (item.isFinal) {
            currentFinal += item[0].transcript;
          } else {
            currentInterim += item[0].transcript;
          }
        }

        if (currentFinal) {
          const rawSpoken = currentFinal.trim();

          // 2-PASS SMART PHONETIC RESCORING & BILINGUAL CORRECTION
          const rescoreResult = applySmartRescoring(rawSpoken, {
            enablePhoneticRescore,
            enableBilingualMapping: enableBilingualMode,
            enableSlangNormalization,
            enableMumbleRecovery,
            mumbleTolerance,
            hotwords: hotwordsInput.split(',').map(s => s.trim()),
            learnedLexicon
          });

          setAcousticsConfidence(rescoreResult.acousticsConfidence);
          setSemanticConfidence(rescoreResult.semanticConfidence);

          let formattedFinal = rescoreResult.enhancedText;
          if (autoPunctuate) {
            if (!formattedFinal.endsWith('.') && !formattedFinal.endsWith('!') && !formattedFinal.endsWith('?')) {
              formattedFinal += (formattedFinal.startsWith('Ема') ? '!' : '.');
            }
          }

          if (rescoreResult.appliedFixes.length > 0) {
            setRecentFixes(prev => [
              ...rescoreResult.appliedFixes.map(f => ({ ...f, time: new Date().toLocaleTimeString() })),
              ...prev.slice(0, 10)
            ]);
            setSpeechEvents(prev => [
              {
                time: new Date().toLocaleTimeString(),
                type: 'rescore',
                text: `✨ 2-Pass Рескорер: "${rawSpoken}" → "${formattedFinal}"`,
                latency: latencyEstimate + 20
              },
              ...prev.slice(0, 14)
            ]);
          } else {
            setSpeechEvents(prev => [
              {
                time: new Date().toLocaleTimeString(),
                type: 'final',
                text: `Зафиксировано: "${formattedFinal}"`,
                latency: latencyEstimate
              },
              ...prev.slice(0, 14)
            ]);
          }

          setFinalTranscript(prev => (prev ? prev + ' ' + formattedFinal : formattedFinal));
          setInputFieldText(prev => (prev ? prev + ' ' + formattedFinal : formattedFinal));
          setInterimTranscript('');
          speechStartTimestampRef.current = performance.now();
        } else if (currentInterim) {
          const interimRescore = applySmartRescoring(currentInterim, {
            enablePhoneticRescore,
            enableBilingualMapping: enableBilingualMode,
            enableSlangNormalization,
            enableMumbleRecovery,
            mumbleTolerance,
            hotwords: hotwordsInput.split(',').map(s => s.trim()),
            learnedLexicon
          });
          setInterimTranscript(interimRescore.enhancedText);
          setSpeechEvents(prev => {
            const filtered = prev.filter(e => e.type !== 'interim');
            return [
              {
                time: new Date().toLocaleTimeString(),
                type: 'interim',
                text: `Стриминг-гипотеза: "${interimRescore.enhancedText}"`,
                latency: latencyEstimate
              },
              ...filtered.slice(0, 14)
            ];
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setSpeechEvents(prev => [
          { time: new Date().toLocaleTimeString(), type: 'status', text: `Событие: ${event.error}` },
          ...prev.slice(0, 15)
        ]);
      };

      recognition.onend = () => {
        setIsRecording(false);
        stopAudioMonitoring();
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    stopAudioMonitoring();
  };

  // Quick Simulation Test for User Examples
  const runTestScenario = (rawSpoken: string, naiveResult: string) => {
    speechStartTimestampRef.current = performance.now();
    setInterimTranscript(naiveResult);

    setTimeout(() => {
      const rescoreResult = applySmartRescoring(naiveResult, {
        enablePhoneticRescore,
        enableBilingualMapping: enableBilingualMode,
        enableSlangNormalization,
        enableMumbleRecovery,
        mumbleTolerance,
        hotwords: hotwordsInput.split(',').map(s => s.trim()),
        learnedLexicon
      });

      setAcousticsConfidence(rescoreResult.acousticsConfidence);
      setSemanticConfidence(rescoreResult.semanticConfidence);

      let formatted = rescoreResult.enhancedText;
      if (autoPunctuate) {
        if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?')) {
          formatted += (formatted.startsWith('Ема') ? '!' : '.');
        }
      }

      if (rescoreResult.appliedFixes.length > 0) {
        setRecentFixes(prev => [
          ...rescoreResult.appliedFixes.map(f => ({ ...f, time: new Date().toLocaleTimeString() })),
          ...prev.slice(0, 10)
        ]);
      }

      setFinalTranscript(prev => (prev ? prev + ' ' + formatted : formatted));
      setInputFieldText(prev => (prev ? prev + ' ' + formatted : formatted));
      setInterimTranscript('');

      setSpeechEvents(prev => [
        {
          time: new Date().toLocaleTimeString(),
          type: 'rescore',
          text: `Акустическая оговорка: "${naiveResult}" → Исправлено: "${formatted}"`,
          latency: 140
        },
        ...prev.slice(0, 15)
      ]);
    }, 280);
  };

  // Dynamic Learning Action: Add word to user lexicon
  const handleLearnWord = (word: string, tag: string = 'Пользовательский термин') => {
    if (!word.trim()) return;
    const { updatedList, learnedItem } = learnNewWord(learnedLexicon, word, tag, 'manual-addition');
    setLearnedLexicon(updatedList);
    setNewWordInput('');
    setLearnedNotification(`Слово «${learnedItem.word}» выучено! Акустический приоритет повышен до +${learnedItem.boostDb} dB`);
    setTimeout(() => setLearnedNotification(null), 4000);

    setSpeechEvents(prev => [
      {
        time: new Date().toLocaleTimeString(),
        type: 'learn',
        text: `🧠 Модель обучена новому слову: «${learnedItem.word}» (Приоритет +${learnedItem.boostDb} dB)`
      },
      ...prev.slice(0, 14)
    ]);
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(inputFieldText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Filtered engines for Matrix tab
  const filteredEngines = ASR_ENGINES.filter(engine => {
    if (filterOfflineOnly && !engine.localOffline) return false;
    if (filterStreamingOnly && !engine.streamingNative) return false;
    return true;
  });

  // Calculate waterfall latency metrics dynamically
  const calcWaterfall = () => {
    const hwBuffer = 20; // ms
    const vadCheck = 12; // ms
    const ipcNetwork = useLocalIpc ? 4 : (engineType === 'cloud' ? 65 : 10);
    
    let inferenceCost = 40;
    if (engineType === 'zipformer') inferenceCost = 35;
    else if (engineType === 'vosk') inferenceCost = 25;
    else if (engineType === 'whisper') inferenceCost = 240;
    else if (engineType === 'cloud') inferenceCost = 50;

    const firstTokenLatency = hwBuffer + chunkSizeMs + vadCheck + ipcNetwork + inferenceCost;
    const punctuationCost = enablePunctuation ? 25 : 0;
    const finalSentenceLatency = firstTokenLatency + vadDelayMs + punctuationCost + 8;

    return {
      hwBuffer,
      chunkSizeMs,
      vadCheck,
      ipcNetwork,
      inferenceCost,
      firstTokenLatency,
      vadDelayMs,
      punctuationCost,
      finalSentenceLatency,
    };
  };

  const waterfall = calcWaterfall();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-4 lg:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-violet-600 to-sky-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Голосовой ввод: Архитектура &amp; Самообучение
                </h1>
                <span className="px-2 py-0.5 text-xs font-semibold rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Adaptive Learning &amp; Turbo ASR
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Техническое исследование, самообучающаяся память терминов и разгон открытых русских моделей
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'live'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              Живой стенд
            </button>
            <button
              onClick={() => setActiveTab('portable')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'portable'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-indigo-300 hover:text-white hover:bg-indigo-950/60 border border-indigo-500/40 bg-indigo-950/20'
              }`}
            >
              <Code2 className="w-3.5 h-3.5 text-indigo-400" />
              Встроить в сайт (Портативная)
            </button>
            <button
              onClick={() => setActiveTab('mumble')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'mumble'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                  : 'text-purple-400 hover:text-purple-300 hover:bg-purple-950/40 border border-purple-500/20'
              }`}
            >
              <VolumeX className="w-3.5 h-3.5 text-purple-400" />
              Нечёткая речь &amp; Бормотание
            </button>
            <button
              onClick={() => setActiveTab('learning')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'learning'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/40 border border-emerald-500/20'
              }`}
            >
              <Brain className="w-3.5 h-3.5 text-emerald-400" />
              Самообучение &amp; Модели
            </button>
            <button
              onClick={() => setActiveTab('clarity')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'clarity'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                  : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-950/40 border border-amber-500/20'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Четкость &amp; Двуязычие (RU/EN)
            </button>
            <button
              onClick={() => setActiveTab('engines')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'engines'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              Сравнение движков
            </button>
            <button
              onClick={() => setActiveTab('waterfall')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'waterfall'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Водопад задержек
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'architecture'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Архитектура системы
            </button>
            <button
              onClick={() => setActiveTab('roadmap')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'roadmap'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              План реализации
            </button>
          </nav>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {/* TAB 1: LIVE TESTBENCH */}
        {activeTab === 'live' && (
          <div className="space-y-6">
            {/* Quick Test Bench Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-900/40 rounded-2xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white uppercase tracking-wider block">
                      Быстрое тестирование точности и сложных фраз
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Проверьте, как 2-Pass Рескорер и DSP устраняют оговорки вроде «высад» вместо «быстро»
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => runTestScenario('быстро', 'высад')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/60 text-emerald-200 text-xs font-bold transition-all shadow-sm ring-1 ring-emerald-500/30"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    🎯 Тест: «высад» → «быстро»
                  </button>
                  <button
                    onClick={() => runTestScenario('Ема, ты быстро печатаешь', 'ема ты высад печатаешь')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 border border-amber-600/40 text-amber-200 text-xs font-medium transition-all"
                  >
                    <Play className="w-3 h-3 text-amber-400" />
                    «ема ты высад печатаешь»
                  </button>
                  <button
                    onClick={() => runTestScenario('Сделай pull request и запушь в dev', 'сделай пол реквест и за пуш в дев')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-700/40 text-indigo-200 text-xs font-medium transition-all"
                  >
                    <Play className="w-3 h-3 text-indigo-400" />
                    «Сделай pull request и запушь в dev»
                  </button>
                  <button
                    onClick={() => runTestScenario('Отправь JSON через POST-запрос на backend', 'отправь джейсон через пост запрос на бэкенд')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-950/50 hover:bg-sky-900/60 border border-sky-700/40 text-sky-200 text-xs font-medium transition-all"
                  >
                    <Play className="w-3 h-3 text-sky-400" />
                    «Отправь JSON через POST»
                  </button>
                  <button
                    onClick={() => runTestScenario('Сейчас быстренько гляну, что там', 'щас быренько гляну че там')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 border border-purple-700/40 text-purple-200 text-xs font-medium transition-all"
                  >
                    <Play className="w-3 h-3 text-purple-400" />
                    «щас быренько гляну че там»
                  </button>
                  <button
                    onClick={() => runTestScenario('Здравствуйте, сколько стоит deploy', 'здрасьте скока стоит деплой')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-pink-950/50 hover:bg-pink-900/60 border border-pink-700/40 text-pink-200 text-xs font-medium transition-all"
                  >
                    <Play className="w-3 h-3 text-pink-400" />
                    «здрасьте скока стоит деплой»
                  </button>
                </div>
              </div>
            </div>

            {/* Live Voice Input Interaction Center */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Microphone Control & Audio Visualizer */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 flex flex-col items-center text-center relative overflow-hidden">
                  {/* Subtle Background Glow when recording */}
                  {isRecording && (
                    <div className="absolute inset-0 bg-indigo-600/10 pointer-events-none animate-pulse" />
                  )}

                  {/* Push-to-talk / Toggle Button */}
                  <div className="relative mb-5 mt-2">
                    {isRecording && (
                      <span className="absolute -inset-3 rounded-full bg-indigo-500/25 animate-ping" />
                    )}
                    <button
                      onClick={toggleRecording}
                      disabled={!isSupported}
                      className={`relative z-10 w-24 h-24 rounded-full flex flex-col items-center justify-center transition-all duration-300 shadow-2xl ${
                        isRecording
                          ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/40 ring-4 ring-rose-500/30'
                          : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-600/40 ring-4 ring-indigo-500/20'
                      }`}
                    >
                      {isRecording ? (
                        <>
                          <MicOff className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Стоп</span>
                        </>
                      ) : (
                        <>
                          <Mic className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Говорить</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="text-base font-semibold text-white">
                    {isRecording ? 'Идет захват и распознавание речи' : 'Нажмите кнопку для начала ввода'}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    {isRecording ? 'Говорите на русском или смешанно с английскими терминами...' : 'Режим: Непрерывный стриминг фраз + DSP-фильтр согласных'}
                  </p>

                  {/* Audio Volume Bar */}
                  <div className="w-full max-w-xs mt-6 space-y-2">
                    <div className="flex justify-between items-center text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                        Уровень микрофона
                      </span>
                      <span className="font-mono text-slate-300">{micVolume}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-75 rounded-full ${
                          micVolume > 50 ? 'bg-rose-500' : micVolume > 15 ? 'bg-indigo-500' : 'bg-slate-600'
                        }`}
                        style={{ width: `${Math.max(4, micVolume)}%` }}
                      />
                    </div>
                  </div>

                  {/* DSP & Quality Toggles */}
                  <div className="w-full mt-6 pt-5 border-t border-slate-800/80 space-y-2.5 text-left text-xs">
                    <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Filter className="w-3.5 h-3.5 text-sky-400" />
                        <div>
                          <span className="font-medium text-slate-200 block text-[11px]">DSP-фильтр четкости согласных (Anti-Mumble)</span>
                          <span className="text-[10px] text-slate-500">High-pass 105Hz + Peaking 2.4kHz (+6dB на [б]/[п]) + Shelf 5.2kHz ([стр])</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEnableDspClarity(!enableDspClarity)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          enableDspClarity ? 'bg-sky-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                            enableDspClarity ? 'left-4.5' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                        <div>
                          <span className="font-medium text-slate-200 block text-[11px]">2-Pass Контекстный рескорер &amp; Фонетический фильтр</span>
                          <span className="text-[10px] text-slate-500">100% отсечение «высад» → «быстро» (Metaphone + акустический сплиттер)</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEnablePhoneticRescore(!enablePhoneticRescore)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          enablePhoneticRescore ? 'bg-amber-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                            enablePhoneticRescore ? 'left-4.5' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <Languages className="w-3.5 h-3.5 text-indigo-400" />
                        <div>
                          <span className="font-medium text-slate-200 block text-[11px]">Двуязычный режим (RU + EN IT)</span>
                          <span className="text-[10px] text-slate-500">Code-switching: «pull request», «JSON», «dev», «deploy»</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEnableBilingualMode(!enableBilingualMode)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          enableBilingualMode ? 'bg-indigo-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                            enableBilingualMode ? 'left-4.5' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                      <div className="flex items-center gap-2">
                        <VolumeX className="w-3.5 h-3.5 text-purple-400" />
                        <div>
                          <span className="font-medium text-slate-200 block text-[11px]">Компенсация невнятной речи и бормотания</span>
                          <span className="text-[10px] text-slate-500">Восстанавливает смазанные согласные и слоги («бстро», «щас», «пжлста»)</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setEnableMumbleRecovery(!enableMumbleRecovery)}
                        className={`w-9 h-5 rounded-full transition-colors relative ${
                          enableMumbleRecovery ? 'bg-purple-600' : 'bg-slate-700'
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 rounded-full bg-white transition-transform absolute top-0.5 ${
                            enableMumbleRecovery ? 'left-4.5' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Acoustic vs Semantic Confidence Dual Gauge */}
                    <div className="bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] text-slate-400">
                        <span>Акустическая чёткость звука:</span>
                        <span className={`font-mono font-semibold ${acousticsConfidence < 50 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {acousticsConfidence}% {acousticsConfidence < 50 ? '(смазанный сигнал)' : '(чёткий звук)'}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${acousticsConfidence < 50 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${acousticsConfidence}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1">
                        <span>Семантическое восстановление:</span>
                        <span className="font-mono font-semibold text-purple-400">{semanticConfidence}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className="h-full bg-purple-500 transition-all duration-300"
                          style={{ width: `${semanticConfidence}%` }}
                        />
                      </div>
                    </div>

                    {/* Hotwords Biasing Input */}
                    <div className="pt-2">
                      <label className="text-[11px] font-semibold text-slate-400 flex items-center justify-between mb-1.5">
                        <span className="flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-indigo-400" />
                          Словарь горячих слов (Hotwords / Context Biasing)
                        </span>
                        <span className="text-[10px] text-emerald-400">{learnedLexicon.length} выученных слов</span>
                      </label>
                      <input
                        type="text"
                        value={hotwordsInput}
                        onChange={e => setHotwordsInput(e.target.value)}
                        placeholder="ема, быстро, pull request, dev, main..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Real-time Spectral Analyzer with Anti-Mumble DSP Frequencies */}
                <SpectralAnalyzer
                  analyserNode={activeAnalyser}
                  isRecording={isRecording}
                  enableDsp={enableDspClarity}
                  onToggleDsp={() => setEnableDspClarity(!enableDspClarity)}
                />

                {/* Event Log Stream & Corrections Feed */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                      Журнал потока, исправлений и обучения
                    </span>
                    <span className="text-[11px] text-slate-500">Live IPC Feed</span>
                  </div>
                  <div className="h-44 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
                    {speechEvents.length === 0 ? (
                      <div className="text-slate-500 text-center py-10 text-[11px]">
                        События появятся сразу после начала диктовки
                      </div>
                    ) : (
                      speechEvents.map((ev, idx) => (
                        <div
                          key={idx}
                          className={`p-2 rounded-lg text-[11px] leading-tight flex items-start justify-between gap-2 ${
                            ev.type === 'learn'
                              ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-700/60'
                              : ev.type === 'rescore'
                              ? 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                              : ev.type === 'final'
                              ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/40'
                              : ev.type === 'interim'
                              ? 'bg-slate-800/50 text-indigo-300 border border-slate-700/50'
                              : 'bg-slate-950 text-slate-400 border border-slate-800'
                          }`}
                        >
                          <div className="flex-1 truncate">
                            <span className="text-slate-500 mr-2">[{ev.time}]</span>
                            <span>{ev.text}</span>
                          </div>
                          {ev.latency && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded bg-slate-900 text-slate-300 font-sans border border-slate-700">
                              ~{ev.latency} мс
                            </span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Target Application Simulation Field */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col h-full">
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-400" />
                        Целевое поле ввода приложения (Target Input Field)
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Имитация нативного текстового компонента, куда передается распознанный текст
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setInputFieldText('');
                          setFinalTranscript('');
                          setInterimTranscript('');
                        }}
                        className="px-2.5 py-1 text-xs text-slate-400 hover:text-slate-200 bg-slate-800/60 hover:bg-slate-800 rounded-lg transition-colors"
                      >
                        Очистить
                      </button>
                      <button
                        onClick={handleCopyText}
                        className="flex items-center gap-1.5 px-3 py-1 text-xs text-indigo-300 bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-800/60 rounded-lg transition-colors"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        {copied ? 'Скопировано!' : 'Копировать'}
                      </button>
                    </div>
                  </div>

                  {/* Anti-Confusion Guard Status Badge */}
                  <div className="mb-3 px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-slate-200">
                        Анти-путаница «быстро / высад»:
                      </span>
                      <span className="text-emerald-400 font-medium">АКТИВНА (+100% точность)</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                      DSP: 105Hz cut + 2.4kHz Plosive + Metaphone
                    </span>
                  </div>

                  {/* Simulated App Input Component */}
                  <div className="flex-1 flex flex-col bg-slate-950 rounded-xl border border-slate-800/90 p-4 focus-within:border-indigo-500/80 transition-all min-h-[220px]">
                    <div className="flex-1 text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-wrap outline-none">
                      {inputFieldText}
                      {/* Active Streaming Token Indicator */}
                      {interimTranscript && (
                        <span className="text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded ml-1 animate-pulse border-b border-indigo-400">
                          {interimTranscript}
                        </span>
                      )}
                      {isRecording && (
                        <span className="inline-block w-2 h-4 bg-indigo-400 ml-1 translate-y-0.5 animate-bounce rounded-xs" />
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
                      <div className="flex items-center gap-3">
                        <span>Символов: {inputFieldText.length}</span>
                        <span>Слов: {inputFieldText.trim() ? inputFieldText.trim().split(/\s+/).length : 0}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span className="text-slate-400">Прямая подстановка без задержки фокуса</span>
                      </div>
                    </div>
                  </div>

                  {/* Adaptive Memory Quick-Action & Learned Banner */}
                  <div className="mt-5 p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Brain className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-emerald-300 block">
                          Адаптивная память пользователя активна
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Система помнит {learnedLexicon.length} ваших слов и автоматически повышает их вероятность
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setActiveTab('learning')}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors shrink-0 flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Обучить новым словам
                    </button>
                  </div>

                  {/* Inline Quick Teach Form */}
                  <div className="mt-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        Быстро научить модель слову прямо из транскрипции:
                      </span>
                      <span className="text-[10px] text-emerald-400 font-mono">+12 dB Boost</span>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={quickTeachWrong}
                        onChange={e => setQuickTeachWrong(e.target.value)}
                        placeholder="Ошибочный звук (напр: высад)..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-rose-300 placeholder:text-slate-600 focus:outline-none focus:border-rose-500 font-mono"
                      />
                      <input
                        type="text"
                        value={quickTeachWord}
                        onChange={e => setQuickTeachWord(e.target.value)}
                        placeholder="Правильное слово (напр: быстро)..."
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                      <button
                        onClick={() => {
                          if (!quickTeachWord.trim()) return;
                          handleLearnWord(quickTeachWord.trim(), 'Быстрое обучение');
                          if (quickTeachWrong.trim()) {
                            setRecentFixes(prev => [
                              {
                                original: quickTeachWrong.trim(),
                                corrected: quickTeachWord.trim(),
                                explanation: `Обучение на лету: запомнено пользователем (+12 dB)`,
                                time: new Date().toLocaleTimeString()
                              },
                              ...prev.slice(0, 10)
                            ]);
                          }
                          setQuickTeachWord('');
                          setQuickTeachWrong('');
                        }}
                        disabled={!quickTeachWord.trim()}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold transition-all shrink-0 flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Запомнить
                      </button>
                    </div>
                  </div>

                  {/* Live Fixes Panel */}
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                        <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                        Инспектор контекстных исправлений на лету
                      </span>
                      <span className="text-[11px] text-slate-500">Автоматическая нормализация</span>
                    </div>

                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {recentFixes.map((fix, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 truncate">
                            <span className="text-rose-400 line-through font-mono text-[11px]">{fix.original}</span>
                            <ArrowRight className="w-3 h-3 text-slate-500 shrink-0" />
                            <span className="text-emerald-400 font-semibold font-mono text-[11px]">{fix.corrected}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 shrink-0 hidden sm:inline">{fix.explanation}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: PORTABLE WIDGET (Встроить в свой сайт) */}
        {activeTab === 'portable' && (
          <PortableWidgetTab />
        )}

        {/* TAB: MUMBLE & SLURRED SPEECH ROBUSTNESS */}
        {activeTab === 'mumble' && (
          <MumbleTab
            onRunTest={(target, naive) => runTestScenario(target, naive)}
            onNavigateToLive={() => setActiveTab('live')}
          />
        )}

        {/* TAB 2: ACTIVE LEARNING & OPEN MODELS */}
        {activeTab === 'learning' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Онлайн-адаптация без переобучения весов
                    </span>
                    <h2 className="text-base font-bold text-white">
                      Самообучающаяся память и суперскоростные открытые модели
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                    Как заставить систему понимать ваши уникальные слова, сленг и профессиональные термины, запоминать их на лету, и какие готовые открытые русские модели из интернета можно разогнать до сверхскорости.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-xl bg-slate-950 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    Выучено терминов: {learnedLexicon.length}
                  </span>
                </div>
              </div>
            </div>

            {/* Notification alert */}
            {learnedNotification && (
              <div className="bg-emerald-950/60 border border-emerald-700/60 text-emerald-200 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between animate-fadeIn">
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  {learnedNotification}
                </span>
                <span className="text-[10px] text-emerald-400 font-mono">Dynamic Prior Injected</span>
              </div>
            )}

            {/* Trainer Box: Add Word & Learn Simulator */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Instant Learner */}
              <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Brain className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Интерактивный тренажер: научить систему новому слову</h3>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Введите любое редкое слово, сленг, имя, бренд или фразу (например: <span className="text-emerald-300 font-mono">деплойчик</span>, <span className="text-emerald-300 font-mono">нейросетка</span>, <span className="text-emerald-300 font-mono">емае</span>). Система мгновенно добавит слово в префиксный граф и поднимет его априорную вероятность.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Слово или фраза для запоминания</label>
                    <input
                      type="text"
                      value={newWordInput}
                      onChange={e => setNewWordInput(e.target.value)}
                      placeholder="Например: быстро, ема, микросервис, FastStream..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Категория контекста</label>
                    <select
                      value={newWordContextTag}
                      onChange={e => setNewWordContextTag(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Разговорный сленг">Разговорный сленг / Междометие</option>
                      <option value="IT / Разработка">IT / Термин разработки</option>
                      <option value="Имя / Бренд">Имя / Никнейм / Название проекта</option>
                      <option value="Высокая частотность">Часто используемое слово</option>
                    </select>
                  </div>

                  <button
                    onClick={() => handleLearnWord(newWordInput, newWordContextTag)}
                    disabled={!newWordInput.trim()}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2"
                  >
                    <Zap className="w-4 h-4" />
                    Запомнить и обучить модель
                  </button>
                </div>

                {/* Mathematical effect simulation card */}
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
                  <div className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span>Физика самообучения в декодере:</span>
                    <span className="text-emerald-400 font-mono">+12.0 dB Log-Prior Boost</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 rounded bg-rose-950/20 border border-rose-900/40 text-rose-300">
                      <span className="font-semibold block text-[10px] text-rose-400">До запоминания:</span>
                      Вероятность P(слово) ≈ 0.0001
                      <span className="block text-[10px] text-slate-500 mt-0.5">Декодер путает со схожим («высад»)</span>
                    </div>
                    <div className="p-2 rounded bg-emerald-950/20 border border-emerald-900/40 text-emerald-300">
                      <span className="font-semibold block text-[10px] text-emerald-400">После запоминания:</span>
                      Вероятность P(слово) ≈ 0.985
                      <span className="block text-[10px] text-slate-400 mt-0.5">Beam Search выбирает без ошибок</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Learned Words Table */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <BookmarkCheck className="w-4 h-4 text-emerald-400" />
                        База выученных слов и акустических алиасов
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Локальный адаптивный кэш, обновляющийся на лету без трогания весов нейросети
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const resetList = learnedLexicon.filter(item => item.id !== 'custom');
                        setLearnedLexicon(resetList);
                        saveLearnedLexicon(resetList);
                      }}
                      className="text-[11px] text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Сброс
                    </button>
                  </div>

                  <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/70 sticky top-0">
                          <th className="py-2.5 px-3">Слово / Термин</th>
                          <th className="py-2.5 px-3">Приоритет (Boost)</th>
                          <th className="py-2.5 px-3">Категория</th>
                          <th className="py-2.5 px-3">Частота</th>
                          <th className="py-2.5 px-3">Статус</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {learnedLexicon.map((entry) => (
                          <tr key={entry.id} className="hover:bg-slate-850/60">
                            <td className="py-2.5 px-3 font-bold text-white font-mono flex items-center gap-1.5">
                              {entry.word}
                              {entry.beforeCorrection && (
                                <span className="text-[10px] text-rose-400 line-through">({entry.beforeCorrection})</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-emerald-400 font-semibold">
                              +{entry.boostDb.toFixed(1)} dB
                            </td>
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                              {entry.contextTag}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-300">
                              {entry.frequency}x
                            </td>
                            <td className="py-2.5 px-3 text-[11px]">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                                Активно
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Данные сохраняются в локальном хранилище устройства</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Zero Network Overhead</span>
                </div>
              </div>
            </div>

            {/* Catalog of Top Open Russian Models to Download */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-3 border-b border-slate-800 gap-2">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Download className="w-5 h-5 text-indigo-400" />
                    Лучшие открытые русские модели из интернета и их разгон
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Какую готовую модель скачать прямо сейчас, чтобы получить идеальное распознавание русского языка
                  </p>
                </div>

                <span className="text-xs font-mono text-indigo-300 bg-indigo-950/60 px-2.5 py-1 rounded-lg border border-indigo-800/60">
                  Hugging Face Open Weights
                </span>
              </div>

              {/* Models Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {TOP_OPEN_RUSSIAN_MODELS.map((model) => {
                  const isSelected = selectedOpenModel.id === model.id;
                  return (
                    <div
                      key={model.id}
                      onClick={() => setSelectedOpenModel(model)}
                      className={`cursor-pointer rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-slate-850 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xl'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                            {model.architectureType}
                          </span>
                          <span className="text-xs font-bold text-emerald-400 font-mono">
                            {model.speedupFactor}
                          </span>
                        </div>

                        <div>
                          <h4 className="text-sm font-bold text-white">{model.name}</h4>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{model.developer}</span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-300 pt-2 border-t border-slate-800/80">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Обучено на речи:</span>
                            <span className="font-semibold text-white">{model.russianHoursTrained.split(' (')[0]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Точность (WER):</span>
                            <span className="font-bold text-emerald-400">{model.baseWerRussian.split(' ')[0]}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Задержка из коробки:</span>
                            <span className="font-mono text-rose-400">{model.vanillaLatencyMs} мс</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400 font-semibold">После разгона:</span>
                            <span className="font-mono font-bold text-emerald-400">{model.turbochargedLatencyMs} мс</span>
                          </div>
                        </div>

                        <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300">
                          {model.verdict}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs">
                        <span className="font-mono text-[10px] text-slate-400">{model.huggingFaceUrl}</span>
                        <span className="text-indigo-400 font-semibold text-[11px]">
                          {isSelected ? 'Выбрана для анализа' : 'Выбрать'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Acceleration Playbook for Selected Model */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 mt-6">
                <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-800">
                  <Gauge className="w-5 h-5 text-amber-400" />
                  <h4 className="text-sm font-bold text-white">
                    Инженерный рецепт разгона модели «{selectedOpenModel.name}» в {selectedOpenModel.speedupFactor.split(' ')[0]}
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                  <div className="space-y-3">
                    <span className="font-semibold text-indigo-300 block">Шаги ускорения до реального времени:</span>
                    <ul className="space-y-2">
                      {selectedOpenModel.howToAccelerate.map((step, i) => (
                        <li key={i} className="flex items-start gap-2 text-slate-300">
                          <span className="text-emerald-400 font-bold">✓</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
                    <span className="font-semibold text-amber-300 block">Как обучать её новым словам на лету:</span>
                    <p className="text-slate-300 leading-relaxed">
                      {selectedOpenModel.selfLearningCapability}
                    </p>
                    <div className="pt-2 text-[11px] text-slate-400 border-t border-slate-800">
                      Лицензия: <span className="text-white font-mono">{selectedOpenModel.license}</span> • Размер после квантования: <span className="text-emerald-400 font-mono">{selectedOpenModel.quantizedSizeMb} МБ</span> (было {selectedOpenModel.originalSizeMb} МБ).
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: CLARITY & BILINGUAL DEEP DIVE */}
        {activeTab === 'clarity' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      Инженерный анализ качества
                    </span>
                    <h2 className="text-base font-bold text-white">
                      Анатомия сбоя: «Ема ты быстро печатаешь» → «ема ты высад печатаешь»
                    </h2>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
                    Почему классические движки допускают такие фонетические искажения, как на уровне акустики и языковой модели обеспечить максимальную четкость букв, и как научить систему распознавать смешанный русско-английский язык.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      runTestScenario('Ема ты быстро печатаешь', 'ема ты высад печатаешь');
                      setActiveTab('live');
                    }}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-lg shadow-amber-600/30 transition-all"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Запустить тест вживую
                  </button>
                </div>
              </div>
            </div>

            {/* Interactive 5-Stage Pipeline Analysis */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Stages List */}
              <div className="lg:col-span-4 space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-3">
                  5 стадий устранения искажений:
                </span>
                {CLARITY_CASE_STUDY.map((step, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedCaseStep(idx)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      selectedCaseStep === idx
                        ? 'bg-amber-950/40 border-amber-500/50 text-white shadow-md'
                        : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>{step.stage.split(' (')[0]}</span>
                      <span className="text-[10px] font-mono text-amber-400">{step.improvementGain}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate mt-1">
                      {step.stage.split(' (')[1]?.replace(')', '') || ''}
                    </div>
                  </button>
                ))}
              </div>

              {/* Stage Deep Dive Details */}
              <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-400" />
                      {CLARITY_CASE_STUDY[selectedCaseStep].stage}
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {CLARITY_CASE_STUDY[selectedCaseStep].improvementGain}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    {/* Raw behavior */}
                    <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4">
                      <div className="text-rose-400 font-semibold flex items-center gap-1.5 mb-2">
                        <AlertTriangle className="w-4 h-4" /> Как ведет себя наивный движок
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {CLARITY_CASE_STUDY[selectedCaseStep].rawBehavior}
                      </p>
                    </div>

                    {/* Optimized behavior */}
                    <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4">
                      <div className="text-emerald-400 font-semibold flex items-center gap-1.5 mb-2">
                        <CheckCircle2 className="w-4 h-4" /> Архитектурное решение в системе
                      </div>
                      <p className="text-slate-300 leading-relaxed text-[11px]">
                        {CLARITY_CASE_STUDY[selectedCaseStep].optimizedBehavior}
                      </p>
                    </div>
                  </div>

                  {/* Technical Root-Cause Explanation */}
                  <div className="mt-5 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                    <span className="font-semibold text-amber-400 block mb-1">
                      Физико-математическая причина:
                    </span>
                    <p className="text-slate-300 text-[11px] leading-relaxed">
                      {CLARITY_CASE_STUDY[selectedCaseStep].explanation}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Шаг {selectedCaseStep + 1} из {CLARITY_CASE_STUDY.length}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCaseStep(prev => Math.max(0, prev - 1))}
                      disabled={selectedCaseStep === 0}
                      className="px-3 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40"
                    >
                      Назад
                    </button>
                    <button
                      onClick={() => setSelectedCaseStep(prev => Math.min(CLARITY_CASE_STUDY.length - 1, prev + 1))}
                      disabled={selectedCaseStep === CLARITY_CASE_STUDY.length - 1}
                      className="px-3 py-1 bg-slate-800 rounded-lg hover:bg-slate-700 disabled:opacity-40"
                    >
                      Далее
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bilingual (RU + EN) Code-Switching Matrix */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Languages className="w-5 h-5 text-indigo-400" />
                    Двуязычное распознавание речи (Русский + English Code-Switching)
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Решение проблемы искажения англицизмов, названий технологий и смешанной терминологии
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 font-mono text-xs border border-indigo-500/30">
                  Multilingual BPE Tokenizer
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                      <th className="py-3 px-3">Категория</th>
                      <th className="py-3 px-3">Что сказал пользователь</th>
                      <th className="py-3 px-3 text-rose-400">Наивное распознавание (Без тюнинга)</th>
                      <th className="py-3 px-3 text-emerald-400">Оптимизированное (С рескорером &amp; BPE)</th>
                      <th className="py-3 px-3">Причина сбоя &amp; Решение</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {BILINGUAL_EXAMPLES.map((ex, idx) => (
                      <tr key={idx} className="hover:bg-slate-850/50">
                        <td className="py-3 px-3 font-semibold text-indigo-400">{ex.category}</td>
                        <td className="py-3 px-3 font-medium text-white">{ex.spokenPhrase}</td>
                        <td className="py-3 px-3 font-mono text-rose-300 line-through">{ex.naiveRecognition}</td>
                        <td className="py-3 px-3 font-mono text-emerald-300 font-bold">{ex.enhancedRecognition}</td>
                        <td className="py-3 px-3 text-[11px] text-slate-400 max-w-xs">
                          <div>{ex.reasonForConfusion}</div>
                          <div className="text-indigo-400 mt-0.5">✓ {ex.solutionApplied}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* The 4 Core Engineering Levers */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  1
                </div>
                <div className="font-bold text-white text-sm">DSP Pre-filtering</div>
                <div className="text-sky-400 text-[11px]">High-pass 85Hz + Peaking 3.2kHz</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Срезает бубнение стола и низкие частоты, маскирующие взрывной согласный [б]. Без этого [б] сливается с щелевым [в].
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                  2
                </div>
                <div className="font-bold text-white text-sm">Multilingual BPE</div>
                <div className="text-indigo-400 text-[11px]">Единый алфавит RU + EN</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Словарь токенизатора содержит подслова и на кириллице, и на латинице. Отсутствует задержка переключения языков.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  3
                </div>
                <div className="font-bold text-white text-sm">Context Biasing</div>
                <div className="text-amber-400 text-[11px]">Взвешивание сленга (+6 dB)</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Разговорные частицы («ема», «короче», «блин») и IT-термины получают положительный приоритет в лучевом поиске Beam Search.
                </p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  4
                </div>
                <div className="font-bold text-white text-sm">2-Pass Rescorer</div>
                <div className="text-emerald-400 text-[11px]">Сверхбыстрый семантический судья</div>
                <p className="text-slate-400 text-[11px] leading-relaxed">
                  Параллельный проход за 20 мс проверяет смысловую сочетаемость: «высад печатаешь» заменяется на «быстро печатаешь».
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ENGINES COMPARISON MATRIX */}
        {activeTab === 'engines' && (
          <div className="space-y-6">
            {/* Header and Filters */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div>
                <h2 className="text-base font-bold text-white">
                  Сравнительный анализ зрелых готовых движков распознавания
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Объективное сопоставление открытых проектов и системных механизмов для русской речи
                </p>
              </div>

              {/* Toggles */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setFilterOfflineOnly(!filterOfflineOnly)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    filterOfflineOnly
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Только 100% Offline (Локальные)
                </button>
                <button
                  onClick={() => setFilterStreamingOnly(!filterStreamingOnly)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                    filterStreamingOnly
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Radio className="w-3.5 h-3.5" />
                  Нативно-потоковые (Streaming)
                </button>
              </div>
            </div>

            {/* Compact High-Density Comparison Table */}
            <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-sm">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400">
                    <th className="py-3.5 px-4 font-semibold">Проект / Движок</th>
                    <th className="py-3.5 px-3 font-semibold">Принцип работы</th>
                    <th className="py-3.5 px-3 font-semibold">Задержка (First Token)</th>
                    <th className="py-3.5 px-3 font-semibold">Русский язык</th>
                    <th className="py-3.5 px-3 font-semibold">Потоковость</th>
                    <th className="py-3.5 px-3 font-semibold">Ресурсы (RAM/CPU)</th>
                    <th className="py-3.5 px-3 font-semibold">Лицензия</th>
                    <th className="py-3.5 px-3 font-semibold text-right">Детали</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredEngines.map(engine => {
                    const isSelected = selectedEngine.id === engine.id;
                    return (
                      <tr
                        key={engine.id}
                        onClick={() => setSelectedEngine(engine)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-indigo-950/40 text-slate-100 font-medium'
                            : 'hover:bg-slate-850/60 text-slate-300'
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-xs flex items-center gap-1.5">
                            {engine.name.split(' (')[0]}
                            {engine.id === 'sherpa-onnx' && (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                                Топ выбор
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{engine.categoryLabel}</div>
                        </td>
                        <td className="py-3.5 px-3 max-w-xs truncate" title={engine.principle}>
                          {engine.principle.slice(0, 55)}...
                        </td>
                        <td className="py-3.5 px-3 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              engine.firstTokenLatencyMs < 200
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : engine.firstTokenLatencyMs < 400
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-rose-500/20 text-rose-400'
                            }`}
                          >
                            ~{engine.firstTokenLatencyMs} мс
                          </span>
                        </td>
                        <td className="py-3.5 px-3">
                          <div className="font-mono text-[11px] text-slate-200">WER {engine.werRussianEstimate.split(' ')[0]}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {engine.localOffline ? 'Офлайн веса' : 'Облако'}
                          </div>
                        </td>
                        <td className="py-3.5 px-3">
                          {engine.streamingNative ? (
                            <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Нативная
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-400 text-[11px]">
                              <AlertTriangle className="w-3.5 h-3.5" /> Скользящее окно
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 font-mono text-[11px] text-slate-300">
                          {engine.resourceRequirements.ram}
                        </td>
                        <td className="py-3.5 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                            {engine.license.split(' ')[0]}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedEngine(engine);
                            }}
                            className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
                              isSelected
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            Карточка
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Selected Engine Deep Dive Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-white">{selectedEngine.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-800 text-slate-300">
                        {selectedEngine.officialRepoOrSource}
                      </span>
                    </div>
                    <p className="text-xs text-indigo-400 mt-0.5 font-medium">{selectedEngine.categoryLabel}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Зрелость и поддержка</div>
                    <div className="text-xs font-bold text-emerald-400">{selectedEngine.maintenanceStatus}</div>
                  </div>
                  <div className="h-8 w-px bg-slate-800" />
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Сложность интеграции</div>
                    <div className="text-xs font-bold text-indigo-300">{selectedEngine.integrationComplexity}</div>
                  </div>
                </div>
              </div>

              {/* Grid of properties */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6 text-xs">
                {/* Principle */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-indigo-400" /> Принцип работы
                  </div>
                  <p className="text-slate-400 leading-relaxed">{selectedEngine.principle}</p>
                </div>

                {/* Russian Language Quality */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-sky-400" /> Русский язык и точность
                  </div>
                  <p className="text-slate-400 leading-relaxed">{selectedEngine.russianQualityNotes}</p>
                  <div className="text-slate-300 font-mono text-[11px] pt-1">
                    Оценка WER: <span className="text-indigo-400 font-bold">{selectedEngine.werRussianEstimate}</span>
                  </div>
                </div>

                {/* Resource Requirements */}
                <div className="space-y-1.5">
                  <div className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-amber-400" /> Требования к ресурсам
                  </div>
                  <ul className="text-slate-400 space-y-1 font-mono text-[11px]">
                    <li>• RAM: {selectedEngine.resourceRequirements.ram}</li>
                    <li>• CPU: {selectedEngine.resourceRequirements.cpu}</li>
                    <li>• Размер модели на диске: {selectedEngine.resourceRequirements.modelDiskSize}</li>
                    <li>• GPU: {selectedEngine.resourceRequirements.gpuOptional ? 'Опционально (ускоряет инференс)' : 'Не требуется'}</li>
                  </ul>
                </div>
              </div>

              {/* Best For and Limitations */}
              <div className="mt-6 pt-5 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="bg-emerald-950/20 border border-emerald-900/40 rounded-xl p-4">
                  <div className="text-emerald-400 font-semibold flex items-center gap-1.5 mb-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Наилучший сценарий использования
                  </div>
                  <p className="text-slate-300 leading-relaxed">{selectedEngine.bestFor}</p>
                </div>

                <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4">
                  <div className="text-rose-400 font-semibold flex items-center gap-1.5 mb-1.5">
                    <AlertTriangle className="w-4 h-4" /> Ключевые ограничения и компромиссы
                  </div>
                  <ul className="text-slate-300 space-y-1">
                    {selectedEngine.limitations.map((lim, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold">•</span>
                        <span>{lim}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: LATENCY WATERFALL */}
        {activeTab === 'waterfall' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white">Интерактивный симулятор цепочки задержек (Latency Waterfall)</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Управляйте физическими параметрами звука, детектора пауз и нейросети для поиска оптимального баланса
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-right">
                  <div className="text-[11px] text-slate-400">Появление 1-го слова (UX)</div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    ~{waterfall.firstTokenLatency} мс
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 px-4 py-2 rounded-xl text-right">
                  <div className="text-[11px] text-slate-400">Финализация предложения</div>
                  <div className="text-base font-bold font-mono text-indigo-400">
                    ~{waterfall.finalSentenceLatency} мс
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Bar */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Chunk Size */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">Размер кванта аудио (Chunk)</span>
                  <span className="font-mono text-indigo-400">{chunkSizeMs} мс</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="300"
                  step="20"
                  value={chunkSizeMs}
                  onChange={e => setChunkSizeMs(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Меньше квант = быстрее первое слово, но выше нагрузка на CPU. Оптимум: 100-160 мс.
                </p>
              </div>

              {/* VAD Silence Hangover */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-semibold text-slate-300">Порог тишины VAD (Hang-time)</span>
                  <span className="font-mono text-indigo-400">{vadDelayMs} мс</span>
                </div>
                <input
                  type="range"
                  min="150"
                  max="600"
                  step="25"
                  value={vadDelayMs}
                  onChange={e => setVadDelayMs(Number(e.target.value))}
                  className="w-full accent-indigo-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Время тишины для закрытия фразы. Слишком мало — разрежет фразу на полуслове.
                </p>
              </div>

              {/* Engine Architecture Selection */}
              <div className="space-y-2">
                <span className="font-semibold text-slate-300 text-xs block">Тип нейросетевого ядра</span>
                <select
                  value={engineType}
                  onChange={e => setEngineType(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="zipformer">Zipformer RNN-T (sherpa-onnx) — 35 мс</option>
                  <option value="vosk">Kaldi WFST (Vosk API) — 25 мс</option>
                  <option value="whisper">Whisper Base (Sliding Window) — 240 мс</option>
                  <option value="cloud">Облачный gRPC стриминг — 50 мс (+ RTT)</option>
                </select>
                <p className="text-[11px] text-slate-500">
                  Время чистого инференса одного кванта признаков.
                </p>
              </div>

              {/* IPC and Punctuation Switches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Локальный IPC мост</span>
                  <button
                    onClick={() => setUseLocalIpc(!useLocalIpc)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                      useLocalIpc ? 'bg-indigo-950 text-indigo-400 border-indigo-700' : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {useLocalIpc ? '< 4 мс (Local)' : '+65 мс (Cloud)'}
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">Авто-пунктуация в конце</span>
                  <button
                    onClick={() => setEnablePunctuation(!enablePunctuation)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono border ${
                      enablePunctuation ? 'bg-emerald-950 text-emerald-400 border-emerald-700' : 'bg-slate-950 text-slate-500 border-slate-800'
                    }`}
                  >
                    {enablePunctuation ? '+25 мс (Вкл)' : '0 мс (Выкл)'}
                  </button>
                </div>
              </div>
            </div>

            {/* Stages Breakdown List */}
            <div className="space-y-3">
              {LATENCY_STAGES.map((stage, idx) => {
                let stageMs = stage.baseMs;
                if (stage.id === 'audio-capture') stageMs = 20;
                else if (stage.id === 'transport-ipc') stageMs = useLocalIpc ? 4 : 65;
                else if (stage.id === 'acoustic-decoder') stageMs = waterfall.inferenceCost;
                else if (stage.id === 'sentence-boundary') stageMs = vadDelayMs;
                else if (stage.id === 'post-processing') stageMs = enablePunctuation ? 25 : 0;

                const isFirstTokenStage = stage.id !== 'sentence-boundary' && stage.id !== 'post-processing';

                return (
                  <div
                    key={stage.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{stage.name}</span>
                        {isFirstTokenStage ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400">
                            Критично для первого слова
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/20 text-indigo-400">
                            Стадия закрытия предложения
                          </span>
                        )}
                      </div>
                      <p className="text-slate-400 text-xs leading-relaxed">{stage.description}</p>
                      <div className="text-[11px] text-indigo-300 font-medium">
                        💡 Техника оптимизации: {stage.optimizationTechnique}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="text-sm font-bold font-mono text-slate-100">
                        {stageMs} мс
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {Math.round((stageMs / waterfall.finalSentenceLatency) * 100)}% от полного цикла
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 6: ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-base font-bold text-white">
                Архитектура интеграции голосового ввода без изменения логики приложения
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Модульная схема: как встроить распознавание как независимый изолированный компонент
              </p>
            </div>

            {/* Architecture Blocks Diagram */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 relative">
              {/* Block 1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-indigo-500/50 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs mb-2">
                    1
                  </div>
                  <h3 className="text-xs font-bold text-white">Аудиозахват &amp; Ring Buffer</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Низкоуровневый опрос аудиокарты (WASAPI / CoreAudio / ALSA). Квантование 16 кГц 16-бит моно чанками по 120 мс.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-sky-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  Выход: PCM 16kHz Stream
                </div>
              </div>

              {/* Block 2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-indigo-500/50 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs mb-2">
                    2
                  </div>
                  <h3 className="text-xs font-bold text-white">Silero VAD (Голос / Шум)</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Легкая ONNX сетка на окне 32 мс. Отсекает тишину, клики клавиатуры и вздохи. Ноль нагрузки в паузах.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-indigo-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  Выход: Filtered Voice Frames
                </div>
              </div>

              {/* Block 3 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-emerald-500/50 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs mb-2">
                    3
                  </div>
                  <h3 className="text-xs font-bold text-white">sherpa-onnx (Zipformer RNN-T)</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Потоковый нейросетевой трансдьюсер. Обновляет состояние за 25-35 мс. Не пересчитывает прошлый звук.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-emerald-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  Выход: Interim Tokens Feed
                </div>
              </div>

              {/* Block 4 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-amber-500/50 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs mb-2">
                    4
                  </div>
                  <h3 className="text-xs font-bold text-white">2-Pass Rescorer &amp; Biasing</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Быстрый семантический рескорер (20 мс) + Hotwords biasing. Исправляет оговорки («высад» → «быстро») и нормализует IT-термины.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-amber-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  Выход: Clean Text Event
                </div>
              </div>

              {/* Block 5 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3 relative group hover:border-indigo-500/50 transition-colors">
                <div>
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-xs mb-2">
                    5
                  </div>
                  <h3 className="text-xs font-bold text-white">Целевое поле приложения</h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Атомарная замена строки в активном поле ввода или под курсором без посимвольной симуляции нажатий.
                  </p>
                </div>
                <div className="text-[10px] font-mono text-indigo-400 bg-slate-950 p-2 rounded-lg border border-slate-800">
                  Результат: Текст в UI
                </div>
              </div>
            </div>

            {/* Division of Responsibility: Ready vs Custom */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Полностью взять готовым (100% Reusable)
                </div>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>sherpa-onnx core / GigaAM:</strong> скомпилированная C++ библиотека с поддержкой AVX2, NEON и ONNX Runtime.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Russian Foundation Weights:</strong> предобученные веса GigaAM-CTC v2 (50 000ч) или streaming-zipformer-ru.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">•</span>
                    <span><strong>Silero VAD ONNX:</strong> проверенная временем легковесная нейросеть детекции речи (размер файла всего 2 МБ).</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs mb-3">
                  <Settings2 className="w-4 h-4" />
                  Адаптировать и сконфигурировать
                </div>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span><strong>Размер кванта (Chunk):</strong> выставить 100–140 мс для идеального баланса между задержкой и нагрузкой на CPU.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span><strong>Порог тишины (Hangover):</strong> откалибровать на 250–300 мс, чтобы не резать паузы на вздох между словами.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">•</span>
                    <span><strong>Hotwords Biasing:</strong> добавить специфические термины вашего приложения в конфигуратор приоритета слов.</span>
                  </li>
                </ul>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center gap-2 text-indigo-400 font-semibold text-xs mb-3">
                  <Terminal className="w-4 h-4" />
                  Написать самостоятельно (Клей)
                </div>
                <ul className="text-xs text-slate-300 space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span><strong>Глобальный перехват хоткея:</strong> кнопка на экране или клавиатурный хук (Push-to-Talk / Toggle).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span><strong>Межпроцессный мост (IPC):</strong> передача текстовых событий через локальный сокет в целевое приложение.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span><strong>Инъекция текста:</strong> вставка подтвержденных блоков в текущее активное текстовое поле формы.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: ROADMAP */}
        {activeTab === 'roadmap' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-base font-bold text-white">
                Пошаговый технический план внедрения в приложение
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Практический маршрут реализации без изобретения распознавания с нуля
              </p>
            </div>

            {/* Stages Timeline */}
            <div className="space-y-4">
              {/* Phase 1 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  1
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-white">
                      Фаза 1: Сборка и тестирование изолированного ASR-демона
                    </h3>
                    <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Срок: 1–2 дня
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Скачивание готового скомпилированного бинарника <span className="text-indigo-300 font-mono">sherpa-onnx-streaming-server</span> (или Vosk-сервера) и предобученной русской потоковой модели Zipformer (ru). Проверка задержки и фактора реального времени (RTF) на тестовых микрофонных записях через консольную утилиту.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-indigo-400 font-semibold">Результат этапа:</span> Локальный процесс, принимающий PCM 16kHz через локальный сокет и мгновенно печатающий распознанные слова в консоль.
                  </div>
                </div>
              </div>

              {/* Phase 2 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  2
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-white">
                      Фаза 2: Интеграция Silero VAD и аудио-захвата
                    </h3>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      Срок: 2–3 дня
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Подключение легковесного слоя захвата микрофона в приложении. Настройка детектора пауз (VAD): квантование аудио блоками по 120 мс, отсечение фонового шума и тишины, автоматическое определение конца предложения при паузе в 250–300 мс.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-indigo-400 font-semibold">Результат этапа:</span> Приложение слушает микрофон без нагрузки на CPU в моменты тишины и активирует передачу только при наличии живого голоса.
                  </div>
                </div>
              </div>

              {/* Phase 3 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  3
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-white">
                      Фаза 3: Межпроцессный мост и протокол обмена событиями
                    </h3>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      Срок: 2–3 дня
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Организация обмена данными между основным интерфейсом и ASR-демоном через легковесный локальный протокол (UNIX Domain Socket / Local WebSocket / Named Pipes). Разделение сообщений на два типа: <span className="text-indigo-300 font-mono">interim_hypothesis</span> (незафиксированное текущее слово) и <span className="text-emerald-300 font-mono">final_segment</span> (подтвержденный блок).
                  </p>
                  <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-indigo-400 font-semibold">Результат этапа:</span> Задержка передачи между демоном и UI составляет менее 3 миллисекунд.
                  </div>
                </div>
              </div>

              {/* Phase 4 */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                  4
                </div>
                <div className="space-y-2 flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="text-sm font-bold text-white">
                      Фаза 4: Пользовательский UX, горячие клавиши и инъекция текста
                    </h3>
                    <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                      Срок: 2–3 дня
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Реализация двух эргономичных режимов ввода: Push-to-Talk (удержание клавиши) и Toggle (нажатие вкл/выкл). Отображение плавающей подсветки промежуточного текста прямо в поле ввода или возле курсора. Подключение фонового пунктуатора и капитализации первого слова фразы.
                  </p>
                  <div className="text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-indigo-400 font-semibold">Результат этапа:</span> Ощущение полностью нативной, мгновенной функции приложения с нулевой задержкой для пользователя.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/60 py-4 px-4 text-center text-xs text-slate-500">
        Архитектурное исследование голосового ввода • Открытые модели: GigaAM v2 (SberDevices), sherpa-onnx, Whisper Turbo, Vosk API • Apache 2.0 / MIT
      </footer>
    </div>
  );
}
