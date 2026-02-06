// Coursera Video Altyazı Çevirmeni - Sadece Türkçe (İngilizceyi Gizle)

(function () {
  'use strict';

  console.log('[TR] Video altyazı çevirmeni başladı');

  const cache = new Map();
  let lastCue = '';
  let overlayEl = null;
  let hideStyleEl = null;
  let hideTimeout = null;
  let isTranslating = false;
  let isEnabled = true;

  function ensureOverlay(container) {
    if (overlayEl && document.contains(overlayEl)) return overlayEl;

    overlayEl = document.createElement('div');
    overlayEl.id = 'tr-video-caption-overlay';
    overlayEl.style.cssText = `
      position: absolute;
      left: 50%;
      bottom: 48px;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.95);
      color: #fff;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 18px;
      font-family: Arial, sans-serif;
      max-width: 80%;
      text-align: center;
      z-index: 9999;
      pointer-events: none;
      line-height: 1.4;
    `;

    const style = window.getComputedStyle(container);
    if (style.position === 'static') {
      container.style.position = 'relative';
    }

    container.appendChild(overlayEl);
    return overlayEl;
  }

  async function translate(text) {
    if (!isEnabled) return null;
    if (cache.has(text)) return cache.get(text);

    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'translate', text }, (response) => {
        if (response?.success) {
          cache.set(text, response.translatedText);
          resolve(response.translatedText);
        } else {
          console.error('[TR] API hatası:', response?.error);
          resolve(null);
        }
      });
    });
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
      .vjs-text-track-display,
      .vjs-text-track-cue,
      .rc-CaptionArea,
      .rc-CaptionText,
      .rc-Captions,
      .rc-VideoSubtitle,
      .rc-VideoCaptions,
      [class*="Caption"],
      [class*="caption"],
      [class*="subtitle"],
      [class*="Subtitle"],
      [class*="cue"],
      [data-testid*="caption"],
      [data-testid*="subtitle"],
      [aria-live="polite"],
      [aria-live="assertive"] {
        visibility: hidden !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(hideStyleEl);
  }

  function showOverlay(container, text) {
    const overlay = ensureOverlay(container);
    overlay.textContent = text;
    overlay.style.opacity = '1';

    // Sadece Türkçe görünsün diye orijinali gizle
    setHideOriginal(true);
  }

  function setupTextTrack(video) {
    if (!video || !video.textTracks) return;

    for (let i = 0; i < video.textTracks.length; i++) {
      const track = video.textTracks[i];
      if (track.kind !== 'subtitles' && track.kind !== 'captions') continue;

      // Altyazılar kapalı olsa bile cue güncellensin
      try {
        track.mode = 'hidden';
      } catch (e) {
        // bazı tarayıcılar izin vermez
      }

      track.addEventListener('cuechange', async () => {
        if (!isEnabled) return;
        if (isTranslating) return;
        const cues = track.activeCues;
        if (!cues || cues.length === 0) return;

        const cueText = cues[0].text?.trim();
        if (!cueText || cueText === lastCue) return;
        if (!/[a-zA-Z]{2,}/.test(cueText)) return;

        lastCue = cueText;
        isTranslating = true;

        const translated = await translate(cueText);
        if (translated) {
          // Orijinali değiştirmeden sadece Türkçe overlay göster
          const container = video.parentElement || video;
          showOverlay(container, translated);
        }

        isTranslating = false;
      });
    }
  }

  function init() {
    const video = document.querySelector('video');
    if (!video) return;
    setupTextTrack(video);
  }

  // Video yüklenmesini bekle
  setInterval(init, 1000);

  // Toggle dinle
  chrome.storage.sync.get(['enabled'], (result) => {
    isEnabled = result.enabled !== false;
  });

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.enabled) {
      isEnabled = changes.enabled.newValue !== false;
      if (!isEnabled) {
        // Kapatınca overlay'i gizle ve orijinali göster
        if (overlayEl) overlayEl.style.opacity = '0';
        setHideOriginal(false);
      }
    }
  });
})();
