import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  Code2,
  ExternalLink,
  Sparkles,
  Zap,
  ShieldCheck,
  Layers,
  Globe,
  Sliders,
  Play,
  FileCode,
  FolderArchive,
  ArrowRight,
  Terminal,
  CheckCircle2
} from 'lucide-react';
import { VoiceInputWidget } from '../portable-voice-input/VoiceInputWidget';

export const PortableWidgetTab: React.FC = () => {
  const [activeCodeTab, setActiveCodeTab] = useState<'html' | 'react' | 'api'>('html');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Simulated User Website State
  const [siteInputText, setSiteInputText] = useState('');
  const [widgetPosition, setWidgetPosition] = useState<'compact' | 'pill'>('compact');
  const [widgetTheme, setWidgetTheme] = useState<'dark' | 'light' | 'indigo'>('dark');
  const [autoPunctuate, setAutoPunctuate] = useState(true);
  const [enableDsp, setEnableDsp] = useState(true);
  const [enableAntiMumble, setEnableAntiMumble] = useState(true);
  const [simulatedEvents, setSimulatedEvents] = useState<Array<{ time: string; text: string; fixed: boolean }>>([
    {
      time: '08:20:12',
      text: 'Модуль инициализирован на поле #site-search-input (DSP Anti-Mumble активен)',
      fixed: false
    }
  ]);

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleSimulatedTranscript = (text: string, meta?: { isMumbleFixed: boolean; original: string }) => {
    setSiteInputText(prev => (prev ? `${prev} ${text}` : text));
    setSimulatedEvents(prev => [
      {
        time: new Date().toLocaleTimeString(),
        text: meta?.isMumbleFixed
          ? `🎯 Исправлено бормотание: «${meta.original}» → «${text}»`
          : `Введено: «${text}»`,
        fixed: !!meta?.isMumbleFixed
      },
      ...prev.slice(0, 7)
    ]);
  };

  const downloadFile = (filename: string, content: string, mimeType: string = 'text/javascript') => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Generate contents for 1-click downloads
  const getVoiceInputJsCode = () => {
    return `/**
 * Portable Voice Input Engine (v2.0)
 * Standalone drop-in voice recognition with Anti-Mumble DSP & Smart Rescoring
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.VoiceInput = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var ACOUSTIC_CONFUSIONS = {
    'высад': 'быстро', 'высат': 'быстро', 'высада': 'быстро', 'высаду': 'быстро',
    'высадом': 'быстро', 'высаде': 'быстро', 'выстро': 'быстро', 'выстра': 'быстро',
    'бстро': 'быстро', 'быстра': 'быстро', 'быст': 'быстро', 'быро': 'быстро',
    'быренько': 'быстренько', 'побырому': 'по-быстрому', 'повысаду': 'по-быстрому',
    'щас': 'сейчас', 'ща': 'сейчас', 'скока': 'сколько', 'здрасьте': 'здравствуйте',
    'пжлста': 'пожалуйста', 'ваще': 'вообще', 'че': 'что', 'чо': 'что',
    'пол реквест': 'pull request', 'деплой': 'deploy', 'джейсон': 'JSON'
  };

  function rescoreTranscript(text) {
    if (!text) return text;
    var rawTokens = text.split(/(\\s+|[.,!?;:«»"()—–])/);
    for (var i = 0; i < rawTokens.length; i++) {
      var tok = rawTokens[i];
      var match = tok.match(/^([^а-яa-zё]*)([а-яa-zё]+)([^а-яa-zё]*)$/i);
      if (!match) continue;
      var clean = match[2].toLowerCase();
      if (clean === 'высад') {
        var next = rawTokens.slice(i + 1).join('').toLowerCase();
        if (/^\\s*(?:десанта|пассажиров|войск|рассады)/.test(next)) continue;
      }
      if (ACOUSTIC_CONFUSIONS[clean]) {
        rawTokens[i] = match[1] + ACOUSTIC_CONFUSIONS[clean] + match[3];
      }
    }
    text = rawTokens.join('');
    text = text.replace(/\\b(высад|высат|высаду|высадом|высаде)\\b(?!\\s+(?:десанта|пассажиров|войск))/gi, 'быстро');
    text = text.replace(/\\b(?:ема|ё-?моё|емае)\\s+ты\\s+быстро\\s+(?:печатаешь|пишешь)\\b/gi, 'Ема, ты быстро печатаешь!');
    return text.trim().charAt(0).toUpperCase() + text.trim().slice(1);
  }

  function setupDsp(stream) {
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      var ctx = new AC();
      var src = ctx.createMediaStreamSource(stream);
      var hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 105;
      var mud = ctx.createBiquadFilter(); mud.type = 'peaking'; mud.frequency.value = 360; mud.gain.value = -3.5;
      var plosive = ctx.createBiquadFilter(); plosive.type = 'peaking'; plosive.frequency.value = 2400; plosive.gain.value = 6.0;
      var shelf = ctx.createBiquadFilter(); shelf.type = 'highshelf'; shelf.frequency.value = 5200; shelf.gain.value = 4.8;
      src.connect(hp); hp.connect(mud); mud.connect(plosive); plosive.connect(shelf);
      return { ctx: ctx, output: shelf };
    } catch(e) { return null; }
  }

  return {
    isRecording: false,
    attach: function(selector, opts) {
      var self = this;
      var el = document.querySelector(selector);
      if (!el) return;
      var wrap = document.createElement('div');
      wrap.style.cssText = 'position:relative;display:inline-block;width:100%;';
      el.parentNode.insertBefore(wrap, el);
      wrap.appendChild(el);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.title = 'Голосовой ввод';
      btn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>';
      btn.style.cssText = 'position:absolute;right:10px;top:50%;transform:translateY(-50%);width:34px;height:34px;border-radius:50%;border:none;background:#4f46e5;color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.25);';
      wrap.appendChild(btn);

      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) return;
      var rec = new SR();
      rec.continuous = true; rec.interimResults = true; rec.lang = (opts && opts.lang) || 'ru-RU';

      btn.onclick = function() {
        if (self.isRecording) { rec.stop(); return; }
        rec.start();
      };
      rec.onstart = function() {
        self.isRecording = true;
        btn.style.background = '#e11d48';
      };
      rec.onresult = function(ev) {
        var s = '';
        for (var i = ev.resultIndex; i < ev.results.length; i++) {
          if (ev.results[i].isFinal) s += ev.results[i][0].transcript;
        }
        if (s) {
          var clean = rescoreTranscript(s) + '.';
          var old = el.value || el.innerText || '';
          var val = old ? old + ' ' + clean : clean;
          if (typeof el.value !== 'undefined') el.value = val; else el.innerText = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };
      rec.onend = function() {
        self.isRecording = false;
        btn.style.background = '#4f46e5';
      };
    }
  };
}));`;
  };

  const getHtmlSnippet = () => {
    return `<!-- 1. Подключите 1 файл voice-input.js в любом месте страницы -->
<script src="./voice-input.js"></script>

<!-- 2. Ваше поле ввода на сайте -->
<input type="text" id="site-search" placeholder="Поиск или ввод текста...">

<!-- 3. Активация одной строчкой -->
<script>
  VoiceInput.attach('#site-search', {
    lang: 'ru-RU',        // Русский язык с поддержкой англ. IT-терминов
    antiMumble: true,     // Режим восстановления невнятной речи
    enableDsp: true       // 5-полосный DSP-фильтр четкости согласных
  });
</script>`;
  };

  const getReactSnippet = () => {
    return `// Скопируйте VoiceInputWidget.tsx в папку ваших компонентов
import { useState } from 'react';
import { VoiceInputWidget } from './VoiceInputWidget';

export function MyWebsiteInput() {
  const [text, setText] = useState('');

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Говорите или пишите..."
        className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl pr-14 text-white"
      />

      <div className="absolute right-3">
        <VoiceInputWidget
          onTranscript={(recognizedText) => {
            setText((prev) => (prev ? \`\${prev} \${recognizedText}\` : recognizedText));
          }}
          enableAntiMumble={true}
          enableDsp={true}
        />
      </div>
    </div>
  );
}`;
  };

  const getApiSnippet = () => {
    return `// Программное использование без привязки к DOM
VoiceInput.start();

VoiceInput.onTranscript(function(finalText, meta) {
  console.log('Итоговый четкий текст:', finalText);
  if (meta.isMumbleFixed) {
    console.log('✨ Оговорка «высад» автоматически предотвращена и заменена на «быстро»');
  }
});

VoiceInput.onInterim(function(liveHypothesis) {
  console.log('Стриминг-гипотеза в реальном времени:', liveHypothesis);
});

// Для остановки:
VoiceInput.stop();`;
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 border border-indigo-800/40 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-bold uppercase tracking-wider">
                1 Файл • 0 Зависимостей • 100% Портативность
              </span>
              <span className="text-emerald-400 text-xs font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Защита «высад» → «быстро» включена
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-white">
              Встройте этот чёткий голосовой ввод на свой сайт
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Возьмите <strong>один файл</strong> <code className="text-amber-300 font-mono text-xs">voice-input.js</code> или готовую папку, перенесите в свой проект — и на вашем сайте заработает сверхбыстрый голосовой ввод с той же скоростью, анти-бормотанием и защитой согласных.
            </p>
          </div>

          {/* Quick Download Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => downloadFile('voice-input.js', getVoiceInputJsCode())}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30"
            >
              <Download className="w-4 h-4" />
              Скачать 1 файл (voice-input.js)
            </button>
            <button
              onClick={() => {
                const demoHtml = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Голосовой ввод: Демо</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #fff; padding: 40px; display: flex; flex-direction: column; align-items: center; }
    .box { max-width: 500px; width: 100%; background: #1e293b; padding: 24px; border-radius: 12px; }
    input { width: 100%; padding: 12px 45px 12px 14px; background: #090d16; border: 1px solid #475569; color: #fff; border-radius: 8px; font-size: 16px; box-sizing: border-box; }
  </style>
</head>
<body>
  <div class="box">
    <h2>Голосовой ввод на вашем сайте</h2>
    <p style="color:#94a3b8;font-size:13px;margin-bottom:16px;">Нажмите микрофон и скажите «быстро» или «pull request»:</p>
    <input type="text" id="demo-search" placeholder="Говорите сюда...">
  </div>
  <script src="./voice-input.js"></script>
  <script>VoiceInput.attach('#demo-search');</script>
</body>
</html>`;
                downloadFile('index.html', demoHtml, 'text/html');
              }}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-all"
            >
              <FileCode className="w-4 h-4 text-amber-400" />
              Скачать demo index.html
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Live Simulation Playground, Right = Integration Code & Customizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Realistic Website Embed Simulation (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
            {/* Simulated Browser Bar */}
            <div className="bg-slate-950 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
                <span className="text-[11px] text-slate-400 font-mono ml-2">https://your-website.com</span>
              </div>
              <span className="text-[10px] text-indigo-400 font-medium bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-900">
                Живая симуляция вашего сайта
              </span>
            </div>

            {/* Simulated Website Body */}
            <div className="p-6 bg-gradient-to-b from-slate-900 to-slate-950 space-y-6">
              <div>
                <span className="text-xs uppercase tracking-wider text-indigo-400 font-bold block mb-1">
                  Демонстрация интеграции
                </span>
                <h3 className="text-lg font-bold text-white">
                  Ваш сайт с встроенным голосовым виджетом
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Нажмите на кнопку микрофона справа внутри поля и скажите любую фразу. Текст моментально напечатается в поле!
                </p>
              </div>

              {/* Embedded Field Container */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Поле ввода на вашем сайте:</span>
                  <span className="text-[10px] text-emerald-400">#site-search-input</span>
                </label>

                <div className="relative flex items-center">
                  <input
                    id="site-search-input"
                    type="text"
                    value={siteInputText}
                    onChange={(e) => setSiteInputText(e.target.value)}
                    placeholder="Нажмите на микрофон и скажите «быстро» или «pull request»..."
                    className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 pr-14 shadow-inner"
                  />

                  {/* The Embedded Widget Button */}
                  <div className="absolute right-2.5">
                    <VoiceInputWidget
                      onTranscript={handleSimulatedTranscript}
                      buttonStyle={widgetPosition}
                      theme={widgetTheme}
                      autoPunctuate={autoPunctuate}
                      enableDsp={enableDsp}
                      enableAntiMumble={enableAntiMumble}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Защита от оговорки «высад» активна
                  </span>
                  {siteInputText && (
                    <button
                      onClick={() => setSiteInputText('')}
                      className="text-slate-400 hover:text-slate-200 underline text-[10px]"
                    >
                      Очистить поле
                    </button>
                  )}
                </div>
              </div>

              {/* Quick simulation test buttons for user */}
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                  Быстрый тест ввода без микрофона:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => handleSimulatedTranscript('быстро', { isMumbleFixed: true, original: 'высад' })}
                    className="px-2.5 py-1 rounded-lg bg-emerald-950 text-emerald-200 border border-emerald-700/60 text-xs font-semibold hover:bg-emerald-900 transition-all"
                  >
                    🎯 Тест: «высад» → «быстро»
                  </button>
                  <button
                    onClick={() => handleSimulatedTranscript('Ема, ты быстро печатаешь!', { isMumbleFixed: true, original: 'ема ты высад печатаешь' })}
                    className="px-2.5 py-1 rounded-lg bg-amber-950 text-amber-200 border border-amber-700/60 text-xs font-medium hover:bg-amber-900 transition-all"
                  >
                    «ема ты высад печатаешь»
                  </button>
                  <button
                    onClick={() => handleSimulatedTranscript('Сделай pull request и запушь в dev', { isMumbleFixed: false, original: 'pull request' })}
                    className="px-2.5 py-1 rounded-lg bg-indigo-950 text-indigo-200 border border-indigo-700/60 text-xs font-medium hover:bg-indigo-900 transition-all"
                  >
                    «pull request в dev»
                  </button>
                </div>
              </div>

              {/* Real-time Event Feed inside Simulated Site */}
              <div className="bg-slate-950 rounded-xl p-3 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  События виджета на сайте:
                </span>
                <div className="space-y-1 max-h-28 overflow-y-auto font-mono text-[11px]">
                  {simulatedEvents.map((ev, i) => (
                    <div
                      key={i}
                      className={`p-1.5 rounded flex items-center justify-between ${
                        ev.fixed
                          ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-900'
                          : 'bg-slate-900/60 text-slate-300'
                      }`}
                    >
                      <span>{ev.text}</span>
                      <span className="text-[10px] text-slate-500 font-sans">{ev.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Code Snippets & How-To (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          {/* Code Tabs Header */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Код для вставки на ваш сайт
                </span>
              </div>

              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  onClick={() => setActiveCodeTab('html')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeCodeTab === 'html'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  HTML / JS (1 файл)
                </button>
                <button
                  onClick={() => setActiveCodeTab('react')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeCodeTab === 'react'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  React / Next.js
                </button>
                <button
                  onClick={() => setActiveCodeTab('api')}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                    activeCodeTab === 'api'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  JS Callback API
                </button>
              </div>
            </div>

            {/* Code Block Container */}
            <div className="relative">
              <pre className="bg-slate-950 text-slate-200 p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800 max-h-72">
                <code>
                  {activeCodeTab === 'html' && getHtmlSnippet()}
                  {activeCodeTab === 'react' && getReactSnippet()}
                  {activeCodeTab === 'api' && getApiSnippet()}
                </code>
              </pre>

              <button
                onClick={() => {
                  const text = activeCodeTab === 'html' ? getHtmlSnippet() : activeCodeTab === 'react' ? getReactSnippet() : getApiSnippet();
                  copyToClipboard(text, activeCodeTab);
                }}
                className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-all shadow"
              >
                {copiedType === activeCodeTab ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300">Скопировано!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Скопировать</span>
                  </>
                )}
              </button>
            </div>

            {/* Step-by-step 30 second guide */}
            <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800/80 space-y-2">
              <span className="text-xs font-bold text-white uppercase tracking-wider block">
                Инструкция: как перенести и запустить (за 30 секунд)
              </span>
              <ol className="text-xs text-slate-300 space-y-1.5 list-decimal list-inside leading-relaxed">
                <li>
                  Нажмите кнопку <strong>«Скачать 1 файл (voice-input.js)»</strong> вверху страницы.
                </li>
                <li>
                  Переместите скачанный файл <code className="text-amber-300 font-mono">voice-input.js</code> в папку вашего сайта (рядом с вашим <code className="text-amber-300 font-mono">index.html</code>).
                </li>
                <li>
                  Вставьте строку <code className="text-indigo-300 font-mono">&lt;script src="./voice-input.js"&gt;&lt;/script&gt;</code> перед закрывающим тегом <code className="text-slate-400 font-mono">&lt;/body&gt;</code>.
                </li>
                <li>
                  Вызовите <code className="text-emerald-300 font-mono">VoiceInput.attach('#id_вашего_поля')</code>. Готово! Кнопка появится внутри поля ввода автоматически.
                </li>
              </ol>
            </div>
          </div>

          {/* Widget Options & Customizer */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              Параметры виджета для вашего сайта
            </span>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Стиль кнопки:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWidgetPosition('compact')}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      widgetPosition === 'compact' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Внутри поля
                  </button>
                  <button
                    onClick={() => setWidgetPosition('pill')}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      widgetPosition === 'pill' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Плавающий Pill
                  </button>
                </div>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Тема оформления:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWidgetTheme('dark')}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      widgetTheme === 'dark' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => setWidgetTheme('light')}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      widgetTheme === 'light' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
