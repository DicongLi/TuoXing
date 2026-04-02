# 🚀 CMI Dashboard (Customer Intelligence Platform)

An enterprise-grade B2B customer intelligence and opportunity management platform designed for modern sales and strategy teams.

Built with a full-stack TypeScript architecture, CMI Dashboard enables organizations to track customers, analyze business opportunities, and generate AI-driven insights for smarter decision-making.

---

## ✨ Key Features

### 🧠 Customer Intelligence

* Centralized enterprise customer profiles
* Rich data modeling for organizations and relationships
* Historical activity tracking and insights

### 🌐 Corporate Structure Visualization

* Interactive parent–subsidiary relationship mapping
* Corporate family tree exploration
* Multi-level entity hierarchy support

### 📈 Opportunity & Pipeline Management

* Full lifecycle opportunity tracking
* Stage-based pipeline visualization
* Revenue forecasting and performance metrics

### 💰 Deal Analytics

* Closed deal tracking and analysis
* Revenue insights and trend monitoring
* Strategic win/loss evaluation

### 📰 AI-Powered News Intelligence

* Real-time news aggregation for customers
* AI-based summarization and insights
* Context-aware business signals

### 🤖 AI Sales Assistant

* Automated insight generation
* Product matching recommendations
* Intelligent talking points for sales teams

### 📊 Data Import & Integration

* Excel / CSV data import
* Structured data transformation
* Batch processing support

### 🌍 Multi-language Support

* English / Simplified Chinese / Traditional Chinese
* International-ready UI architecture

### 📊 Interactive Dashboards

* Recharts-powered data visualization
* Real-time analytics views
* Customizable reporting panels

---

## 🧱 Tech Stack

### Frontend

* React 19
* TypeScript
* Tailwind CSS 4
* Recharts

### Backend

* Node.js (Express 4)
* tRPC 11 (end-to-end type safety)
* Drizzle ORM

### Database

* MySQL / MariaDB (TiDB compatible)

### Authentication

* JWT-based authentication

### AI Integration

* OpenAI API (or compatible LLM endpoints)

---

## 🏗️ Architecture

```text
Frontend (React)
        ↓
Backend API (Express + tRPC)
        ↓
Database (MySQL)
```

* Fully type-safe full-stack communication via tRPC
* Modular backend design for scalability
* AI layer integrated as independent service module

---

## 📂 Project Structure

```text
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── contexts/       # Global states (Language, Theme)
│   │   ├── pages/          # Page-level views
│   │   └── lib/            # Utilities and API client
│
├── server/                 # Backend services
│   ├── routers.ts          # tRPC routes
│   ├── db.ts               # Database queries
│   ├── llm.ts              # AI integration
│   └── auth.ts             # Authentication logic
│
├── drizzle/                # Database schema & migrations
├── shared/                 # Shared types and constants
├── scripts/                # Utility scripts
├── .env.example            # Environment variables template
├── package.json            # Project dependencies
```

> ⚠️ `.env` should NOT be committed to the repository

---

## ⚙️ Environment Configuration

Create a `.env` file:

```env
DATABASE_URL=mysql://user:password@localhost:3306/customer_intelligence
JWT_SECRET=your-secret-key-min-32-chars

OPENAI_API_KEY=your-api-key
LLM_API_URL=https://api.openai.com/v1/chat/completions
LLM_MODEL=gpt-4o-mini

PORT=3000
```

---

## 🚀 Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Setup database

```bash
pnpm db:push
```

(Optional)

```bash
node scripts/seed-data.mjs
```

### 3. Start development server

```bash
pnpm dev
```

Open:
👉 http://localhost:3000

---

## 🐳 Deployment (Docker Recommended)

### Build and run with Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

EXPOSE 3000
CMD ["pnpm", "start"]
```

---

### 🧩 Recommended: Docker Compose (Full Stack)

```yaml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - db

  db:
    image: mysql:8
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: customer_intelligence
    ports:
      - "3306:3306"
```

Run:

```bash
docker-compose up -d
```

---

## 🔌 API Overview (tRPC)

* `customer.*` → Customer management
* `subsidiary.*` → Corporate structure
* `opportunity.*` → Pipeline tracking
* `deal.*` → Revenue & deals
* `news.*` → News intelligence
* `ai.*` → AI insights & analysis
* `dataImport.*` → Data ingestion

---

## 🧪 Development Commands

```bash
pnpm dev        # Development server
pnpm build      # Production build
pnpm start      # Start production server
pnpm test       # Run tests
pnpm check      # Type checking
pnpm db:push    # Apply schema changes
```

---

## 📸 Demo & Screenshots

🚧 Live Demo: Coming soon

Suggested views:

* Dashboard overview
* Customer profile page
* Opportunity pipeline
* AI insights panel

---

## 🎯 Use Cases

* B2B Sales Intelligence Platforms
* Enterprise Customer Management Systems
* Strategic Business Development Tools
* AI-driven CRM Enhancements

---

## 📄 License

MIT License

---

## 🤝 Contributing

Contributions are welcome. Please open an issue or submit a pull request.

---

## 💡 Author

Built with a focus on **enterprise-grade architecture, scalability, and AI-driven business insights**.
