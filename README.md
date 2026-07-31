# 🎓 Coursera AI Altyazı Çevirmeni (Türkçe)

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-purple.svg)

Coursera kurs videolarındaki İngilizce altyazıları **anlık ve yapay zeka destekli** (Gemini, OpenAI, Claude vb.) olarak Türkçe'ye çeviren modern bir Google Chrome eklentisidir.

---

## ✨ Özellikler

- 🤖 **Yapay Zeka Destekli Çeviri**: Gemini ve OpenAI API entegrasyonu ile doğal ve bağlama uygun Türkçe çeviriler.
- ⚡ **Anlık ve Hızlı**: Altyazıları eşzamanlı olarak yakalar ve video akışını bozmadan ekranda gösterir.
- 🎨 **Modern ve Şık Arayüz**: Glassmorphism ve modern CSS tasarımıyla sezgisel kullanıcı deneyimi.
- 🎛️ **Gelişmiş Özelleştirme**:
  - Altyazı yazı boyutu ve stil ayarları.
  - Ekranda konumlandırma ve saydamlık ayarları.
  - Çeviri önbellekleme (Cache) ile gereksiz API kullanımını engelleme.
- 🔒 **Güvenli**: API anahtarlarınız yalnızca kendi tarayıcınızın yerel depolama alanında (`chrome.storage`) saklanır.

---

## 🚀 Kurulum Rehberi

Eklentiyi Chrome tarayıcınıza yüklemek için aşağıdaki basit adımları takip edin:

1. Bu depoyu indirin veya bilgisayarınıza klonlayın:
   ```bash
   git clone https://github.com/dogukankocann/coursera-ai-subtitle-turkish-translator.git
   ```
2. Google Chrome'u açın ve adres çubuğuna `chrome://extensions/` yazın.
3. Sağ üst köşedeki **Geliştirici modu** (Developer mode) anahtarını açık konuma getirin.
4. Sol üstte çıkan **Paketlenmemiş öge yükle** (Load unpacked) butonuna tıklayın.
5. İndirdiğiniz/klonladığınız proje klasörünü seçin.

🎉 **Tebrikler!** Eklenti tarayıcınıza yüklendi.

---

## 🛠️ Kullanım

1. Coursera üzerinde herhangi bir video dersini açın.
2. Tarayıcınızın sağ üstündeki eklenti ikonuna tıklayarak **Coursera Altyazı Çevirmeni** menüsünü açın.
3. Tercih ettiğiniz Yapay Zeka sağlayıcısını seçin ve **API Anahtarınızı (API Key)** girip kaydedin.
4. Altyazıları açın ve Türkçe çevirinin keyfini çıkarın!

---

## 📂 Proje Yapısı

```
├── manifest.json       # Chrome Manifest V3 yapılandırması
├── background.js       # Arka plan servis çalışanı (Service Worker)
├── content.js          # Video ve altyazı yakalama betiği
├── popup.html          # Eklenti ayarlar paneli (HTML)
├── popup.js            # Ayarlar paneli mantığı (JS)
├── styles.css          # Arayüz ve altyazı stilleri
└── icons/              # Eklenti ikonları
```

---

## 📄 Lisans

Bu proje [MIT Lisansı](LICENSE) ile lisanslanmıştır.
