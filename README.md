# 🚀 KitabGhor API

KitabGhor এর Backend — Node.js + Express + TypeScript + Prisma + PostgreSQL

---

## 📁 ফোল্ডার স্ট্রাকচার

```
kitabghor-api/
├── src/
│   ├── index.ts                  # সার্ভার entry point
│   ├── config/
│   │   └── prisma.ts             # Prisma client
│   ├── middleware/
│   │   ├── auth.middleware.ts    # JWT authentication
│   │   └── error.middleware.ts   # Error handler
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── product.routes.ts
│   │   ├── order.routes.ts
│   │   └── ...
│   └── controllers/
│       ├── auth.controller.ts    # ✅ Ready
│       ├── product.controller.ts # ✅ Ready
│       └── order.controller.ts   # ✅ Ready
├── prisma/
│   └── schema.prisma             # Database schema
├── .env.example
├── package.json
└── tsconfig.json
```

---

## ⚡ শুরু করার নিয়ম

### ১. Install

```bash
npm install
```

### ২. Environment setup

```bash
cp .env.example .env
# .env ফাইলে DATABASE_URL ও JWT_SECRET দাও
```

### ৩. Database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### ৪. Run

```bash
npm run dev
```

API চালু হবে → http://localhost:5000

---

## 🔌 API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Auth
| Method | Endpoint | বিবরণ |
|--------|----------|--------|
| POST | `/auth/register` | রেজিস্ট্রেশন |
| POST | `/auth/login` | লগইন |
| GET | `/auth/me` | নিজের তথ্য (token লাগবে) |

### Products
| Method | Endpoint | বিবরণ |
|--------|----------|--------|
| GET | `/products` | সব প্রোডাক্ট (filter সহ) |
| GET | `/products/search?q=` | সার্চ |
| GET | `/products/featured` | ফিচার্ড |
| GET | `/products/:id` | একটি প্রোডাক্ট |
| GET | `/products/:id/related` | সম্পর্কিত |

### Orders (🔒 token লাগবে)
| Method | Endpoint | বিবরণ |
|--------|----------|--------|
| POST | `/orders` | নতুন অর্ডার |
| GET | `/orders/my` | আমার অর্ডার সব |
| GET | `/orders/:id` | একটি অর্ডার |

### Query Parameters (Products Filter)
```
?type=BOOK|GADGET
&classLevel=SSC|HSC|University
&subject=Math|Physics
&minPrice=100&maxPrice=500
&search=গণিত
&sort=price_asc|price_desc|newest|popular
&page=1&limit=20
```

---

## 📊 Database Tables

```
User, Address, Category, Product,
Bundle, BundleItem, Order, OrderItem,
Review, Wishlist, Coupon
```

বিস্তারিত: `prisma/schema.prisma`
# kitabghor-api
