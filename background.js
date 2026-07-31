const translationCache = new Map();
const pendingTranslations = new Map();

const PROVIDERS = {
  gemini: {
    label: 'Gemini',
    model: 'gemini-3.1-flash-lite',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    type: 'gemini'
  },
  openai: {
    label: 'OpenAI',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    type: 'openai'
  }
};

const DEFAULT_SETTINGS = {
  enabled: true,
  provider: 'gemini',
  targetLanguage: 'Türkçe',
  translationTone: 'natural',
  temperature: 0.3,
  providerApiKeys: {},
  providerModels: {},
  providerBaseUrls: {}
};

const MIN_REQUEST_INTERVAL_MS = 350;
const RATE_LIMIT_FALLBACK_MS = 2500;

let lastRequestTime = 0;
let cooldownUntil = 0;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRetryDelay(message) {
  const match = String(message || '').match(/try again in\s+(\d+)ms/i);
  if (!match) return RATE_LIMIT_FALLBACK_MS;
  return Math.max(Number(match[1]), RATE_LIMIT_FALLBACK_MS);
}

async function waitForRateLimit() {
  let now = Date.now();
  if (cooldownUntil > now) {
    await sleep(cooldownUntil - now);
    now = Date.now();
  }

  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_REQUEST_INTERVAL_MS) {
    await sleep(MIN_REQUEST_INTERVAL_MS - elapsed);
  }

  lastRequestTime = Date.now();
}

function cleanBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function mergeSettings(result) {
  const providerApiKeys = { ...(result.providerApiKeys || {}) };
  if (result.apiKey && !providerApiKeys.openai) {
    providerApiKeys.openai = result.apiKey;
  }

  const provider = result.provider || DEFAULT_SETTINGS.provider;

  return {
    ...DEFAULT_SETTINGS,
    ...result,
    provider,
    providerApiKeys,
    providerModels: { ...(result.providerModels || {}) },
    providerBaseUrls: { ...(result.providerBaseUrls || {}) },
    temperature: Number.isFinite(Number(result.temperature)) ? Number(result.temperature) : DEFAULT_SETTINGS.temperature
  };
}

function getProviderRuntime(settings) {
  const providerKey = settings.provider || 'gemini';
  const provider = PROVIDERS[providerKey] || PROVIDERS.gemini;

  const rawBaseUrl = settings.providerBaseUrls?.[providerKey] || '';
  const baseUrl = rawBaseUrl.trim() ? cleanBaseUrl(rawBaseUrl) : provider.baseUrl;

  return {
    key: providerKey,
    type: provider.type,
    label: provider.label,
    model: settings.providerModels[providerKey] || provider.model,
    baseUrl: baseUrl,
    apiKey: settings.providerApiKeys[providerKey] || ''
  };
}

function getToneInstruction(tone) {
  const tones = {
    natural: 'doğal, akıcı ve eğitim videosuna uygun',
    technical: 'teknik terimleri dikkatle koruyan, net ve profesyonel',
    simple: 'kısa, sade ve kolay anlaşılır',
    literal: 'kaynak metne daha sadık, ama hedef dilde anlaşılır'
  };

  return tones[tone] || tones.natural;
}

function buildTranslationMessages(text, context, mode, settings) {
  const targetLanguage = settings.targetLanguage || 'Türkçe';
  const tone = getToneInstruction(settings.translationTone);
  const sharedRules = [
    `Hedef dil: ${targetLanguage === 'Türkçe' ? 'Türkiye Türkçesi (Modern Turkish)' : targetLanguage}.`,
    `Üslup: ${tone}.`,
    'Sadece çeviriyi döndür; açıklama, başlık, tırnak işareti, düşünme/akıl yürütme veya ek not yazma.',
    'ÖNEMLİ: Kesinlikle akıl yürütme, düşünme süreci (thinking/reasoning), içsel konuşma veya açıklama adımları YAPMA. Doğrudan ve SADECE nihai çeviri metnini döndür.',
    'Teknik terimleri doğru koru ve cümleleri hedef dilin doğal söz dizimine göre kur.',
    'ÖNEMLİ: Asla orijinal metni çevirmeden aynen bırakma. Mutlaka hedef dile çevir.',
    'ÖNEMLİ: Hedef dil Türkçe ise, kesinlikle modern Türkiye Türkçesi kullan (Azerice vb. kullanma).'
  ];

  if (mode === 'transcript') {
    return [
      {
        role: 'system',
        content: [
          'Sen Coursera eğitim videoları için profesyonel transkript çevirmenisin.',
          ...sharedRules,
          'Verilen transkript bölümünü bütün anlamı koruyarak çevir.'
        ].join(' ')
      },
      {
        role: 'user',
        content: text
      }
    ];
  }

  return [
    {
      role: 'system',
      content: [
        'Sen Coursera eğitim videoları için gerçek zamanlı altyazı çevirmenisin.',
        ...sharedRules,
        'Çevrilecek metin bütün bir cümledir (veya anlamlı bir konuşma parçası).',
        'Önceki cümle/parça sadece bağlamdır (context); yalnızca çevrilecek mevcut cümlenin çevirisini döndür.'
      ].join(' ')
    },
    {
      role: 'user',
      content: [
        context ? `Önceki cümle bağlamı: ${context}` : 'Önceki cümle bağlamı: yok',
        `Çevrilecek mevcut cümle: ${text}`
      ].join('\n')
    }
  ];
}

function getMaxTokens(mode) {
  return 1000;
}

async function parseJsonResponse(response) {
  const text = await response.text();
  if (!text) return {};

  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(text.slice(0, 240) || 'API yanıtı JSON değil');
  }
}

function extractGeminiContent(data) {
  return (data.candidates?.[0]?.content?.parts || [])
    .map(part => part.text || '')
    .join('')
    .trim();
}



function cleanTranslationOutput(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^(?:\*\*?)?(?:current sentence|mevcut cümle|translation|çeviri|ceviri|current text|mevcut metin)(?:\*\*?)?\s*:\s*/gi, '')
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, '')
    .trim();
}

async function assertOk(response) {
  if (response.ok) return;

  const error = await parseJsonResponse(response).catch(() => ({}));
  const message = error.error?.message || error.message || `${response.status} API hatası`;

  if (response.status === 429) {
    const retryDelay = getRetryDelay(message);
    cooldownUntil = Date.now() + retryDelay;
    throw new Error('rate_limited');
  }

  throw new Error(message);
}

async function translateWithGemini(runtime, messages, mode, settings) {
  const systemMessage = messages.find(message => message.role === 'system')?.content || '';
  const userMessage = messages.find(message => message.role === 'user')?.content || '';
  const url = `${runtime.baseUrl}/models/${encodeURIComponent(runtime.model)}:generateContent?key=${encodeURIComponent(runtime.apiKey)}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      system_instruction: {
        parts: [{ text: systemMessage }]
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ],
      generationConfig: {
        maxOutputTokens: getMaxTokens(mode),
        temperature: settings.temperature
      }
    })
  });

  await assertOk(response);
  const data = await parseJsonResponse(response);
  const translatedText = extractGeminiContent(data);
  if (!translatedText) throw new Error('Boş çeviri yanıtı');
  return translatedText;
}

async function translateWithOpenAICompatible(messages, config) {
  const url = config.baseUrl.endsWith('/')
    ? `${config.baseUrl}chat/completions`
    : `${config.baseUrl}/chat/completions`;

  const modelName = String(config.model || '').trim().toLowerCase();
  const isReasoningModel = modelName.startsWith('o1') || modelName.startsWith('o3') || modelName.includes('o1-') || modelName.includes('o3-');

  const requestBody = {
    model: config.model,
    messages: messages
  };

  if (!isReasoningModel) {
    requestBody.temperature = config.temperature;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.error?.message || errorMsg;
    } catch (e) {}
    throw new Error(`OpenAI API Error (${response.status}): ${errorMsg}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('Invalid response format from OpenAI API');
  }

  return content.trim();
}

async function callProvider(runtime, messages, mode, settings, text, context) {
  if (runtime.type === 'gemini') {
    return translateWithGemini(runtime, messages, mode, settings);
  }

  if (runtime.type === 'openai') {
    const config = {
      targetLanguage: settings.targetLanguage,
      translationTone: settings.translationTone,
      temperature: settings.temperature,
      baseUrl: runtime.baseUrl,
      model: runtime.model,
      apiKey: runtime.apiKey
    };
    return translateWithOpenAICompatible(messages, config);
  }

  throw new Error(`Bilinmeyen sağlayıcı tipi: ${runtime.type}`);
}

async function translateText(text, context = '', mode = 'caption', settings) {
  const runtime = getProviderRuntime(settings);
  const cacheKey = [
    runtime.key,
    runtime.model,
    settings.targetLanguage,
    settings.translationTone,
    mode,
    context,
    text
  ].join('\n');

  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  if (pendingTranslations.has(cacheKey)) {
    return pendingTranslations.get(cacheKey);
  }

  if (!text || text.trim().length < 2) {
    return text;
  }

  const pending = translateTextUncached(text, context, mode, settings, runtime, cacheKey)
    .finally(() => pendingTranslations.delete(cacheKey));
  pendingTranslations.set(cacheKey, pending);
  return pending;
}

async function translateTextUncached(text, context, mode, settings, runtime, cacheKey) {
  await waitForRateLimit();

  console.log('[BG] Çeviri isteği:', runtime.label, runtime.model, text.substring(0, 30));
  console.log('[BG] Key Tanısı:', runtime.label, 'Key Uzunluğu:', runtime.apiKey ? runtime.apiKey.length : 0, 'Son 4 karakter:', runtime.apiKey ? runtime.apiKey.slice(-4) : 'yok');

  const messages = buildTranslationMessages(text, context, mode, settings);
  const rawOutput = await callProvider(runtime, messages, mode, settings, text, context);
  console.log('[BG] Raw output length:', rawOutput.length, 'Content:', rawOutput.substring(0, 80));
  
  const translatedText = cleanTranslationOutput(rawOutput);

  if (!translatedText) {
    throw new Error('Boş çeviri yanıtı');
  }

  translationCache.set(cacheKey, translatedText);
  console.log('[BG] ✓ Çevrildi:', translatedText.substring(0, 30));

  return translatedText;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    chrome.storage.sync.get([...Object.keys(DEFAULT_SETTINGS), 'apiKey'], async (result) => {
      const settings = mergeSettings(result);
      const runtime = getProviderRuntime(settings);

      if (settings.enabled === false) {
        sendResponse({ success: false, error: 'Çeviri devre dışı' });
        return;
      }

      if (!runtime.apiKey) {
        sendResponse({ success: false, error: `${runtime.label} API key yok` });
        return;
      }

      try {
        const translatedText = await translateText(
          request.text,
          request.context || '',
          request.mode || 'caption',
          settings
        );

        sendResponse({ success: true, translatedText });
      } catch (error) {
        sendResponse({ success: false, error: error.message });
      }
    });
    return true;
  }

  if (request.action === 'clearCache') {
    translationCache.clear();
    pendingTranslations.clear();
    sendResponse({ success: true });
    return true;
  }

  return false;
});

console.log('[BG] Çoklu sağlayıcı çeviri servisi hazır');
