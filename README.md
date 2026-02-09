<div align="center">
  <br />
  <img src="./public/icon.svg" alt="EasyTransfer" width="90" />
  <h1>EasyTransfer</h1>
  <p><b>Drop a file. Get a code. Share it. Done.</b></p>
  <p>Temporary file sharing that disappears when you close the tab.<br />No accounts, no cloud storage, no nonsense.</p>
  <br />
  <a href="https://easytransfer.vercel.app">
    <img src="https://img.shields.io/badge/▶_Live_Demo-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Live Demo" />
  </a>
  <a href="https://github.com/yourusername/easytransfer">
    <img src="https://img.shields.io/badge/Source_Code-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub" />
  </a>
  <br /><br />
  <img src="https://img.shields.io/badge/Next.js_14-000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <br /><br />
</div>

---

## How it works

```
Upload file → Get 4-digit code → Share code → Recipient downloads → Close tab → File gone 💨
```

That's it. Files only exist while your browser tab is open. The moment you close it, everything gets wiped.

## Features

| | |
|---|---|
|  **No Account Needed** | Just upload and share, zero friction |
|  **4-Digit Codes** | Easy to type, easy to share over text/call |
|  **Secure Mode (JWT)** | Cryptographically signed tokens for sensitive files |
|  **Auto Cleanup** | Files self-destruct when you close the tab |
|  **Mobile Friendly** | Works great on any screen size |
|  **Rate Limited** | 3 uploads per IP to keep things fair |

## Run Locally

Make sure you have **Node.js 18+** installed.

```bash
# clone it
git clone https://github.com/yourusername/easytransfer.git
cd easytransfer

# install deps
npm install

# start dev server
npm run dev
```

Open **[localhost:3000](http://localhost:3000)** — you're up and running.


```bash
npm run build
npm start
```


<div align="center">
  <sub>Built for people who just want to share a damn file.</sub>
</div>