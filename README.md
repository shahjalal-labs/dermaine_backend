# 🔬 DermAINE Backend — Clinical Dermatology & Consultation API

![Architecture Banner](https://github.com/shahjalal-labs/dermaine_backend/blob/main/assets/banner.svg)

---

## 📌 Executive Overview

**DermAINE Backend** is a health-tech API and clinical assessment backend engine engineered to power the DermAINE clinical dermatology web and mobile portals. Built with **Node.js**, **TypeScript**, **Express**, **Prisma ORM (MongoDB)**, **Stripe**, and **AWS S3**, the platform provides clinical consultation bookings, automated patient matchmaking algorithms, practitioner slot availability schedules, multi-tenant organization tenancy, and diagnostic evaluation scoring factors.

---

## 🚀 Key Architectural & Domain Capabilities

- **Clinical Consultation Engine:** Complete lifecycle management for virtual and in-person patient dermatology consultations, diagnostic evaluations, and status tracking.
- **Matchmaking & Scoring Algorithm:** Proprietary assessment logic calculating patient symptom severity and matching cases to the most qualified dermatology practitioners based on mandatory scoring rules.
- **Practitioner Availability & Scheduling:** Dynamic calendar slot generation, recurring availability scheduling, and appointment buffer protections.
- **Multi-Tenant Clinical Tenancy:** Medical practice and clinical organization isolation, staff role assignments, and aggregated organizational analytics.
- **Stripe Healthcare Billing:** Secure consultation payments, medical subscription plans, and webhook-driven payment fulfillment.
- **Cloud Media & Medical Imaging:** Medical skin photograph uploads and treatment progression tracking backed by **AWS S3** and Multer.

---

## 📬 Core Endpoint Modules

| Module | Base Route | Key Capabilities |
|---|---|---|
| **Authentication** | `/api/v1/auth` | Medical practitioner & patient authentication, JWT issuance, password recovery |
| **User Directory** | `/api/v1/user` | Patient records, clinical profiles, avatar management, and role-based permissions |
| **Consultations** | `/api/v1/consultation` | Appointment bookings, treatment session notes, and prescription attachment records |
| **Availability** | `/api/v1/availability` | Dermatologist active hours, holiday calendar overrides, and booking time slots |
| **Match Engine** | `/api/v1/matchEngine` | Symptom assessment criteria evaluation and automated doctor assignment |
| **Organizations** | `/api/v1/organization` | Multi-clinic practice profiles, facility licensing, and practitioner memberships |
| **Skincare Programs** | `/api/v1/program` | Guided patient skin regimens, routine milestone tracking, and compliance logs |
| **Media Streams** | `/api/v1/stream` | Secure tele-dermatology session streams and patient medical imaging feeds |
| **Admin Operations** | `/api/v1/admin` | Platform governance, practitioner credentials verification, and revenue audits |

---

## 📂 Project Architecture

```text
dermaine_backend/
├── assets/
│   └── banner.svg                     # High-resolution architectural banner
├── src/
│   ├── app/
│   │   ├── middlewares/               # Global error handler, auth & role guards
│   │   ├── modules/                   # Domain feature modules
│   │   │   ├── admin/
│   │   │   ├── auth/
│   │   │   ├── availability/
│   │   │   ├── consultation/
│   │   │   ├── dashboard/
│   │   │   ├── mandatoryRules/
│   │   │   ├── matchEngine/
│   │   │   ├── organization/
│   │   │   ├── program/
│   │   │   ├── scoringFactor/
│   │   │   ├── stream/
│   │   │   └── user/
│   │   ├── routes/                    # Centralized route index
│   │   └── app.ts                     # Express application configuration
│   ├── config/                        # Environment variables & AWS/Stripe configurations
│   ├── errors/                        # Custom ApiError & global exception classes
│   ├── helpers/                       # Pagination, date-fns & hashing helpers
│   ├── interfaces/                    # Shared TypeScript types & Express augmentations
│   └── server.ts                      # Server bootstrap & MongoDB connection
├── prisma/
│   ├── schema.prisma                  # Prisma ORM MongoDB schema definitions
│   └── seed.ts                        # Seed scripts for roles and baseline scoring rules
├── package.json                       # Express, TypeScript, Prisma, AWS SDK, Stripe
└── tsconfig.json                      # Strict compiler configuration
```

---

## 💻 Tech Stack Specification

| Layer | Technologies |
|---|---|
| **Runtime & Core** | Node.js (v20+), Express.js 4.19 |
| **Language** | TypeScript 5 (Strict Mode) |
| **Database & ORM** | MongoDB, Prisma ORM 6.17 |
| **Authentication & Security** | JSON Web Tokens (JWT), Bcrypt.js, CORS |
| **Payment Gateway** | Stripe SDK (Subscription & One-time checkout) |
| **Object Storage** | AWS S3 Client SDK (`@aws-sdk/client-s3`), Multer |
| **Validation & Schema** | Zod 3.23 |
| **Email Dispatch** | Nodemailer |

---

## 🛠️ Quickstart & Local Setup

### Prerequisites

- **Node.js:** `v20.x` or higher
- **Database:** MongoDB instance or MongoDB Atlas cluster connection URI

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/shahjalal-labs/dermaine_backend.git
cd dermaine_backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
DATABASE_URL=mongodb+srv://<username>:<password>@cluster.mongodb.net/dermaine_db
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
STRIPE_SECRET_KEY=sk_test_...
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=dermaine-storage
```

### 3. Generate Prisma Client & Run Migrations

```bash
npx prisma generate
```

### 4. Run Development Server

```bash
npm run dev
```

Server will start on [http://localhost:5000](http://localhost:5000).

---

## 👨‍💻 Engineering & Authorship

Developed and engineered by **Md. Shahjalal**.

- **GitHub:** [@shahjalal-labs](https://github.com/shahjalal-labs)
- **Email:** [muhommodshahjalal@gmail.com](mailto:muhommodshahjalal@gmail.com)

---

## 📄 License

This project is licensed under the **ISC License**.
