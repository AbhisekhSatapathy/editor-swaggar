# 🚀 Swagger Editor

A premium, production-ready Swagger Editor clone with live preview, YAML validation, and API testing — designed to rival tools like **Postman** and **VSCode**.

![OpenAPI 3.x](https://img.shields.io/badge/OpenAPI-3.x-brightgreen)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![License](https://img.shields.io/badge/License-MIT-blue)

---

## ✨ Features

- **Split-screen layout** — YAML editor on the left, live Swagger UI preview on the right
- **Live preview** — changes render automatically as you type
- **YAML validation** — instant error feedback with line/column numbers
- **Try it out** — test API endpoints directly via a built-in CORS proxy
- **Dark / Light theme** — premium toggle with animated switch, persisted to localStorage
- **Search system** — Regex, whole word, match case toggles with result counter
- **Download** — export as YAML or JSON
- **Auto-format** — one-click YAML formatting
- **Toast notifications** — beautiful feedback for every action
- **Persistent editor** — YAML saved to localStorage automatically
- **Responsive** — works on desktop and tablets
- **Draggable splitter** — resize editor and preview panels
- **Glassmorphism UI** — modern, premium design with gradient accents
- **Page loader** — smooth loading animation on startup
- **Empty state** — elegant placeholder when editor is empty

---

## 📸 Screenshots

> Add your screenshots here after running the application.

| Dark Mode | Light Mode |
|-----------|------------|
| _screenshot_dark.png_ | _screenshot_light.png_ |

---

## 🛠️ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or later
- npm (comes with Node.js)

### Installation

```bash
# 1. Clone or navigate to the project
cd editor-swaggar

# 2. Install dependencies
npm install

# 3. Start the server
node server/server.js

# 4. Open in browser
open http://localhost:3000
```

The app runs on **port 3000** by default. Change it with:

```bash
PORT=8080 node server/server.js
```

---

## 📁 Folder Structure

```
editor-swaggar/
├── public/
│   ├── index.html          # Main HTML – Lucide icons, footer, theme switch
│   ├── style.css           # Premium styles – glassmorphism, animations
│   └── app.js              # Application logic – editor, preview, search, toasts
├── server/
│   └── server.js           # Express server + CORS proxy
├── package.json
└── README.md
```

---

## 🧩 Tech Stack

| Component     | Technology                                                       |
|--------------|------------------------------------------------------------------|
| Code Editor  | [CodeMirror 5](https://codemirror.net/5/) with YAML mode + lint  |
| YAML Parsing | [js-yaml](https://github.com/nodeca/js-yaml)                    |
| API Preview  | [Swagger UI](https://github.com/swagger-api/swagger-ui)         |
| Icons        | [Lucide Icons](https://lucide.dev/)                              |
| Server       | [Express](https://expressjs.com/)                                |
| CORS Proxy   | Built-in `/api/proxy` endpoint                                   |
| Fonts        | [Inter](https://fonts.google.com/specimen/Inter) via Google Fonts|

---

## ⌨️ Keyboard Shortcuts

| Shortcut              | Action                        |
|-----------------------|-------------------------------|
| `Ctrl/Cmd + F`        | Open search                   |
| `Enter`               | Next search result            |
| `Shift + Enter`       | Previous search result        |
| `Escape`              | Close search                  |
| `Alt + C`             | Toggle match case             |
| `Alt + W`             | Toggle whole word              |
| `Alt + R`             | Toggle regex                  |
| `Tab`                 | Indent                        |
| `Shift + Tab`         | Outdent                       |
| `Ctrl/Cmd + Z`        | Undo                          |
| `Ctrl/Cmd + Shift + Z`| Redo                         |

---

## 🔒 API Proxy & Security

The server includes a `/api/proxy` endpoint for CORS-free API testing:

- ✅ URL validation
- ✅ SSRF protection (blocks local addresses)
- ✅ Header sanitisation
- ✅ 30-second timeout
- ✅ Input validation

---

## 🔮 Future Improvements

- [ ] Replace & Replace All in search
- [ ] Import from URL
- [ ] OpenAPI linting with Spectral
- [ ] Split diff view for changes
- [ ] Export to Postman collection
- [ ] WebSocket live collaboration
- [ ] API mock server generation
- [ ] Keyboard shortcuts panel

---

## 👨‍💻 About the Creator

This project is crafted by **Abhisekh Satapathy**, a passionate developer focused on building modern, powerful, and user-friendly web tools for developers.

> *"I believe great tools should be fast, elegant, and intuitive. This Swagger Editor clone is designed to provide a seamless API testing and documentation experience."*

---

## 📄 License

MIT © 2026 Abhisekh Satapathy
