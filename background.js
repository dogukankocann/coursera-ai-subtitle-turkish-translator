// Çeviri önbelleği
const translationCache = new Map();

// Rate limit - Tier 1 için 1.5 saniye bekleme
let lastRequestTime = 0;

async function waitForRateLimit() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  const waitTime = 1500; // 1.5 saniye
  
  if (elapsed < waitTime) {
    console.log('[BG] Rate limit bekleniyor:', waitTime - elapsed, 'ms');
    await new Promise(r => setTimeout(r, waitTime - elapsed));
  }
  lastRequestTime = Date.now();
}

// OpenAI API ile çeviri
async function translateText(text, apiKey, model, allowFallback = true) {
  const cacheKey = `${model}::${text}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  if (!text || text.trim().length < 2) {
    return text;
  }

  await waitForRateLimit();

  console.log('[BG] API isteği gönderiliyor:', text.substring(0, 30));

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'Sen profesyonel bir çevirmensin. Verilen İngilizce metni doğal Türkçeye çevir. Sadece çeviriyi döndür.'
          },
          {
            role: 'user',
            content: text
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const error = await response.json();
      const errorMessage = error.error?.message || 'API hatası';
      const errorCode = error.error?.code || '';
      console.error('[BG] API hatası:', error);

      if (
        allowFallback &&
        model !== 'gpt-4o-mini' &&
        (errorCode === 'model_not_found' || /model/i.test(errorMessage))
      ) {
        console.warn('[BG] Model bulunamadı, gpt-4o-mini ile deneniyor');
        return translateText(text, apiKey, 'gpt-4o-mini', false);
      }

      throw new Error(errorMessage);
    }

    const data = await response.json();
    const translatedText = data.choices[0].message.content.trim();

    console.log('[BG] ✓ Çevrildi:', translatedText.substring(0, 30));
    translationCache.set(cacheKey, translatedText);

    return translatedText;
  } catch (error) {
    console.error('[BG] Çeviri hatası:', error);
    throw error;
  }
}

// Mesaj dinleyici
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    chrome.storage.sync.get(['apiKey', 'enabled', 'openaiModel'], async (result) => {
      if (result.enabled === false) {
        sendResponse({ success: false, error: 'Çeviri devre dışı' });
        return;
      }

      if (!result.apiKey) {
        sendResponse({ success: false, error: 'API key yok' });
        return;
      }

      try {
        const model = result.openaiModel || 'gpt-4o-mini';
        const translatedText = await translateText(request.text, result.apiKey, model);
        sendResponse({ success: true, translatedText });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }

  if (request.action === 'clearCache') {
    translationCache.clear();
    sendResponse({ success: true });
    return true;
  }
});

console.log('[BG] Background script hazır');
