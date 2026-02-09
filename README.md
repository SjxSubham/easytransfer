# EasyTransfer - Temporary File Sharing Platform

A lightweight, session-based file sharing platform where users can share files without creating an account. Files are automatically disposed when the uploader closes their browser tab.

![EasyTransfer](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-18-blue?style=flat-square&logo=react)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?style=flat-square&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

## ✨ Features

- **No Account Required** - Share files instantly without signing up
- **4-Digit Alphanumeric Code** - Easy to share codes for file access
- **Session-Based Storage** - Files exist only while the uploader's tab is open
- **Auto-Cleanup** - Files are automatically deleted when the uploader disconnects
- **Rate Limiting** - 3 uploads per IP address to prevent abuse
- **File Size Limit** - Maximum 10MB per file
- **Real-time Status** - Live connection status indicator
- **Mobile Responsive** - Works on all devices

## 🚀 Quick Start

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/easytransfer.git
cd easytransfer
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📦 Deployment on Vercel

### One-Click Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/yourusername/easytransfer)

### Manual Deployment

1. Push your code to a GitHub repository

2. Go to [Vercel](https://vercel.com) and import your repository

3. Vercel will automatically detect Next.js and configure the build settings

4. Click "Deploy"

### Environment Variables (Optional)

For production deployments, you may want to configure:

| Variable | Description | Default |
|----------|-------------|---------|
| `MAX_FILE_SIZE` | Maximum file size in bytes | `10485760` (10MB) |
| `MAX_UPLOADS_PER_IP` | Rate limit per IP | `3` |
| `HEARTBEAT_INTERVAL` | Heartbeat interval in ms | `5000` |
| `SESSION_TIMEOUT` | Session timeout in ms | `15000` |

## 🏗️ Architecture

### How It Works

1. **Upload Flow**:
   - User selects a file (max 10MB)
   - File is uploaded to the server
   - A unique 4-digit alphanumeric code is generated
   - Heartbeat mechanism keeps the session alive

2. **Download Flow**:
   - Recipient enters the 4-digit code
   - Server verifies the code and checks if uploader is still connected
   - File is served for download

3. **Session Management**:
   - Client sends heartbeat every 5 seconds
   - If heartbeat stops (tab closed), file is deleted after 15 seconds
   - Uses `beforeunload` event for immediate cleanup

### Tech Stack

- **Frontend**: React 18, Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Storage**: In-memory (development) / Can be extended to use Redis + Blob storage
- **Rate Limiting**: IP-based with in-memory tracking

## 📁 Project Structure

```
easytransfer/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── upload/route.ts      # Handle file uploads
│   │   │   ├── download/[code]/route.ts  # Handle file downloads
│   │   │   ├── heartbeat/route.ts   # Keep sessions alive
│   │   │   └── check/[code]/route.ts     # Verify codes
│   │   ├── globals.css              # Global styles
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Main page
│   ├── components/
│   │   ├── UploadSection.tsx        # Upload UI
│   │   ├── DownloadSection.tsx      # Download UI
│   │   ├── FileCard.tsx             # Active file display
│   │   └── CodeDisplay.tsx          # Code display with copy
│   ├── lib/
│   │   ├── storage.ts               # File storage management
│   │   ├── rateLimit.ts             # Rate limiting logic
│   │   └── utils.ts                 # Utility functions
│   └── types/
│       └── index.ts                 # TypeScript types
├── public/                          # Static assets
├── tailwind.config.js               # Tailwind configuration
├── next.config.js                   # Next.js configuration
└── package.json                     # Dependencies
```

## 🔒 Security Considerations

- **Rate Limiting**: Each IP is limited to 3 uploads to prevent abuse
- **File Size Limit**: 10MB maximum to prevent storage exhaustion
- **Session-Based**: Files are automatically cleaned up
- **No Persistent Storage**: Files don't stay on the server permanently
- **Alphanumeric Codes**: 36^4 = 1,679,616 possible combinations

## 🛠️ Production Recommendations

For production deployments with high traffic:

1. **Use External Storage**:
   - Replace in-memory storage with Redis (Upstash)
   - Use Vercel Blob or S3 for file storage

2. **Add Authentication (Optional)**:
   - Implement optional authentication for higher limits

3. **Add Analytics**:
   - Track usage patterns and popular file types

4. **Add CDN**:
   - Use Vercel Edge Network for faster downloads

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📧 Support

If you have any questions or need help, please open an issue on GitHub.

---

Made with ❤️ for easy file sharing