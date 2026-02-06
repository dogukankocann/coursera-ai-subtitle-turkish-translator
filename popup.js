// DOM Elementleri
const enableToggle = document.getElementById('enableToggle');
const engineSelect = document.getElementById('engineSelect');
const apiKeyGroup = document.getElementById('apiKeyGroup');
const modelGroup = document.getElementById('modelGroup');
const apiKeyInput = document.getElementById('apiKey');
const modelSelect = document.getElementById('modelSelect');
const saveBtn = document.getElementById('saveBtn');
const clearCacheBtn = document.getElementById('clearCacheBtn');
const statusDiv = document.getElementById('status');
const toggleVisibility = document.getElementById('toggleVisibility');

// Durum mesajı göster
function showStatus(message, type = 'info') {
  statusDiv.textContent = message;
  statusDiv.className = 'status ' + type;
  statusDiv.style.display = 'block';
  setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
}

// OpenAI ayarlarını göster/gizle
function updateOpenAiVisibility() {
  const isOpenAi = engineSelect.value === 'openai';
  apiKeyGroup.style.display = isOpenAi ? 'block' : 'none';
  modelGroup.style.display = isOpenAi ? 'block' : 'none';
}

// Ayarları yükle
function loadSettings() {
  chrome.storage.sync.get(['apiKey', 'enabled', 'translationEngine', 'openaiModel'], result => {


    enableToggle.checked = result.enabled !== false;
    engineSelect.value = result.translationEngine || 'openai';
    if (result.apiKey) apiKeyInput.value = result.apiKey;
    modelSelect.value = result.openaiModel || 'gpt-4o-mini';

    updateOpenAiVisibility();
  });
}

// Toggle değiştiğinde
enableToggle.addEventListener('change', () => {
  const newState = enableToggle.checked;
  chrome.storage.sync.set({ enabled: newState }, () => {
    console.log('Çeviri durumu:', newState);
    showStatus(newState ? 'Çeviri aktif!' : 'Çeviri devre dışı', newState ? 'success' : 'info');
  });
});

// Motor değiştiğinde
engineSelect.addEventListener('change', () => {
  updateOpenAiVisibility();
  chrome.storage.sync.set({ translationEngine: engineSelect.value }, () => {
    const name = engineSelect.value === 'openai' ? 'OpenAI GPT' : 'Google Translate';
    showStatus(name + ' seçildi', 'success');
  });
});

// Kaydet butonu
saveBtn.addEventListener('click', () => {
  const apiKey = apiKeyInput.value.trim();

  if (engineSelect.value === 'openai' && apiKey && !apiKey.startsWith('sk-')) {
    showStatus('API key "sk-" ile başlamalı', 'error');
    return;
  }

  chrome.storage.sync.set({
    apiKey: apiKey,
    enabled: enableToggle.checked,
    translationEngine: engineSelect.value,
    openaiModel: modelSelect.value
  }, () => {
    showStatus('Kaydedildi!', 'success');
  });
});

// Önbellek temizle
clearCacheBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'clearCache' }, response => {
    showStatus('Önbellek temizlendi!', 'success');
  });
});

// API key görünürlüğü
toggleVisibility.addEventListener('click', () => {
  const isPassword = apiKeyInput.type === 'password';
  apiKeyInput.type = isPassword ? 'text' : 'password';
  toggleVisibility.textContent = isPassword ? '🙈' : '👁';
});

// Enter ile kaydet
apiKeyInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') saveBtn.click();
});

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', loadSettings);
