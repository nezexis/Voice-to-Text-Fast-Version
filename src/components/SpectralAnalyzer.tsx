import React, { useEffect, useRef, useState } from 'react';
import { Activity, Sliders, Volume2, Sparkles, Zap, Shield, Play } from 'lucide-react';

interface SpectralAnalyzerProps {
  analyserNode: AnalyserNode | null;
  isRecording: boolean;
  enableDsp: boolean;
  onToggleDsp: () => void;
}

export const SpectralAnalyzer: React.FC<SpectralAnalyzerProps> = ({
  analyserNode,
  isRecording,
  enableDsp,
  onToggleDsp
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const [peakFreq, setPeakFreq] = useState<number>(0);
  const [activeZone, setActiveZone] = useState<string>('Мониторинг частот...');
  const [showEqCurve, setShowEqCurve] = useState<boolean>(true);
  const [testToneActive, setTestToneActive] = useState<boolean>(false);
  const testTonePhaseRef = useRef<number>(0);

  // Frequency bands of interest for the Anti-Mumble DSP Filter
  const DSP_BANDS = [
    {
      id: 'lowcut',
      name: 'Срез низкого гула',
      range: '< 105 Гц',
      freq: 105,
      type: 'highpass',
      action: 'Срез -24 дБ/окт',
      color: 'rgba(239, 68, 68, 0.85)', // rose-500
      bgAlpha: 'rgba(239, 68, 68, 0.15)',
      description: 'Удаляет гул стола, задевание микрофона и дыхание'
    },
    {
      id: 'mudcut',
      name: 'Anti-Mud Filter',
      range: '300–420 Гц',
      freq: 360,
      type: 'peaking',
      action: '-3.5 дБ (360 Гц)',
      color: 'rgba(245, 158, 11, 0.9)', // amber-500
      bgAlpha: 'rgba(245, 158, 11, 0.15)',
      description: 'Срезает коробочный резонанс, путающий [б] со щелевым [в]'
    },
    {
      id: 'burst',
      name: 'Взрывной импульс [б]',
      range: '2.0–3.0 кГц',
      freq: 2400,
      type: 'peaking',
      action: '+6.0 дБ (2.4 кГц)',
      color: 'rgba(14, 165, 233, 0.95)', // sky-500
      bgAlpha: 'rgba(14, 165, 233, 0.18)',
      description: 'Усиливает фронт атаки [б, п, т] — разделяет «быстро» и «высад»'
    },
    {
      id: 'sibilant',
      name: 'Кластеры [стр]',
      range: '> 5.2 кГц',
      freq: 5200,
      type: 'highshelf',
      action: '+4.8 дБ (>5.2 кГц)',
      color: 'rgba(168, 85, 247, 0.9)', // purple-500
      bgAlpha: 'rgba(168, 85, 247, 0.15)',
      description: 'Чёткость звуков [с], [т], [р], предотвращает смазывание в [сад]'
    }
  ];

  // Map frequency (20 Hz - 16000 Hz) to normalized X coordinate (logarithmic/smooth scale)
  const freqToX = (freq: number, width: number): number => {
    const minF = 20;
    const maxF = 16000;
    const minLog = Math.log10(minF);
    const maxLog = Math.log10(maxF);
    const fLog = Math.log10(Math.max(minF, Math.min(maxF, freq)));
    return ((fLog - minLog) / (maxLog - minLog)) * width;
  };

  // Convert X position back to approximate frequency in Hz
  const xToFreq = (x: number, width: number): number => {
    const minF = 20;
    const maxF = 16000;
    const minLog = Math.log10(minF);
    const maxLog = Math.log10(maxF);
    const ratio = Math.max(0, Math.min(1, x / width));
    return Math.round(Math.pow(10, minLog + ratio * (maxLog - minLog)));
  };

  // Calculate DSP filter response at a given frequency in dB
  const getFilterGainDb = (freq: number): number => {
    if (!enableDsp) return 0;
    let gain = 0;

    // Highpass 105 Hz (2-pole approximation: -12 to -24 dB below cut)
    if (freq < 105) {
      const octavesBelow = Math.log2(105 / Math.max(10, freq));
      gain -= Math.min(36, octavesBelow * 18);
    }

    // Mud Cut Peaking at 360 Hz (Q ~ 1.0, -3.5 dB)
    const mudDist = Math.abs(Math.log2(freq / 360));
    if (mudDist < 1.2) {
      gain -= 3.5 * Math.exp(-mudDist * mudDist * 2.2);
    }

    // Plosive Burst Peaking at 2400 Hz (Q ~ 1.4, +6.0 dB)
    const burstDist = Math.abs(Math.log2(freq / 2400));
    if (burstDist < 1.1) {
      gain += 6.0 * Math.exp(-burstDist * burstDist * 2.6);
    }

    // Sibilant Highshelf above 5200 Hz (+4.8 dB)
    if (freq > 3000) {
      const shelfRatio = 1 / (1 + Math.exp(-(freq - 5200) / 1200));
      gain += 4.8 * shelfRatio;
    }

    return gain;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let bufferLength = 128;
    let dataArray = new Uint8Array(bufferLength);
    if (analyserNode) {
      bufferLength = analyserNode.frequencyBinCount;
      dataArray = new Uint8Array(bufferLength);
    }

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // 1. Background Grid & Dark Studio Canvas
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      bgGrad.addColorStop(0, '#090d16');
      bgGrad.addColorStop(1, '#040711');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Subtle horizontal dB grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      const gridLevels = [0.2, 0.4, 0.6, 0.8];
      gridLevels.forEach(lvl => {
        const y = height * (1 - lvl);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      });

      // 2. Draw DSP Filter Bands Highlight Regions (Anti-Mumble Zones)
      const x105 = freqToX(105, width);
      const x300 = freqToX(300, width);
      const x420 = freqToX(420, width);
      const x2000 = freqToX(2000, width);
      const x3200 = freqToX(3200, width);
      const x5200 = freqToX(5200, width);

      // Zone 1: Low Cut Zone (<105 Hz)
      ctx.fillStyle = enableDsp ? 'rgba(239, 68, 68, 0.12)' : 'rgba(100, 116, 139, 0.06)';
      ctx.fillRect(0, 0, x105, height);
      ctx.strokeStyle = enableDsp ? 'rgba(239, 68, 68, 0.4)' : 'rgba(100, 116, 139, 0.2)';
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.moveTo(x105, 0);
      ctx.lineTo(x105, height);
      ctx.stroke();

      // Zone 2: Mud Cut Zone (300-420 Hz)
      ctx.fillStyle = enableDsp ? 'rgba(245, 158, 11, 0.12)' : 'rgba(100, 116, 139, 0.06)';
      ctx.fillRect(x300, 0, x420 - x300, height);

      // Zone 3: Plosive Burst Boost (2.0 - 3.2 kHz)
      ctx.fillStyle = enableDsp ? 'rgba(14, 165, 233, 0.16)' : 'rgba(100, 116, 139, 0.06)';
      ctx.fillRect(x2000, 0, x3200 - x2000, height);

      // Zone 4: Sibilant / Consonants Shelf (> 5.2 kHz)
      ctx.fillStyle = enableDsp ? 'rgba(168, 85, 247, 0.14)' : 'rgba(100, 116, 139, 0.06)';
      ctx.fillRect(x5200, 0, width - x5200, height);
      ctx.setLineDash([]);

      // 3. Audio Frequency Data (Real or Simulated)
      let maxVal = 0;
      let maxFreq = 0;
      const points: Array<{ x: number; y: number }> = [];

      const numBins = 72;
      const timeSec = performance.now() * 0.003;

      if (analyserNode && isRecording) {
        analyserNode.getByteFrequencyData(dataArray);
      }

      for (let i = 0; i < numBins; i++) {
        const x = (i / (numBins - 1)) * width;
        const freq = xToFreq(x, width);

        let amplitude = 0;

        if (analyserNode && isRecording) {
          // Map frequency to FFT bin
          const sampleRate = analyserNode.context.sampleRate || 44100;
          const binIndex = Math.min(
            dataArray.length - 1,
            Math.floor((freq / (sampleRate / 2)) * dataArray.length)
          );
          amplitude = dataArray[binIndex] / 255;
        } else {
          // Realistic voice simulation mode when idle or running demo tone
          const voiceBase = Math.sin(timeSec * 2.2 + freq * 0.002) * 0.18 + 0.22;
          const vowelPeak1 = Math.exp(-Math.pow((freq - 750) / 320, 2)) * 0.42;
          const vowelPeak2 = Math.exp(-Math.pow((freq - 1400) / 450, 2)) * 0.32;
          const plosiveSim = testToneActive
            ? Math.exp(-Math.pow((freq - 2400) / 600, 2)) * 0.65
            : 0;
          const noiseFloor = (Math.sin(freq * 12.3 + timeSec * 5) * 0.5 + 0.5) * 0.08;

          amplitude = voiceBase * 0.4 + vowelPeak1 + vowelPeak2 + plosiveSim + noiseFloor;
        }

        // Apply DSP Gain curve to spectrum visualization if enabled
        if (enableDsp) {
          const gainDb = getFilterGainDb(freq);
          // 1 dB ~ 4% height modulation
          amplitude = Math.max(0.02, Math.min(1.0, amplitude * Math.pow(10, gainDb / 28)));
        }

        if (amplitude > maxVal) {
          maxVal = amplitude;
          maxFreq = freq;
        }

        const y = height - amplitude * (height * 0.88) - 4;
        points.push({ x, y });
      }

      // Update Peak Frequency & Active Band
      if (maxFreq > 0 && maxVal > 0.15) {
        setPeakFreq(maxFreq);
        if (maxFreq < 120) {
          setActiveZone('Зона низкого гула (< 105 Гц: Срезается фильтром)');
        } else if (maxFreq >= 280 && maxFreq <= 450) {
          setActiveZone('Зона мутности (360 Гц: Подавляется -3.5 дБ)');
        } else if (maxFreq >= 1800 && maxFreq <= 3400) {
          setActiveZone('Взрывная атака [б, п] (2.4 кГц: Буст +6 дБ для «быстро»!)');
        } else if (maxFreq >= 4800) {
          setActiveZone('Кластер согласных [стр] (5.2+ кГц: Подчёркнут +4.8 дБ)');
        } else {
          setActiveZone(`Голосовой формант: ${maxFreq} Гц`);
        }
      }

      // 4. Render Spectral Wave Curve with Gradient Fill
      if (points.length > 0) {
        ctx.beginPath();
        ctx.moveTo(0, height);
        ctx.lineTo(points[0].x, points[0].y);

        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
        ctx.lineTo(width, height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, height);
        if (enableDsp) {
          grad.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
          grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.25)');
          grad.addColorStop(1, 'rgba(14, 165, 233, 0.02)');
        } else {
          grad.addColorStop(0, 'rgba(148, 163, 184, 0.35)');
          grad.addColorStop(1, 'rgba(148, 163, 184, 0.02)');
        }
        ctx.fillStyle = grad;
        ctx.fill();

        // Stroke line
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 0; i < points.length - 1; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        ctx.strokeStyle = enableDsp ? '#38bdf8' : '#94a3b8';
        ctx.lineWidth = 2.2;
        ctx.stroke();
      }

      // 5. Draw Filter EQ Transfer Function Curve (Theoretical Response)
      if (showEqCurve && enableDsp) {
        ctx.beginPath();
        const numEqPoints = 80;
        const baselineY = height * 0.55;

        for (let i = 0; i < numEqPoints; i++) {
          const x = (i / (numEqPoints - 1)) * width;
          const freq = xToFreq(x, width);
          const gainDb = getFilterGainDb(freq);
          // Scale: 1 dB = 3.5 pixels offset
          const y = baselineY - gainDb * 3.5;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.strokeStyle = 'rgba(251, 191, 36, 0.85)'; // amber-400
        ctx.lineWidth = 1.8;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Label on EQ curve
        ctx.font = '9px monospace';
        ctx.fillStyle = 'rgba(251, 191, 36, 0.9)';
        ctx.fillText('АЧХ DSP (+6дБ на 2.4кГц / срез <105Гц)', width - 210, 16);
      }

      // 6. Frequency Axis Ticks & Labels
      const axisFreqs = [50, 105, 360, 1000, 2400, 5200, 10000];
      ctx.font = '9px sans-serif';
      ctx.textAlign = 'center';

      axisFreqs.forEach(f => {
        const x = freqToX(f, width);
        // Vertical dashed guide line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height - 14);
        ctx.stroke();

        // Label text
        const label = f >= 1000 ? `${(f / 1000).toFixed(1)}k` : `${f}`;
        if (f === 105 || f === 360 || f === 2400 || f === 5200) {
          ctx.fillStyle = f === 105 ? '#f87171' : f === 360 ? '#fbbf24' : f === 2400 ? '#38bdf8' : '#c084fc';
          ctx.fillText(label, x, height - 3);
        } else {
          ctx.fillStyle = 'rgba(148, 163, 184, 0.6)';
          ctx.fillText(label, x, height - 3);
        }
      });

      animFrameIdRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [analyserNode, isRecording, enableDsp, showEqCurve, testToneActive]);

  // Trigger brief simulation of acoustic burst for "быстро"
  const handleTriggerTestBurst = () => {
    setTestToneActive(true);
    setTimeout(() => {
      setTestToneActive(false);
    }, 1800);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5">
      {/* Header & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-md flex items-center justify-center ${
            enableDsp ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
          }`}>
            <Activity className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Спектральный анализатор (Anti-Mumble)
              </span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                enableDsp
                  ? 'bg-sky-950 text-sky-300 border border-sky-800/60'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {enableDsp ? 'DSP АКТИВЕН' : 'DSP ВЫКЛ'}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 block">
              В реальном времени: срез шумов и буст согласных [б], [п], [стр]
            </span>
          </div>
        </div>

        {/* DSP Bypass Switch */}
        <button
          onClick={onToggleDsp}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
            enableDsp
              ? 'bg-sky-600/20 text-sky-200 border-sky-500/50 hover:bg-sky-600/30'
              : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
          }`}
          title="Включить / отключить 5-полосный DSP-фильтр"
        >
          <Sliders className="w-3 h-3 text-sky-400" />
          {enableDsp ? 'DSP Вкл' : 'Без DSP'}
        </button>
      </div>

      {/* Real-time Canvas Display */}
      <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#070b14] shadow-inner">
        <canvas
          ref={canvasRef}
          width={480}
          height={160}
          className="w-full h-40 block"
        />

        {/* Live Peak Indicator Overlay */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-sm border border-slate-700/60 px-2 py-0.5 rounded text-[10px] text-slate-300 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
          <span>Пик: {peakFreq > 0 ? `${peakFreq} Гц` : 'Ожидание сигнала...'}</span>
        </div>

        {/* Mode badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          <span>{isRecording ? '● Live Микрофон' : testToneActive ? '⚡ Тест согласного [б]' : '○ Авто-симуляция'}</span>
        </div>

        {/* Active Zone Subtitle */}
        <div className="absolute bottom-6 left-2 right-2 text-center pointer-events-none">
          <span className="text-[10px] font-medium text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
            {activeZone}
          </span>
        </div>
      </div>

      {/* 4 DSP Filter Bands Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {DSP_BANDS.map(band => (
          <div
            key={band.id}
            className={`p-2 rounded-lg border text-left transition-all ${
              enableDsp
                ? 'bg-slate-950/70 border-slate-800'
                : 'bg-slate-950/40 border-slate-900 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono text-slate-400">{band.range}</span>
              <span
                className="text-[9px] font-bold font-mono px-1 py-0.2 rounded"
                style={{
                  backgroundColor: band.bgAlpha,
                  color: band.color,
                  border: `1px solid ${band.color}`
                }}
              >
                {band.action}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-200 truncate">{band.name}</div>
            <div className="text-[10px] text-slate-400 leading-tight mt-0.5">{band.description}</div>
          </div>
        ))}
      </div>

      {/* Tool Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowEqCurve(!showEqCurve)}
            className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
              showEqCurve
                ? 'bg-amber-950/50 text-amber-300 border border-amber-800/60'
                : 'bg-slate-800/50 text-slate-400 hover:text-slate-300'
            }`}
          >
            {showEqCurve ? '✓ Кривая АЧХ видна' : 'Показать кривую АЧХ'}
          </button>

          <button
            onClick={handleTriggerTestBurst}
            disabled={testToneActive}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
              testToneActive
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-600'
                : 'bg-indigo-950/60 text-indigo-300 hover:bg-indigo-900/60 border border-indigo-800/50'
            }`}
          >
            <Play className="w-3 h-3 text-indigo-400" />
            {testToneActive ? 'Импульс [б]...' : 'Тест импульса «быстро» (2.4кГц)'}
          </button>
        </div>

        <span className="text-[10px] text-slate-500 font-mono">
          Web Audio BiquadFilter 24-bit
        </span>
      </div>
    </div>
  );
};
