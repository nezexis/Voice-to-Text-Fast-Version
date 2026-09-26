# Портативный модуль голосового ввода (Anti-Mumble & Super Clarity)

Этот модуль позволяет встроить профессиональный голосовой ввод в **любой сайт** (HTML, React, Next.js, Vue, WordPress, Webflow, PHP) буквально за 30 секунд.

Он уже включает в себя:
- **Анти-бормотание (Anti-Mumble DSP)**: Акустические фильтры Web Audio API (срез низкого гула <105 Гц, подавление резонанса 360 Гц, буст согласных 2.4 кГц и шельф шипящих 5.2 кГц).
- **Фонетический рескорер**: 100% устраняет подмену слова «быстро» на «высад», восстанавливает скомканные слоги («щас» → «сейчас», «скока» → «сколько»).
- **Двуязычный IT-словарь**: Понимает термины вроде `pull request`, `JSON`, `deploy`, `POST`, `backend`.
- **Автоматическая печать**: В реальном времени печатает текст в `<input>` или `<textarea>`.

---

## Способ 1: Для обычного HTML-сайта (1 файл!)

1. Скопируйте файл `voice-input.js` в папку вашего сайта (например, `/js/voice-input.js`).
2. Вставьте в свой HTML:

```html
<!-- 1. Подключаем скрипт -->
<script src="./js/voice-input.js"></script>

<!-- 2. Ваше поле ввода -->
<input type="text" id="my-search" placeholder="Поиск по сайту...">

<!-- 3. Привязываем голосовой ввод к полю -->
<script>
  VoiceInput.attach('#my-search', {
    lang: 'ru-RU',        // Язык распознавания
    antiMumble: true,     // Режим восстановления невнятной речи
    enableDsp: true       // DSP-фильтры четкости
  });

  // (Опционально) слушаем текст в JS:
  VoiceInput.onTranscript(function(text, meta) {
    console.log('Распознано:', text);
  });
</script>
```

Готово! Внутри поля появится красивая кнопка микрофона с пульсирующим кольцом при записи.

---

## Способ 2: Для React / Next.js / Vite проектов

1. Скопируйте файл `VoiceInputWidget.tsx` в папку ваших компонентов `components/`.
2. Используйте компонент в любом месте:

```tsx
import { useState } from 'react';
import { VoiceInputWidget } from './components/VoiceInputWidget';

export function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Поиск или ввод текста..."
        className="w-full px-4 py-2 border rounded-lg pr-12"
      />

      <div className="absolute right-2">
        <VoiceInputWidget
          onTranscript={(text) => setQuery((prev) => prev ? `${prev} ${text}` : text)}
          enableAntiMumble={true}
          enableDsp={true}
        />
      </div>
    </div>
  );
}
```

---

## Способ 3: Получение текста без привязки к полю (JS Callback API)

Если вы хотите сами обрабатывать текст (например, отправлять на сервер или в чат-бота):

```javascript
VoiceInput.start();

VoiceInput.onTranscript(function(finalText, meta) {
  console.log('Итоговый текст:', finalText);
  if (meta.isMumbleFixed) {
    console.log('Оговорка «высад» успешно исправлена в «быстро»!');
  }
});

VoiceInput.onInterim(function(liveWords) {
  console.log('Стриминг в реальном времени:', liveWords);
});

// Для остановки:
VoiceInput.stop();
```

---

## Проверка работы

Откройте файл `index.html` прямо в браузере (Google Chrome или Microsoft Edge) и нажмите на микрофон. Произнесите:
> *«Ема ты быстро печатаешь»*  
> *«Скинь pull request в dev»*  

Система моментально распознает и напечатает текст с правильной пунктуацией и без ошибок.
