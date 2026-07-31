# Chrome Web Store Listing — Coursera AI Altyazı Çevirmeni

> Last Updated: 2026-07-31

## Store Listing

**Extension Name**
Coursera AI Altyazı Çevirmeni

**Short Description** (Max 132 chars)
Coursera videolarındaki İngilizce altyazıları Gemini ve OpenAI yapay zeka modelleri ile anında Türkçe'ye çevirir.

**Detailed Description** (Formatted for Chrome Web Store)
Coursera kurs derslerinizi Türkçe altyazı desteğiyle daha verimli takip edin!

Coursera AI Altyazı Çevirmeni, Coursera platformundaki videoların İngilizce altyazılarını yapay zeka (Google Gemini, OpenAI GPT vb.) güçleriyle eşzamanlı olarak Türkçe'ye dönüştürür.

ÖNE ÇIKAN ÖZELLİKLER:
• Doğal ve Bağlama Uygun Çeviri: Sözcük sözcük değil, cümlenin anlamına uygun akıcı Türkçe çeviriler.
• Esnek Yapay Zeka Seçenekleri: Kendi Google Gemini veya OpenAI API anahtarınızı kullanarak hızlı çeviri imkanı.
• Yerel Model Desteği: Dilerseniz Ollama / Localhost üzerinden tamamen ücretsiz yerel yapay zeka modelleriyle kullanım.
• Şık ve Özelleştirilebilir Arayüz: Altyazı yazı boyutunu, rengini, arka plan saydamlığını ve konumunu dilediğiniz gibi ayarlayın.
• Yüksek Performans: Çevrilen altyazıları önbelleğe alarak API limitlerinizi ve kotanızı korur.

KULLANIM:
1. Eklenti simgesine tıklayıp tercih ettiğiniz Yapay Zeka sağlayıcısını ve API anahtarınızı girin.
2. Coursera'da herhangi bir video dersini açın.
3. Altyazılar otomatik olarak Türkçe olarak görüntülenecektir!

GÜVENLİK VE GİZLİLİK:
API anahtarlarınız ve kişisel tercihleriniz kesinlikle hiçbir sunucuya gönderilmez, yalnızca kendi tarayıcınızda (chrome.storage) güvenle saklanır.

**Category**
Productivity / Accessibility

**Single Purpose**
Translates English subtitles on Coursera course videos into Turkish in real-time using user-configured AI APIs.

**Primary Language**
Turkish (tr)

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ✅ Ready | `icons/icon128.png` |
| Screenshot 1 | 1280×800 PNG | 🟡 Hazırlanacak | Coursera üzerinde canlı Türkçe altyazı ekranı |
| Screenshot 2 | 1280×800 PNG | 🟡 Hazırlanacak | Eklenti popup ayarlar paneli (Gemini / OpenAI seçimi) |
| Small Promo Tile | 440×280 PNG | 🟡 İsteğe bağlı | Eklenti kapak görseli |

---

## Permissions Justification (Mağaza Onay Açıklamaları)

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Used to save user translation preferences, subtitle font size/styling settings, and user API keys locally in `chrome.storage.local`. |
| `activeTab` | permissions | Used to detect and interact with the active Coursera video tab when the user opens the extension. |
| `https://*.coursera.org/*` | host_permissions | Required to read English subtitle DOM elements from Coursera video player to translate them to Turkish. |
| `https://generativelanguage.googleapis.com/*` | host_permissions | Required to send subtitle text to Google Gemini API for translation when configured by the user. |
| `https://api.openai.com/*` | host_permissions | Required to send subtitle text to OpenAI API for translation when configured by the user. |
| `http://localhost/*` | host_permissions | Required to send subtitle text to local LLM instances (e.g. Ollama) on the user's computer if selected. |
| `http://127.0.0.1/*` | host_permissions | Required to send subtitle text to local LLM instances (e.g. Ollama) on the user's computer if selected. |

---

## Privacy & Data Use

- **Data Collection**: No personal data, web history, or identifying information is collected, stored, or transmitted off-device.
- **API Keys**: User-provided API keys are strictly used to communicate directly with Gemini/OpenAI endpoints and are stored only in `chrome.storage.local`.
- **Data Sales**: Data is NOT sold to third parties.

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.0.0 | 2026-07-31 | Initial release with Gemini, OpenAI, and Local LLM support. | Draft |
