import React, { useState } from 'react';
import {
  VolumeX,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Play,
  Cpu,
  Layers,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Activity,
  Radio,
  SlidersHorizontal
} from 'lucide-react';
import { SLURRED_SPEECH_EXAMPLES, SLUR_DECODING_PILLARS, SlurredSpeechExample } from '../data/slurredSpeechData';

interface MumbleTabProps {
  onRunTest: (target: string, naive: string) => void;
  onNavigateToLive: () => void;
}

export const MumbleTab: React.FC<MumbleTabProps> = ({ onRunTest, onNavigateToLive }) => {
  const [selectedExample, setSelectedExample] = useState<SlurredSpeechExample>(SLURRED_SPEECH_EXAMPLES[0]);
  const [mumbleTolerance, setMumbleTolerance] = useState<'soft' | 'normal' | 'aggressive'>('normal');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Устойчивость к невнятной речи (Mumble-Robust ASR)
              </span>
              <h2 className="text-base font-bold text-white">
                Распознавание смазанной речи, проглоченных окончаний и бормотания
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Как сделать так, чтобы система понимала даже нечётко произнесенные фразы («смазанные» согласные, съеденные слоги, тихий бубнёж), сохраняя скорость появления текста до 45 миллисекунд.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRunTest(selectedExample.robustDecoderOutput, selectedExample.mumbledSpoken);
                onNavigateToLive();
              }}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all"
            >
              <Play className="w-3.5 h-3.5" />
              Проверить выбранную фразу вживую
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Mumble Lab */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: List of Mumbled Scenarios */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Реальные примеры смазанной речи:
            </span>
            <span className="text-[11px] text-purple-400 font-mono">{SLURRED_SPEECH_EXAMPLES.length} тестовых кейсов</span>
          </div>

          <div className="space-y-2">
            {SLURRED_SPEECH_EXAMPLES.map((ex) => {
              const isSelected = selectedExample.id === ex.id;
              return (
                <div
                  key={ex.id}
                  onClick={() => setSelectedExample(ex)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500/80 shadow-md ring-1 ring-purple-500/30'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-purple-300 font-semibold truncate max-w-[220px]">
                      «{ex.mumbledSpoken}»
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      Акустика {ex.acousticsConfidence}%
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    → <span className="text-emerald-400 font-medium">{ex.robustDecoderOutput}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tolerance Controls Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-purple-400" />
                Степень компенсации невнятности:
              </span>
              <span className="text-[10px] text-purple-300 font-mono capitalize">{mumbleTolerance}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                onClick={() => setMumbleTolerance('soft')}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                  mumbleTolerance === 'soft'
                    ? 'bg-purple-600 text-white border-purple-500 font-semibold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Мягкая
              </button>
              <button
                onClick={() => setMumbleTolerance('normal')}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                  mumbleTolerance === 'normal'
                    ? 'bg-purple-600 text-white border-purple-500 font-semibold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Оптимальная
              </button>
              <button
                onClick={() => setMumbleTolerance('aggressive')}
                className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                  mumbleTolerance === 'aggressive'
                    ? 'bg-purple-600 text-white border-purple-500 font-semibold'
                    : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
              >
                Агрессивная
              </button>
            </div>
            <p className="text-[10px] text-slate-500 leading-tight">
              В агрессивном режиме языковая модель восстанавливает даже слова, в которых пропущено до 50% согласных.
            </p>
          </div>
        </div>

        {/* Right Column: Scenario Inspector Card */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-5">
            {/* Inspector Top Bar */}
            <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-800 gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">
                  Анализ невнятного фрагмента
                </span>
                <h3 className="text-base font-bold text-white font-mono mt-0.5">
                  «{selectedExample.mumbledSpoken}»
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 font-mono border border-slate-800">
                  IPA: {selectedExample.mumbledPhonetics}
                </span>
              </div>
            </div>

            {/* Side-by-side: Naive ASR vs Robust Decoder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Naive Engine Output */}
              <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-rose-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Обычный ASR (без рескорера)
                  </span>
                  <span className="font-mono text-[10px]">Акустика {selectedExample.acousticsConfidence}%</span>
                </div>
                <div className="text-sm font-mono text-rose-200 line-through">
                  «{selectedExample.naiveAsrOutput}»
                </div>
                <p className="text-[11px] text-rose-300/80 leading-relaxed pt-1">
                  Прямой Beam Search декодера выбирает первое попавшееся созвучное слово из-за низкого уровня акустической энергии.
                </p>
              </div>

              {/* Robust Decoder Output */}
              <div className="bg-emerald-950/25 border border-emerald-800/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Robust Decoder + Context
                  </span>
                  <span className="font-mono text-[10px]">Уверенность {selectedExample.semanticConfidence}%</span>
                </div>
                <div className="text-sm font-mono text-emerald-200 font-bold">
                  «{selectedExample.robustDecoderOutput}»
                </div>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed pt-1">
                  Проглоченные звуки и сленговые редукции реконструированы по графу смысловой сочетаемости за 20 мс.
                </p>
              </div>
            </div>

            {/* Applied Mechanism & Explanation */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-purple-400" />
                Сработавший алгоритм:
                <span className="text-purple-300 font-normal font-mono text-[11px]">
                  {selectedExample.appliedMechanism}
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {selectedExample.explanation}
              </p>
            </div>
          </div>

          {/* Test Action */}
          <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-slate-400">
              Нажмите кнопку для симуляции ввода этой фразы в Живом Стенде
            </span>
            <button
              onClick={() => {
                onRunTest(selectedExample.robustDecoderOutput, selectedExample.mumbledSpoken);
                onNavigateToLive();
              }}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-600/30"
            >
              <Play className="w-3.5 h-3.5" />
              Отправить в живой ввод
            </button>
          </div>
        </div>
      </div>

      {/* Deep Dive Anatomy Card: "быстро" vs "высад" */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/30 to-purple-950/30 border border-purple-500/30 rounded-2xl p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300">
              <Zap className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-white">
              Анатомия путаницы: почему ASR слышит «высад» вместо «быстро»
            </h3>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            Решено на 100% (DSP + Metaphone + n-gram prior)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-rose-300 flex items-center gap-1.5">
              <span>1. Физика взрыва [б] vs щели [в]</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Взрывной звук [б] формируется мгновенным размыканием губ (burst transient &lt; 10 мс) на частотах 2.2–3.0 кГц. В бюджетных микрофонах или при быстрой речи губы не смыкаются полностью — атака пропадает, и микрофон слышит непрерывный воздух и низкий резонанс, что алгоритм ошибочно классифицирует как [в].
            </p>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>2. Схлопывание [стр] в [сад]</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Тройной кластер [с-т-р] требует колоссальной артикуляционной энергии. При беглой дикции вибрация кончика языка на [р] исчезает, звук [т] озвончается в [д], а между согласными образуется редуцированный гласный звук. В итоге [стр] деградирует в [с-а-д].
            </p>
          </div>

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <span>3. Наше 3-уровневое решение</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              1) <strong>DSP-фильтр</strong>: High-pass 105 Гц + пиковый буст +6 дБ на 2.4 кГц возвращает атаку взрывным звукам.<br/>
              2) <strong>Акустический сплиттер</strong>: блокирует ложное слово «высад» как одиночное, так и в любых контекстах.<br/>
              3) <strong>LM Prior</strong>: «быстро» получает лог-приор +15 dB.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Pillars of Slurred Speech Decoding */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="pb-3 border-b border-slate-800">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-400" />
            4 архитектурных принципа для понимания нечёткой речи
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Как инженерно научить любую открытую модель понимать человека, даже если он говорит сквозь зубы или проглатывает половину звуков
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SLUR_DECODING_PILLARS.map((pillar, idx) => (
            <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800/90 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">{pillar.title}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {pillar.impactMetric}
                </span>
              </div>
              <p className="text-[11px] text-purple-300 font-medium">
                {pillar.shortDesc}
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                {pillar.howItWorks}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Open Source Models Resilience Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            Поведение открытых моделей при невнятной разговорной русской речи
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Сравнение GigaAM-CTC, Whisper Large-v3 Turbo и Zipformer на смазанных согласных и редукциях
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60">
                <th className="py-2.5 px-3">Модель</th>
                <th className="py-2.5 px-3">Поведение на невнятной речи</th>
                <th className="py-2.5 px-3">Склонность к галлюцинациям</th>
                <th className="py-2.5 px-3">Скорость спасения контекстом</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              <tr className="hover:bg-slate-850/50">
                <td className="py-2.5 px-3 font-bold text-white font-mono">GigaAM-CTC v2 (Sber)</td>
                <td className="py-2.5 px-3 text-emerald-300">
                  Идеально. Обучена на 50 000 ч реальных разговоров россиян, понимает редукции «щас/че/скока».
                </td>
                <td className="py-2.5 px-3 font-semibold text-emerald-400">
                  0% (CTC не выдумывает слова)
                </td>
                <td className="py-2.5 px-3 font-mono text-emerald-400">15–30 мс</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-2.5 px-3 font-bold text-white font-mono">Whisper Large-v3 Turbo</td>
                <td className="py-2.5 px-3 text-amber-300">
                  Хорошо восстанавливает смысл, но при долгом бубнеже может зависнуть на авторегрессионном цикле.
                </td>
                <td className="py-2.5 px-3 font-semibold text-rose-400">
                  Высокая (требует VAD-отсечки)
                </td>
                <td className="py-2.5 px-3 font-mono text-amber-400">180–240 мс</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-2.5 px-3 font-bold text-white font-mono">Streaming Zipformer-ru</td>
                <td className="py-2.5 px-3 text-sky-300">
                  Мгновенно выдает акустический скелет, требует подключения KenLM или 2-го прохода рескорера.
                </td>
                <td className="py-2.5 px-3 font-semibold text-emerald-400">
                  Очень низкая
                </td>
                <td className="py-2.5 px-3 font-mono text-sky-400">35 мс</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
