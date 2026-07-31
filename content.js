// Coursera Video Altyazı Çevirmeni - Sadece Türkçe (İngilizceyi Gizle)

(function() {
  'use strict';

  console.log('[TR] Video altyazı çevirmeni başladı');

  const cache = new Map();
  const observedTracks = new WeakSet();
  const observedVideos = new WeakSet();
  let transcriptSegments = [];
  let transcriptSignature = '';
  let transcriptPrefetchSignature = '';
  let cueSegments = [];
  let cueSignature = '';
  let sentenceSegments = [];
  let sentenceSignature = '';
  const captionSelectors = [
    '.vjs-text-track-display',
    '.vjs-text-track-cue',
    '.rc-CaptionArea',
    '.rc-CaptionText',
    '.rc-Captions',
    '.rc-VideoSubtitle',
    '.rc-VideoCaptions',
    '[class*="Caption"]',
    '[class*="caption"]',
    '[class*="subtitle"]',
    '[class*="Subtitle"]',
    '[class*="cue"]',
    '[data-testid*="caption"]',
    '[data-testid*="subtitle"]',
    '[aria-live="polite"]',
    '[aria-live="assertive"]'
  ];
  let lastCue = '';
  let overlayEl = null;
  let hideStyleEl = null;
  let lastOverlayKey = '';
  let isEnabled = true;
  let hideOriginal = true;
  let captionFontSize = 18;
  let localSettingsSignature = 'default';

  function disableStaleScript() {
    isEnabled = false;
    if (overlayEl) overlayEl.style.opacity = '0';
    return null;
  }

  function ensureOverlay(container) {
    if (overlayEl && document.contains(overlayEl)) return overlayEl;

    overlayEl = document.createElement('div');
    overlayEl.id = 'tr-video-caption-overlay';
    overlayEl.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: 54px;
      transform: translateX(-50%);
      background: rgba(13, 18, 32, 0.9);
      color: #fff;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: ${captionFontSize}px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-weight: 650;
      max-width: min(86%, 980px);
      text-align: center;
      z-index: 9999;
      pointer-events: none;
      line-height: 1.35;
      letter-spacing: 0;
      box-shadow: 0 12px 32px rgba(0, 0, 0, 0.34);
      border: 1px solid rgba(255, 255, 255, 0.14);
      transition: opacity 0.16s ease;
    `;

    const style = window.getComputedStyle(container);
    if (style.position === 'static') {
      container.style.position = 'relative';
    }

    container.appendChild(overlayEl);
    applyOverlaySettings();
    return overlayEl;
  }

  function applyOverlaySettings() {
    if (!overlayEl) return;
    overlayEl.style.fontSize = `${captionFontSize}px`;
  }

  async function translate(text, context = '', mode = 'caption') {
    if (!isEnabled) return null;
    if (typeof chrome === 'undefined' || !chrome.runtime?.sendMessage) {
      return disableStaleScript();
    }

    const cacheKey = `${localSettingsSignature}\n${mode}\n${context}\n---\n${text}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey);

    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ action: 'translate', text, context, mode }, (response) => {
          const error = chrome.runtime.lastError;
          if (error) {
            if (error.message?.includes('Extension context invalidated')) {
              disableStaleScript();
              resolve(null);
              return;
            }
            console.log('[TR] Eklenti mesaj hatası:', error.message);
            resolve(null);
            return;
          }

          if (response?.success) {
            cache.set(cacheKey, response.translatedText);
            resolve(response.translatedText);
          } else {
            console.log('[TR] API hatası:', response?.error);
            resolve(null);
          }
        });
      } catch (error) {
        disableStaleScript();
        resolve(null);
      }
    });
  }

  function normalizeCaptionText(text) {
    return (text || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isControlElement(element) {
    return Boolean(element.closest([
      'button',
      '[role="button"]',
      '[aria-label*="Play"]',
      '[aria-label*="Pause"]',
      '[aria-label*="Volume"]',
      '[aria-label*="Settings"]',
      '[aria-label*="Picture"]',
      '[class*="control"]',
      '[class*="Control"]',
      '[class*="pip"]',
      '[class*="Pip"]'
    ].join(',')));
  }

  function isUiControlText(text) {
    const normalized = normalizeCaptionText(text).toLowerCase();
    if (!normalized) return true;
    if (/\d{1,2}:\d{2}(?::\d{2})?\s*\/\s*\d{1,2}:\d{2}(?::\d{2})?/.test(normalized)) return true;
    if (/^(?:\d{1,2}:)?\d{1,2}:\d{2}$/.test(normalized)) return true;

    return [
      'picture in picture',
      'back to video',
      'videoya geri dön',
      'resim içinde resim',
      'play',
      'pause',
      'volume',
      'settings',
      'captions',
      'subtitles',
      'transcript',
      'notes',
      'downloads',
      'dil:',
      'language',
      'sonraki öğeye git',
      'karakter kullanıldı',
      'characters used',
      '/ 110'
    ].some(phrase => normalized.includes(phrase));
  }

  function parseTimeToSeconds(timeText) {
    const parts = timeText.split(':').map(Number);
    if (parts.some(Number.isNaN)) return null;

    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }

    return null;
  }

  function splitSubtitleChunks(text) {
    const normalized = normalizeCaptionText(text);
    if (!normalized) return [];

    const sentences = normalized.split(/(?<=[.!?])\s+/);
    const chunks = [];
    let current = '';

    for (const sentence of sentences) {
      if ((current + ' ' + sentence).trim().length <= 90) {
        current = (current + ' ' + sentence).trim();
      } else {
        if (current) chunks.push(current);

        if (sentence.length <= 90) {
          current = sentence;
        } else {
          const words = sentence.split(/\s+/);
          current = '';
          for (const word of words) {
            if ((current + ' ' + word).trim().length > 90) {
              if (current) chunks.push(current);
              current = word;
            } else {
              current = (current + ' ' + word).trim();
            }
          }
        }
      }
    }

    if (current) chunks.push(current);
    return chunks;
  }

  function extractTranscriptSegments(video) {
    const timeElements = [...document.querySelectorAll('span, div, p, button')]
      .filter(element => !isControlElement(element))
      .filter(element => /^\d{1,2}:\d{2}(?::\d{2})?$/.test(normalizeCaptionText(element.textContent)));
    const segmentsByStart = new Map();

    for (const timeElement of timeElements) {
      const timeText = normalizeCaptionText(timeElement.textContent);
      const start = parseTimeToSeconds(timeText);
      if (start === null) continue;

      let row = timeElement.parentElement;
      for (let depth = 0; row && depth < 6; depth += 1, row = row.parentElement) {
        let text = normalizeCaptionText(row.textContent)
          .replace(timeText, '')
          .replace(/Dil:\s*\w+/i, '')
          .trim();

        if (isControlElement(row)) continue;
        if (isUiControlText(text)) continue;
        if (text.length < 45) continue;
        if (!/[a-zA-Z]{8,}/.test(text)) continue;
        if (text.length > 1600) continue;

        if (!segmentsByStart.has(start) || text.length < segmentsByStart.get(start).text.length) {
          segmentsByStart.set(start, { start, text, translated: '', chunks: [], loading: false, retryAfter: 0 });
        }
        break;
      }
    }

    const segments = [...segmentsByStart.values()]
      .sort((a, b) => a.start - b.start)
      .filter((segment, index, all) => index === 0 || segment.text !== all[index - 1].text);

    for (let i = 0; i < segments.length; i += 1) {
      const next = segments[i + 1];
      segments[i].end = next?.start || (Number.isFinite(video.duration) ? video.duration : segments[i].start + 45);
      if (segments[i].end <= segments[i].start) {
        segments[i].end = segments[i].start + 45;
      }
    }

    return segments;
  }

  function refreshTranscriptSegments(video) {
    const segments = extractTranscriptSegments(video);
    if (segments.length === 0) return false;

    const signature = segments.map(segment => `${segment.start}:${segment.text.slice(0, 40)}`).join('|');
    if (signature === transcriptSignature) return transcriptSegments.length > 0;

    transcriptSignature = signature;
    transcriptSegments = segments;
    console.log('[TR] Transkript segmentleri bulundu:', transcriptSegments.length);
    return true;
  }

  async function translateTranscriptSegment(segment) {
    if (!segment || segment.translated || segment.loading) return;
    if (segment.retryAfter && Date.now() < segment.retryAfter) return;

    segment.loading = true;
    const translated = await translate(segment.text, '', 'transcript');
    segment.loading = false;

    if (!translated) {
      segment.retryAfter = Date.now() + 2500;
      return;
    }

    segment.retryAfter = 0;
    segment.translated = translated;
    segment.chunks = splitSubtitleChunks(translated);
  }

  function getTranscriptSegmentAt(time) {
    return transcriptSegments.find(segment => time >= segment.start && time < segment.end) || null;
  }

  function hasTranslatedTranscriptAt(time) {
    const segment = getTranscriptSegmentAt(time);
    return Boolean(segment?.translated);
  }

  function prefetchTranscriptAround(video) {
    if (video.paused) return;

    const current = getTranscriptSegmentAt(video.currentTime);
    if (!current) return;

    const index = transcriptSegments.indexOf(current);
    [current, transcriptSegments[index + 1]]
      .filter(Boolean)
      .forEach(segment => translateTranscriptSegment(segment));
  }

  function hideOverlay() {
    if (overlayEl) overlayEl.style.opacity = '0';
    lastOverlayKey = '';
  }

  function showTranscriptOverlay(video) {
    if (!transcriptSegments.length) return false;

    const segment = getTranscriptSegmentAt(video.currentTime);
    if (!segment) return false;

    if (!segment.translated) {
      translateTranscriptSegment(segment);
      return false;
    }

    const chunks = segment.chunks.length ? segment.chunks : [segment.translated];
    const progress = Math.min(0.999, Math.max(0, (video.currentTime - segment.start) / (segment.end - segment.start)));
    const chunkIndex = Math.min(chunks.length - 1, Math.floor(progress * chunks.length));
    const text = chunks[chunkIndex];

    if (text) {
      showOverlay(video.parentElement || video, text);
    }

    return true;
  }

  function getEnglishTrack(video) {
    if (!video || !video.textTracks) return null;
    
    // 1. Try to find English track
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if ((track.kind === 'subtitles' || track.kind === 'captions') && 
          track.language && track.language.startsWith('en')) {
        return track;
      }
    }
    
    // 2. Fallback to active/hidden track if no English track found
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if ((track.kind === 'subtitles' || track.kind === 'captions') && 
          (track.mode === 'showing' || track.mode === 'hidden') && track.cues?.length) {
        return track;
      }
    }
    
    // 3. Fallback to any subtitle/caption track with cues
    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if ((track.kind === 'subtitles' || track.kind === 'captions') && track.cues?.length) {
        return track;
      }
    }
    
    return null;
  }

  function refreshSentenceSegments(track) {
    if (!track?.cues?.length) return false;

    // Check if the signature has changed
    const signature = [...track.cues]
      .map(cue => `${cue.startTime}:${cue.endTime}:${(cue.text || '').slice(0, 12)}`)
      .join('|');
    if (signature === sentenceSignature) return sentenceSegments.length > 0;

    sentenceSignature = signature;
    const cues = [...track.cues]
      .filter(cue => Number.isFinite(cue.startTime) && Number.isFinite(cue.endTime) && cue.text)
      .sort((a, b) => a.startTime - b.startTime);

    if (!cues.length) {
      sentenceSegments = [];
      return false;
    }

    const newSentences = [];
    let currentSentence = {
      start: null,
      end: null,
      text: "",
      translated: "",
      loading: false,
      retryAfter: 0,
      cues: []
    };

    for (let i = 0; i < cues.length; i++) {
      const cue = cues[i];
      const cueText = normalizeCaptionText(cue.text);
      if (!cueText || isUiControlText(cueText)) continue;

      if (currentSentence.start === null) {
        currentSentence.start = cue.startTime;
      }
      currentSentence.end = cue.endTime;
      currentSentence.text = currentSentence.text ? currentSentence.text + " " + cueText : cueText;
      currentSentence.cues.push(cue);

      const endsWithPunctuation = /[.!?]$/.test(cueText) || cueText.includes('.') || cueText.includes('?') || cueText.includes('!');
      const hasGapToNext = i < cues.length - 1 && (cues[i + 1].startTime - cue.endTime > 1.5);

      if (endsWithPunctuation || hasGapToNext || i === cues.length - 1) {
        currentSentence.text = currentSentence.text.replace(/\s+/g, ' ').trim();
        
        if (currentSentence.text.length > 0 && /[a-zA-Z]{2,}/.test(currentSentence.text)) {
          newSentences.push(currentSentence);
        }

        currentSentence = {
          start: null,
          end: null,
          text: "",
          translated: "",
          loading: false,
          retryAfter: 0,
          cues: []
        };
      }
    }

    const existingTranslationMap = new Map(
      sentenceSegments.filter(s => s.translated).map(s => [s.text, s.translated])
    );

    sentenceSegments = newSentences.map(s => {
      if (existingTranslationMap.has(s.text)) {
        s.translated = existingTranslationMap.get(s.text);
      }
      return s;
    });

    console.log('[TR] Cümle tabanlı segmentler yenilendi. Toplam cümle:', sentenceSegments.length);
    return true;
  }

  function getSentenceSegmentAt(time) {
    return sentenceSegments.find(segment => time >= segment.start && time < segment.end) || null;
  }

  async function translateSentenceSegment(segment) {
    if (!segment || segment.translated || segment.loading) return;
    if (segment.retryAfter && Date.now() < segment.retryAfter) return;

    const index = sentenceSegments.indexOf(segment);
    const context = index > 0 ? sentenceSegments[index - 1].text : '';

    segment.loading = true;
    const translated = await translate(segment.text, context, 'caption');
    segment.loading = false;

    if (!translated) {
      segment.retryAfter = Date.now() + 2500;
      return;
    }

    segment.retryAfter = 0;
    segment.translated = translated;
  }

  function prefetchSentencesAround(video) {
    if (!sentenceSegments.length || video.paused) return;

    const currentIndex = sentenceSegments.findIndex(segment => video.currentTime < segment.end);
    if (currentIndex === -1) return;

    sentenceSegments
      .slice(currentIndex, currentIndex + 3)
      .forEach(segment => translateSentenceSegment(segment));
  }

  function showSentenceOverlay(video) {
    const segment = getSentenceSegmentAt(video.currentTime);
    if (!segment) return false;

    if (!segment.translated) {
      translateSentenceSegment(segment);
      hideOverlay();
      return true;
    }

    showOverlay(video.parentElement || video, segment.translated);
    return true;
  }


  function refreshCueSegments(track) {
    if (!track?.cues?.length) return false;

    const existingSegments = new Map(
      cueSegments.map(segment => [`${segment.start}:${segment.text}`, segment])
    );
    const segments = [...track.cues]
      .map(cue => ({
        start: cue.startTime,
        end: cue.endTime,
        text: normalizeCaptionText(cue.text),
        translated: '',
        loading: false,
        retryAfter: 0
      }))
      .filter(segment => Number.isFinite(segment.start) && Number.isFinite(segment.end))
      .filter(segment => segment.end > segment.start)
      .filter(segment => segment.text && !isUiControlText(segment.text))
      .filter(segment => /[a-zA-Z]{2,}/.test(segment.text))
      .filter(segment => segment.text.length <= 240);

    if (!segments.length) return false;

    const signature = segments.map(segment => `${segment.start}:${segment.text.slice(0, 32)}`).join('|');
    if (signature === cueSignature) return cueSegments.length > 0;

    cueSignature = signature;
    cueSegments = segments.map(segment => {
      const existing = existingSegments.get(`${segment.start}:${segment.text}`);
      return existing
        ? { ...segment, translated: existing.translated, loading: existing.loading, retryAfter: existing.retryAfter || 0 }
        : segment;
    });
    return true;
  }

  function getCueSegmentAt(time) {
    return cueSegments.find(segment => time >= segment.start && time < segment.end) || null;
  }

  function hasCueAt(time) {
    return Boolean(getCueSegmentAt(time));
  }

  async function translateCueSegment(segment) {
    if (!segment || segment.translated || segment.loading) return;
    if (segment.retryAfter && Date.now() < segment.retryAfter) return;

    const index = cueSegments.indexOf(segment);
    const context = index > 0 ? cueSegments[index - 1].text : '';

    segment.loading = true;
    const translated = await translate(segment.text, context, 'caption');
    segment.loading = false;

    if (!translated) {
      segment.retryAfter = Date.now() + 2500;
      return;
    }

    segment.retryAfter = 0;
    segment.translated = translated;
  }

  function prefetchCueAround(video) {
    if (!cueSegments.length || video.paused) return;

    const currentIndex = cueSegments.findIndex(segment => video.currentTime < segment.end);
    const startIndex = Math.max(0, currentIndex);
    cueSegments
      .slice(startIndex, startIndex + 3)
      .forEach(segment => translateCueSegment(segment));
  }

  function showCueOverlay(video) {
    const segment = getCueSegmentAt(video.currentTime);
    if (!segment) return false;

    if (!segment.translated) {
      translateCueSegment(segment);
      return false;
    }

    showOverlay(video.parentElement || video, segment.translated);
    return true;
  }

  function findVideoContainer(video) {
    return video.closest('.video-js, [class*="Video"], [data-testid*="video"]') ||
      video.parentElement ||
      document.body;
  }

  function getVisibleCaptionText(video) {
    const container = findVideoContainer(video);
    const elements = [
      ...container.querySelectorAll(captionSelectors.join(',')),
      ...document.querySelectorAll('.vjs-text-track-display, .vjs-text-track-cue')
    ];

    for (const element of elements) {
      if (element.id === 'tr-video-caption-overlay' || element.closest('#tr-video-caption-overlay')) continue;
      if (isControlElement(element)) continue;

      const text = normalizeCaptionText(element.textContent);
      if (!text || text === lastCue) continue;
      if (isUiControlText(text)) continue;
      if (!/[a-zA-Z]{2,}/.test(text)) continue;
      if (text.length > 240) continue;

      return text;
    }

    return '';
  }

  let currentCaptionSeqId = 0;
  let lastDisplayedSeqId = 0;

  async function handleCaptionText(video, rawText) {
    if (!isEnabled) return;

    const cueText = normalizeCaptionText(rawText);
    if (!cueText || cueText === lastCue) return;
    if (isUiControlText(cueText)) return;
    if (!/[a-zA-Z]{2,}/.test(cueText)) return;

    const context = lastCue;
    lastCue = cueText;
    setHideOriginal(hideOriginal);

    const seqId = ++currentCaptionSeqId;
    const translated = await translate(cueText, context);
    
    // Eski "cueText === lastCue" kontrolü gecikmeli çevirileri tamamen çöpe atarak cümle atlamasına sebep oluyordu.
    // Sequence ID mantığı ile sadece daha YENİ bir çeviri ekrana basılmışsa eskisini çöpe atıyoruz.
    if (translated && seqId > lastDisplayedSeqId) {
      lastDisplayedSeqId = seqId;
      const container = video.parentElement || video;
      showOverlay(container, translated);
    }
  }

  function setHideOriginal(enabled) {
    if (!enabled) {
      if (hideStyleEl && document.contains(hideStyleEl)) {
        hideStyleEl.remove();
      }
      hideStyleEl = null;
      return;
    }

    if (hideStyleEl && document.contains(hideStyleEl)) return;

    hideStyleEl = document.createElement('style');
    hideStyleEl.id = 'tr-hide-captions-style';
    hideStyleEl.textContent = `
      /* Orijinal İngilizce altyazı katmanlarını gizle */
      video::cue {
        visibility: hidden !important;
        opacity: 0 !important;
        color: transparent !important;
        background: transparent !important;
        text-shadow: none !important;
      }

      .vjs-text-track-display,
      .vjs-text-track-cue,
      .vjs-text-track-cue *,
      .rc-CaptionArea,
      .rc-CaptionText,
      .rc-Captions,
      .rc-VideoSubtitle,
      .rc-VideoCaptions,
      .rc-CaptionArea *,
      .rc-CaptionText *,
      .rc-Captions *,
      .rc-VideoSubtitle *,
      .rc-VideoCaptions *,
      [class*="Caption"],
      [class*="Caption"] *,
      [class*="caption"],
      [class*="caption"] *,
      [class*="subtitle"],
      [class*="subtitle"] *,
      [class*="Subtitle"],
      [class*="Subtitle"] *,
      [class*="cue"],
      [class*="cue"] *,
      [data-testid*="caption"],
      [data-testid*="caption"] *,
      [data-testid*="subtitle"],
      [data-testid*="subtitle"] *,
      [aria-live="polite"],
      [aria-live="assertive"] {
        visibility: hidden !important;
        opacity: 0 !important;
        color: transparent !important;
        text-shadow: none !important;
        background: transparent !important;
      }

      /* Kendi çeviri overlay'ımızı asla gizleme */
      #tr-video-caption-overlay {
        visibility: visible !important;
        opacity: 1 !important;
        color: #fff !important;
        background: rgba(13, 18, 32, 0.9) !important;
        text-shadow: none !important;
      }
    `;
    document.head.appendChild(hideStyleEl);
  }

  function showOverlay(container, text) {
    const overlayKey = normalizeCaptionText(text);
    if (!overlayKey) return;

    const overlay = ensureOverlay(container);
    if (overlayKey === lastOverlayKey) {
      overlay.style.opacity = '1';
      return;
    }

    overlay.textContent = text;
    overlay.style.opacity = '1';
    lastOverlayKey = overlayKey;

    setHideOriginal(hideOriginal);
  }

  function setupTextTrack(video) {
    if (!video || !video.textTracks) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;
      if (observedTracks.has(track)) continue;
      observedTracks.add(track);

      // Altyazılar kapalı olsa bile cue güncellensin
      try {
        track.mode = 'hidden';
      } catch (e) {
        // bazı tarayıcılar izin vermez
      }

      track.addEventListener('cuechange', async () => {
        const activeTrack = getEnglishTrack(video);
        if (activeTrack) {
          refreshSentenceSegments(activeTrack);
          prefetchSentencesAround(video);
          refreshCueSegments(activeTrack);
          prefetchCueAround(video);
        }
      });
    }
  }

  function setupCaptionPolling(video) {
    if (!video || observedVideos.has(video)) return;
    observedVideos.add(video);

    setInterval(() => {
      if (!isEnabled) return;

      const activeTrack = getEnglishTrack(video);
      if (activeTrack) {
        refreshSentenceSegments(activeTrack);
        refreshCueSegments(activeTrack);
      }

      refreshTranscriptSegments(video);

      // 1. Cümle tabanlı altyazı takibi (En iyi ve akıcı yöntem)
      if (sentenceSegments.length > 0) {
        if (showSentenceOverlay(video)) {
          prefetchSentencesAround(video);
          return;
        }
        hideOverlay();
        return;
      }

      // 2. Transkript sidebar tabanlı takip (Eski yöntem - fallback)
      if (showTranscriptOverlay(video)) {
        prefetchTranscriptAround(video);
        return;
      }

      // 3. Tekil cue takibi (Fallback)
      if (showCueOverlay(video)) {
        prefetchCueAround(video);
        return;
      }

      if (hasCueAt(video.currentTime)) {
        prefetchCueAround(video);
        return;
      }

      const captionText = getVisibleCaptionText(video);
      if (captionText) {
        handleCaptionText(video, captionText);
      } else {
        hideOverlay();
      }
    }, 250);
  }

  function init() {
    const video = document.querySelector('video');
    if (!video) return;
    setHideOriginal(hideOriginal);

    setupTextTrack(video);

    const activeTrack = getEnglishTrack(video);
    if (activeTrack) {
      refreshSentenceSegments(activeTrack);
      refreshCueSegments(activeTrack);
    }

    refreshTranscriptSegments(video);
    prefetchTranscriptAround(video);
    prefetchSentencesAround(video);
    setupCaptionPolling(video);
  }

  // Video yüklenmesini bekle
  setInterval(init, 1000);

  function updateRuntimeSettings(result) {
    const nextSignature = [
      result.provider || result.translationEngine || 'openai',
      result.targetLanguage || 'Türkçe',
      result.translationTone || 'natural',
      result.captionSize || '18'
    ].join('|');

    isEnabled = result.enabled !== false;
    hideOriginal = result.hideOriginal !== false;
    captionFontSize = Number(result.captionSize) || 18;

    if (nextSignature !== localSettingsSignature) {
      localSettingsSignature = nextSignature;
      cache.clear();
      lastCue = '';
      lastOverlayKey = '';
    }

    applyOverlaySettings();
    setHideOriginal(isEnabled && hideOriginal);
  }

  // Popup ayarlarını dinle
  chrome.storage.sync.get([
    'enabled',
    'hideOriginal',
    'captionSize',
    'provider',
    'translationEngine',
    'targetLanguage',
    'translationTone'
  ], updateRuntimeSettings);

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'sync') return;

    const watchedKeys = [
      'enabled',
      'hideOriginal',
      'captionSize',
      'provider',
      'translationEngine',
      'targetLanguage',
      'translationTone'
    ];

    if (!watchedKeys.some(key => changes[key])) return;

    chrome.storage.sync.get(watchedKeys, result => {
      updateRuntimeSettings(result);

      if (!isEnabled) {
        if (overlayEl) overlayEl.style.opacity = '0';
        setHideOriginal(false);
      }
    });
  });
})();
