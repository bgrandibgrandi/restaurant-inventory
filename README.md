# Nigiri Vibes 🍱

Modern inventory management for restaurants. Track stock, reduce waste, and manage costs across multiple venues.

![Version](https://img.shields.io/badge/version-0.1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### Current (MVP)
- ✅ **Beautiful UI** - World-class SaaS-quality design with Modern Blue theme
- ✅ **Onboarding Flow** - Smooth user and venue setup
- ✅ **Smart Inventory** - Reusable items catalog with categories
- ✅ **Flexible Stock Tracking** - Add stock with optional cost information
- ✅ **Multi-currency Support** - Track costs in EUR, USD, DKK, GBP
- ✅ **Real-time Dashboard** - See inventory value and stock levels instantly
- ✅ **Multi-venue Ready** - Track inventory across multiple locations

### Coming Soon (Roadmap)
- 🔄 **Invoice Management** - Upload and track purchase invoices
- 🔄 **Stock Count Tasks** - Assign counting tasks to team members
- 🔄 **Waste Tracking** - Log and analyze waste patterns
- 🔄 **User Management** - Add team members with custom permissions
- 🔄 **Advanced Reports** - Export data, generate insights
- 🔄 **Square Integration** - Sync POS sales data
- 🔄 **Invoice OCR** - Scan invoices automatically

## 🚀 Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite (via Prisma ORM)
- **Auth**: NextAuth.js (ready for implementation)
- **Deployment**: Vercel-ready

## 📦 Installation

```bash
# Clone the repository
cd restaurant-inventory

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Initialize database
npx prisma generate
npx prisma db push

# Seed default data
npx tsx prisma/seed.ts

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🗄️ Database Schema

### Core Models
- **Account** - Restaurant brand/company
- **Store** - Physical locations
- **User** - Team members
- **Category** - Reusable item categories (hierarchical)
- **Item** - Master catalog of inventory items
- **StockEntry** - Actual stock quantities per store (with optional cost)

## 🎨 Design Philosophy

**Nigiri Vibes** follows world-class SaaS design principles:
- Clean, minimal interface inspired by Stripe, Linear, and Vercel
- Generous whitespace and clear typography
- Smooth transitions and hover states
- Mobile-first responsive design
- Accessibility-focused components

## 📱 User Flow

1. **Onboarding** - Set up your name and first venue
2. **Dashboard** - View inventory overview and quick stats
3. **Add Stock** - Select existing items or create new ones
4. **Track Value** - Optional cost tracking for financial insights

## 🔐 Environment Variables

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"
```

## 🚀 Deployment

### Deploy to Vercel

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy!

## 🤝 Contributing

This is an MVP project. Future contributions welcome!

## 📄 License

MIT License - Built for Bruno's Restaurants

## 🎯 Roadmap

### Phase 1 ✅ (COMPLETE)
- [x] Project setup
- [x] Database schema
- [x] Landing page
- [x] Onboarding flow
- [x] Dashboard
- [x] Add stock functionality

### Phase 2 (Next)
- [ ] Invoice management
- [ ] Supplier tracking
- [ ] Multi-currency conversion API

### Phase 3 (Future)
- [ ] Stock counting tasks
- [ ] Waste tracking
- [ ] User management & permissions

### Phase 4+ (Vision)
- [ ] Square POS integration
- [ ] Invoice OCR
- [ ] Mobile app
- [ ] Analytics & insights

---

Built with ❤️ using Next.js and TypeScript
