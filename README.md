# 📚 Words Wall - AI-Powered Vocabulary Learning Platform

> A beautiful, mobile-responsive vocabulary learning application with local AI integration

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-ea2845?style=flat-square&logo=nestjs)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Qwen3](https://img.shields.io/badge/Qwen3-1.7b-orange?style=flat-square)](https://qwenlm.github.io/)

## ✨ Features

### 🎯 **Core Functionality**
- **AI-Powered Vocabulary Analysis** - Detailed word explanations with synonyms, usage scenarios, and examples
- **Personal Word Collections** - Automatically organized into collections of 10 words
- **Beautiful Card Interface** - Flip cards with detailed word information and editing capabilities
- **User Authentication** - Secure JWT-based authentication system
- **Admin Panel** - User management and system administration

### 📱 **Mobile-First Design**
- **Responsive Grid Layout** - Adapts from 2 columns (mobile) to 6 columns (desktop)
- **Touch-Optimized Interactions** - Intuitive gestures and touch targets
- **Adaptive Typography** - Scales beautifully across all screen sizes
- **Mobile-Friendly Modals** - Scrollable content with proper mobile constraints
- **Glassmorphism UI** - Modern, translucent design elements

### 🤖 **AI Integration**
- **Local Qwen3:1.7b Model** - 100% offline AI processing via Ollama
- **Structured Analysis** - Six distinct sections for comprehensive word learning:
  - 🎯 词性与基本含义 (Word Type & Basic Meaning)
  - 🌟 详细释义 (Detailed Definition)
  - ✨ 使用场景与例句 (Usage Scenarios & Examples)
  - 🔄 近义词对比 (Synonyms Comparison)
  - 🎪 常用搭配表达 (Common Collocations)
  - 🎬 记忆金句 (Memory Phrases)
- **No External API Dependencies** - Complete privacy and offline functionality

## 🚀 Quick Start

### Prerequisites

- **Node.js** (v18 or higher)
- **Yarn** package manager
- **Ollama** for local AI processing

### 1. Install Dependencies

```bash
# Install backend dependencies
cd backend
yarn install

# Install frontend dependencies
cd ../frontend
yarn install
```

### 2. Set Up Local AI (Qwen3:1.7b)

```bash
# Install Ollama (macOS)
brew install ollama

# Pull Qwen3:1.7b model
ollama pull qwen3:1.7b

# Start Ollama service
ollama serve
```

For other platforms, visit [ollama.ai](https://ollama.ai/) for installation instructions.

### 3. Configure Environment

```bash
# Backend configuration
cd backend
cp .env.example .env

# Update .env with your settings:
# JWT_SECRET=your-super-secret-jwt-key
# DATABASE_URL=./words_wall.db
```

### 4. Start Development Servers

```bash
# Terminal 1: Start backend
cd backend
yarn start:dev

# Terminal 2: Start frontend
cd frontend
yarn dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## 📱 Mobile Experience

### Responsive Design Highlights

| Screen Size | Columns | Features |
|-------------|---------|----------|
| **Mobile** (< 640px) | 2 | Touch-optimized cards, compact header |
| **Tablet** (640px - 1024px) | 3-4 | Balanced layout, readable text |
| **Desktop** (> 1024px) | 5-6 | Full sidebar, spacious grid |

### Mobile Optimizations

- **Grid Layout**: CSS Grid with responsive columns for optimal space usage
- **Touch Targets**: Minimum 44px touch targets for accessibility
- **Typography**: Fluid scaling from `text-sm` to `text-xl` across breakpoints
- **Navigation**: Collapsible sidebar on mobile, full sidebar on desktop
- **Modals**: Full-screen on mobile with proper scrolling constraints

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Responsive Design** - Mobile-first approach
- **Glassmorphism** - Modern UI with backdrop blur effects

### Backend
- **NestJS** - Progressive Node.js framework
- **TypeORM** - Database ORM with TypeScript support
- **SQLite** - Lightweight database for development
- **JWT Authentication** - Secure token-based auth
- **Axios** - HTTP client for AI API calls

### AI & ML
- **Qwen3:1.7b** - Local language model via Ollama
- **Ollama API** - Local AI inference server
- **Structured Prompts** - Consistent AI response formatting
- **Offline Processing** - No external AI API dependencies

## 📁 Project Structure

```
words_wall/
├── backend/                 # NestJS backend application
│   ├── src/
│   │   ├── ai/             # AI service and Qwen integration
│   │   ├── auth/           # Authentication system
│   │   ├── sticker/        # Word sticker management
│   │   ├── user/           # User management
│   │   └── ...
│   ├── QWEN_SETUP.md       # AI setup documentation
│   └── package.json
├── frontend/               # Next.js frontend application
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── CardModal.tsx    # Word detail modal
│   │   │   ├── StickerWall.tsx  # Main grid layout
│   │   │   └── ...
│   │   ├── app/            # Next.js app router
│   │   └── utils/          # Utility functions
│   └── package.json
└── README.md
```

## 🎨 Design System

### Color Palette
- **Primary**: Purple to Pink gradients (`from-purple-500 to-pink-500`)
- **Secondary**: Various themed colors for different word categories
- **Background**: Deep gradient (`from-indigo-900 via-purple-900 to-pink-800`)
- **Glass**: Semi-transparent whites with backdrop blur

### Responsive Breakpoints
```css
sm: 640px   /* Small tablets */
md: 768px   /* Medium tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
```

## 🧑‍💻 Development

### Running Tests
```bash
# Backend tests
cd backend
yarn test

# Frontend tests  
cd frontend
yarn test
```

### Building for Production
```bash
# Build backend
cd backend
yarn build

# Build frontend
cd frontend
yarn build
```

### Database Management
```bash
# Clean database (removes all words)
cd backend
yarn cleanup:db
```

## 🤖 AI Configuration

### Qwen Model Setup

The application uses Qwen3:1.7b for local AI processing. See [QWEN_SETUP.md](backend/QWEN_SETUP.md) for detailed setup instructions.

### Alternative Models

You can use different Qwen models by updating `backend/src/ai/ai.service.ts`:

```typescript
// Smaller, faster model
model: 'qwen3:1.5b'

// Larger, higher quality model  
model: 'qwen3:3b'
```

### Prompt Customization

The AI prompts are highly customizable in `ai.service.ts`. The current prompt generates:
- Structured markdown output
- Six distinct learning sections
- Chinese explanations with English examples
- Beautiful emoji formatting

## 📱 Mobile Development Tips

### Testing Responsive Design
```bash
# Enable device simulation in browser dev tools
# Test common breakpoints:
# - iPhone SE (375px)
# - iPad (768px) 
# - Desktop (1280px)
```

### Performance Optimization
- **Lazy Loading**: Components load on demand
- **Image Optimization**: Next.js automatic image optimization
- **Code Splitting**: Automatic route-based splitting
- **Caching**: Browser and server-side caching

## 🚀 Deployment

### Frontend (Vercel)
```bash
# Deploy to Vercel
cd frontend
npx vercel --prod
```

### Backend (Railway/Heroku)
```bash
# Build and deploy backend
cd backend
yarn build
# Follow your hosting provider's deployment guide
```

### Environment Variables
```bash
# Production environment
NODE_ENV=production
JWT_SECRET=your-production-secret
DATABASE_URL=your-production-database-url
```

## 🤝 Contributing

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m '✨ feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Commit Convention
```bash
✨ feat: new feature
🐛 fix: bug fix
📱 mobile: mobile-specific improvements
🎨 style: UI/UX improvements
⚡ perf: performance improvements
📝 docs: documentation updates
🔧 config: configuration changes
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Qwen Team** - For the amazing local language model
- **Ollama** - For making local AI deployment simple
- **Next.js & NestJS Teams** - For the excellent frameworks
- **Tailwind CSS** - For the utility-first CSS framework

## 📞 Support

- **Documentation**: Check the [setup guides](backend/QWEN_SETUP.md)
- **Issues**: [GitHub Issues](https://github.com/YOUR_USERNAME/words-wall/issues)
- **Discussions**: [GitHub Discussions](https://github.com/YOUR_USERNAME/words-wall/discussions)

---

<div align="center">

**Built with ❤️ using local AI and modern web technologies**

[🏠 Home](.) • [📱 Mobile Demo](#) • [🤖 AI Setup](backend/QWEN_SETUP.md) • [🛠️ Contributing](#-contributing)

</div>