import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, Sparkles, Check, AlertCircle } from 'lucide-react';
import { applySmartRescoring, setupClarityAudioNodes } from '../services/smartCorrector';

export interface VoiceInputWidgetProps {
  onTranscript: (text: string, meta?: { isMumbleFixed: boolean; original: string }) => void;
  onInterim?: (interimText: string) => void;
  targetInputSelector?: string;
  lang?: 'ru-RU' | 'en-US';
  autoPunctuate?: boolean;
  enableDsp?: boolean;
  enableAntiMumble?: boolean;
  theme?: 'dark' | 'light' | 'indigo';
  buttonStyle?: 'compact' | 'pill' | 'floating';
  className?: string;
}

export const VoiceInputWidget: React.FC<VoiceInputWidgetProps> = ({
  onTranscript,
  onInterim,
  targetInputSelector,
  lang = 'ru-RU',
  autoPunctuate = true,
  enableDsp = true,
  enableAntiMumble = true,
  theme = 'dark',
  buttonStyle = 'compact',
  className = ''
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [micLevel, setMicLevel] = useState(0);
  const [lastCorrection, setLastCorrection] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
    return () => {
      stop();
    };
  }, []);

  const startAudioMonitoring = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;

      if (enableDsp) {
        const dsp = setupClarityAudioNodes(audioCtx, source);
        dsp.outputNode.connect(analyser);
      } else {
        source.connect(analyser);
      }

      audioContextRef.current = audioCtx;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateVol = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i];
        const avg = sum / dataArray.length;
        setMicLevel(Math.min(100, Math.round(avg * 1.8)));
        animFrameRef.current = requestAnimationFrame(updateVol);
      };
      updateVol();
    } catch (e) {
      console.warn('[VoiceInputWidget] Mic stream preview error:', e);
    }
  };

  const stopAudioMonitoring = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setMicLevel(0);
  };

  const start = () => {
    if (isRecording) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    try {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang;

      rec.onstart = () => {
        setIsRecording(true);
        startAudioMonitoring();
      };

      rec.onresult = (event: any) => {
        let interim = '';
        let finalStr = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript;
          } else {
            interim += res[0].transcript;
          }
        }

        if (finalStr) {
          const raw = finalStr.trim();
          // Smart Rescoring pass (100% fixes "высад" -> "быстро")
          const rescored = applySmartRescoring(raw, {
            enablePhoneticRescore: true,
            enableBilingualMapping: true,
            enableSlangNormalization: true,
            enableMumbleRecovery: enableAntiMumble,
            mumbleTolerance: 'normal'
          });

          let formatted = rescored.enhancedText;
          if (autoPunctuate && !/[.!?]$/.test(formatted)) {
            formatted += '.';
          }

          if (rescored.appliedFixes.length > 0) {
            setLastCorrection(`${rescored.appliedFixes[0].original} → ${rescored.appliedFixes[0].corrected}`);
          }

          // If target input selector provided, update it automatically
          if (targetInputSelector) {
            const inputEl = document.querySelector(targetInputSelector) as HTMLInputElement | HTMLTextAreaElement;
            if (inputEl) {
              const prev = inputEl.value;
              inputEl.value = prev ? `${prev} ${formatted}` : formatted;
              inputEl.dispatchEvent(new Event('input', { bubbles: true }));
              inputEl.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }

          onTranscript(formatted, {
            isMumbleFixed: rescored.wasMumbleRecovered,
            original: raw
          });
        } else if (interim) {
          const interimRescored = applySmartRescoring(interim, {
            enablePhoneticRescore: true,
            enableBilingualMapping: true,
            enableSlangNormalization: true,
            enableMumbleRecovery: enableAntiMumble
          });
          if (onInterim) {
            onInterim(interimRescored.enhancedText);
          }
        }
      };

      rec.onerror = (err: any) => {
        console.warn('[VoiceInputWidget] Speech recognition event:', err.error);
      };

      rec.onend = () => {
        setIsRecording(false);
        stopAudioMonitoring();
      };

      recognitionRef.current = rec;
      rec.start();
    } catch (err) {
      console.error('[VoiceInputWidget] Start error:', err);
      setIsRecording(false);
    }
  };

  const stop = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsRecording(false);
    stopAudioMonitoring();
  };

  const toggle = () => {
    if (isRecording) {
      stop();
    } else {
      start();
    }
  };

  if (!isSupported) {
    return (
      <div className="text-xs text-rose-400 flex items-center gap-1.5 p-2 bg-rose-950/40 rounded-lg border border-rose-900/50">
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
        <span>Браузер не поддерживает SpeechRecognition (требуется Chrome/Edge)</span>
      </div>
    );
  }

  if (buttonStyle === 'pill') {
    return (
      <div className={`inline-flex items-center gap-2 p-1.5 rounded-full border transition-all ${
        isRecording
          ? 'bg-rose-950/80 border-rose-500/70 text-rose-200 shadow-lg shadow-rose-950/50'
          : theme === 'light'
          ? 'bg-white border-slate-300 text-slate-700 hover:border-indigo-400'
          : 'bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700'
      } ${className}`}>
        <button
          onClick={toggle}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
            isRecording
              ? 'bg-rose-600 text-white animate-pulse'
              : 'bg-indigo-600 text-white hover:bg-indigo-500'
          }`}
        >
          {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          <span>{isRecording ? 'Стоп' : 'Голосовой ввод'}</span>
        </button>

        {isRecording && (
          <div className="flex items-center gap-1 px-2">
            <span className="w-1.5 h-3 rounded-full bg-rose-400 animate-pulse" style={{ height: `${Math.max(6, micLevel * 0.25)}px` }} />
            <span className="w-1.5 h-4 rounded-full bg-rose-400 animate-pulse" style={{ height: `${Math.max(8, micLevel * 0.35)}px` }} />
            <span className="w-1.5 h-2 rounded-full bg-rose-400 animate-pulse" style={{ height: `${Math.max(4, micLevel * 0.2)}px` }} />
            <span className="text-[10px] text-rose-300 font-mono ml-1">{micLevel}%</span>
          </div>
        )}

        {lastCorrection && (
          <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60 hidden sm:inline-block">
            ✨ {lastCorrection}
          </span>
        )}
      </div>
    );
  }

  // Default compact button (for embedding right inside search bars or next to inputs)
  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={toggle}
        title={isRecording ? 'Остановить ввод' : 'Голосовой ввод с защитой Anti-Mumble'}
        className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 shadow-md ${
          isRecording
            ? 'bg-rose-600 text-white ring-4 ring-rose-500/30 scale-105'
            : theme === 'light'
            ? 'bg-indigo-600 text-white hover:bg-indigo-500'
            : 'bg-indigo-600 text-white hover:bg-indigo-500 ring-2 ring-indigo-500/20'
        }`}
      >
        {isRecording ? (
          <MicOff className="w-4 h-4" />
        ) : (
          <Mic className="w-4 h-4" />
        )}
      </button>

      {/* Voice level ring indicator when active */}
      {isRecording && (
        <span
          className="absolute -inset-1 rounded-full border border-rose-500/60 pointer-events-none animate-ping"
          style={{ opacity: Math.max(0.3, micLevel / 100) }}
        />
      )}
    </div>
  );
};
