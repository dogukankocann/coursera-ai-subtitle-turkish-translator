const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    model: 'gemini-3.1-flash-lite',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    apiKeyUrl: 'https://aistudio.google.com/app/apikey',
    placeholder: 'AIza...'
  },
  openai: {
    label: 'OpenAI (ChatGPT)',
    model: 'gpt-4o-mini',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-...'
  }
};

const DEFAULT_SETTINGS = {
  enabled: true,
  provider: 'gemini',
  targetLanguage: 'Türkçe',
  translationTone: 'natural',
  hideOriginal: true,
  captionSize: '18',
  temperature: 0.3,
  providerApiKeys: {},
  providerModels: {},
  providerBaseUrls: {}
};

const enableToggle = document.getElementById('enableToggle');
const modelInput = document.getElementById('modelInput');
const apiKeyInput = document.getElementById('apiKey');
const baseUrlInput = document.getElementById('baseUrlInput');
const temperatureInput = document.getElementById('temperatureInput');
const targetLanguage = document.getElementById('targetLanguage');
const translationTone = document.getElementById('translationTone');
const hideOriginalToggle = document.getElementById('hideOriginalToggle');
const captionSize = document.getElementById('captionSize');
const saveBtn = document.getElementById('saveBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const statusDiv = document.getElementById('status');
const toggleVisibility = document.getElementById('toggleVisibility');
const apiKeyLink = document.getElementById('apiKeyLink');
const providerCards = [...document.querySelectorAll('.provider-card')];
const geminiModelLabel = document.getElementById('geminiModelLabel');
const openaiModelLabel = document.getElementById('openaiModelLabel');

let settings = { ...DEFAULT_SETTINGS };

function mergeSettings(result) {
  const providerApiKeys = { ...(result.providerApiKeys || {}) };
  if (result.apiKey && !providerApiKeys.openai) {
    providerApiKeys.openai = result.apiKey;
  }

  return {
    ...DEFAULT_SETTINGS,
    ...result,
    provider: result.provider || DEFAULT_SETTINGS.provider,
    providerApiKeys,
    providerModels: { ...(result.providerModels || {}) },
    providerBaseUrls: { ...(result.providerBaseUrls || {}) },
    captionSize: String(result.captionSize || DEFAULT_SETTINGS.captionSize),
    temperature: Number.isFinite(Number(result.temperature)) ? Number(result.temperature) : DEFAULT_SETTINGS.temperature
  };
}

function getProviderConfig(provider = settings.provider) {
  return PROVIDERS[provider] || PROVIDERS.gemini;
}

function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;

  clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = setTimeout(() => {
    statusDiv.className = 'status';
    statusDiv.textContent = '';
  }, 3200);
}

function updateProviderUI() {
  const provider = settings.provider;
  const config = getProviderConfig(provider);

  apiKeyLink.href = config.apiKeyUrl;
  apiKeyInput.placeholder = config.placeholder;
  modelInput.value = settings.providerModels[provider] || config.model;
  apiKeyInput.value = settings.providerApiKeys[provider] || '';
  baseUrlInput.value = settings.providerBaseUrls[provider] || '';

  providerCards.forEach(card => {
    card.classList.toggle('active', card.dataset.provider === provider);
  });

  // Kart altındaki model etiketlerini güncelle
  geminiModelLabel.textContent = settings.providerModels.gemini || PROVIDERS.gemini.model;
  openaiModelLabel.textContent = settings.providerModels.openai || PROVIDERS.openai.model;
}

function saveCurrentProviderFields() {
  const provider = settings.provider;
  settings.providerApiKeys[provider] = apiKeyInput.value.trim();
  settings.providerModels[provider] = modelInput.value.trim() || getProviderConfig(provider).model;
  settings.providerBaseUrls[provider] = baseUrlInput.value.trim();
}

function collectSettings() {
  saveCurrentProviderFields();

  return {
    enabled: enableToggle.checked,
    provider: settings.provider,
    targetLanguage: targetLanguage.value,
    translationTone: translationTone.value,
    hideOriginal: hideOriginalToggle.checked,
    captionSize: captionSize.value,
    temperature: Number(temperatureInput.value) || 0.3,
    providerApiKeys: { ...settings.providerApiKeys },
    providerModels: { ...settings.providerModels },
    providerBaseUrls: { ...settings.providerBaseUrls }
  };
}

function loadSettings() {
  chrome.storage.sync.get([...Object.keys(DEFAULT_SETTINGS), 'apiKey'], result => {
    settings = mergeSettings(result);

    enableToggle.checked = settings.enabled !== false;
    targetLanguage.value = settings.targetLanguage;
    translationTone.value = settings.translationTone;
    hideOriginalToggle.checked = settings.hideOriginal !== false;
    captionSize.value = settings.captionSize;
    temperatureInput.value = settings.temperature;

    updateProviderUI();
  });
}

// Provider kart seçimi
providerCards.forEach(card => {
  card.addEventListener('click', () => {
    const newProvider = card.dataset.provider;
    if (newProvider === settings.provider) return;

    // Mevcut provider'ın alanlarını kaydet
    saveCurrentProviderFields();

    // Yeni provider'a geç
    settings.provider = newProvider;
    updateProviderUI();
    showStatus(`${getProviderConfig(newProvider).label} seçildi`, 'info');
  });
});

enableToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ enabled: enableToggle.checked }, () => {
    showStatus(enableToggle.checked ? 'Çeviri aktif' : 'Çeviri kapalı', enableToggle.checked ? 'success' : 'info');
  });
});

hideOriginalToggle.addEventListener('change', () => {
  chrome.storage.sync.set({ hideOriginal: hideOriginalToggle.checked }, () => {
    showStatus(hideOriginalToggle.checked ? 'Orijinal altyazı gizlenecek' : 'Orijinal altyazı görünecek', 'info');
  });
});

captionSize.addEventListener('change', () => {
  chrome.storage.sync.set({ captionSize: captionSize.value }, () => {
    showStatus('Altyazı boyutu güncellendi', 'success');
  });
});

saveBtn.addEventListener('click', () => {
  const nextSettings = collectSettings();

  if (nextSettings.temperature < 0 || nextSettings.temperature > 2) {
    showStatus('Sıcaklık 0 ile 2 arasında olmalı.', 'error');
    return;
  }

  chrome.storage.sync.set(nextSettings, () => {
    settings = { ...settings, ...nextSettings };
    showStatus('Ayarlar kaydedildi ✓', 'success');
  });
});

clearCacheBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'clearCache' }, () => {
    showStatus('Önbellek temizlendi', 'success');
  });
});

toggleVisibility.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleVisibility.textContent = isPassword ? '🙈' : '👁';
});

[apiKeyInput, modelInput, baseUrlInput, temperatureInput].forEach(input => {
  input.addEventListener('keydown', event => {
    if (event.key === 'Enter') saveBtn.click();
  });
});

document.addEventListener('DOMContentLoaded', loadSettings);
