# Swe-Print3D

Swe-Print3D.se is a Next.js web application for uploading 3D printing files, getting instant price estimates, and ordering prints.\
It supports lithophane cube previews, FDM price calculation, and a smooth checkout flow.

---

## 🚀 Features

- **3D File Upload**
  - Supports STL and other common 3D printing formats.
  - Files are uploaded to the `/upload/` directory.
  - File-based price calculation before entering shipping details.
- **Price Estimation**
  - Quick "Beräkna pris" (Calculate Price) button next to file upload.
- **Responsive Design**
  - Works on desktop, tablet, and mobile.
- **Admin Panel**
  - Available at `/admin`.
  - Allows logging in with admin credentials.
  - Provides tools to edit current orders and manage available colors for all plastic types.
- **Discord Integration**
  - Uses Discord webhook to send notification whenever a new order is created.

---

## 📦 Tech Stack

- **Framework**: [Next.js](https://nextjs.org/)
- **Backend**: [Prisma](https://www.prisma.io/) ORM with SQLite/PostgreSQL
- **File Handling**: [Formidable](https://github.com/node-formidable/formidable) for uploads
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Language**: TypeScript

---

## ⚙️ Installation & Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000).

---

## 🔑 Environment Setup (`.env.local`)

Before running the application, create a `.env.local` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL="file:./prisma/dev.db"

# Discord webhook for receiving requests
DISCORD_WEBHOOK=USE YOUR DISCORD WEBHOOK API URL HERE

# Admin authentication
ADMIN_PASSWORD=CHOOSE A GOOD PASSWORD HERE
ADMIN_SECRET=USE A RANDOM STRING OF CHARACTERS HERE   # used to sign the cookie

# Pricing and weight factors
START_FEE=50                        # Starting cost per order
FILL_FACTOR=0.30                    # Average density of an object (percent)
PACKAGING_GRAMS=50                  # Weight of packaging material
MIN_GRAMS_PER_FILE=6                # Minimum grams charged per file
```

**Notes:**

- `DATABASE_URL` points to your Prisma database (SQLite for dev, PostgreSQL for production).
- `DISCORD_WEBHOOK` is used to receive order notifications in Discord. Create a Discord server and navigate to Server Settings->Integrations->Webhooks to create a webhook!
- `ADMIN_PASSWORD` and `ADMIN_SECRET` secure the admin panel and cookies.
- `START_FEE`, `FILL_FACTOR`, `PACKAGING_GRAMS`, and `MIN_GRAMS_PER_FILE` are used in the price calculation logic.

---

## 📄 License
MIT License © 2025 Swe-Print3D

