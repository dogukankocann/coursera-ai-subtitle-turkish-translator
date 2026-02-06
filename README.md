# 🎓 Coursera AI Subtitle Translator (Chrome Extension)

![Project Status](https://img.shields.io/badge/Status-Active-success)
![Version](https://img.shields.io/badge/Version-1.0-blue)
![Tech](https://img.shields.io/badge/Tech-OpenAI_API-green)

A personalized Chrome Extension developed to overcome language barriers in technical education. This tool utilizes **OpenAI's GPT-4o model** to translate Coursera English subtitles into Turkish in real-time, enabling a seamless "Vibe Coding" learning experience.

![Extension Preview](https://github.com/user-attachments/assets/placeholder) 
*(Note: You can edit this line later to add the screenshot we created)*

## 🚀 Features
* **Real-time Translation:** Detects subtitles in the DOM and translates them instantly.
* **Smart Context:** Uses GPT-4o to understand technical jargon better than standard translators.
* **Privacy First:** Your API Key is stored locally in your browser (`chrome.storage`), never on external servers.
* **Original Subtitle Hiding:** Option to hide original English captions for a cleaner view.

## 🛠 Tech Stack
* **JavaScript (ES6+)**
* **Manifest V3** (Modern Chrome Extension Architecture)
* **OpenAI API** (Integration via fetch)
* **Chrome Storage API** (Secure local data persistence)

## 🔒 Security Note
This project adheres to strict security practices:
1.  **No Hardcoded Keys:** The source code does not contain any API keys.
2.  **Local Storage:** User credentials are stored in `chrome.storage.sync` and are only used to communicate directly with `api.openai.com`.

## 📦 Installation
1.  Clone this repository.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Enable **"Developer mode"** (top right).
4.  Click **"Load unpacked"** and select the extension folder.
5.  Click the extension icon, enter your OpenAI API Key, and start learning!

---
*Developed by [Doğukan Koçan](https://www.linkedin.com/in/dogukankocan)*
