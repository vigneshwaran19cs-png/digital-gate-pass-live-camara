# Hostel Pass Manager - PHP API Server

This is the enterprise-grade PHP implementation of the API backend for the Smart Hostel Leave & Digital Outpass Management System. It matches all the functionality, validation, and token authentication of the original Node Express backend while running natively under a PHP + MySQL environment (like XAMPP).

## Prerequisites

- **XAMPP** (or any AMP stack with Apache, PHP 7.4+, and MySQL/MariaDB)
- **Local MySQL Server** running on port 3306

---

## 1. Development Mode (Vite Development)

You can run this PHP backend locally on **port 5000**. The Vite development server (which runs on port 3000) is pre-configured to proxy all `/api` requests to `http://localhost:5000`. This means you can keep using the Vite dev server for frontend development while hitting the PHP backend directly!

### Steps:
1. Open a terminal / PowerShell window and navigate to the `php-server` directory:
   ```bash
   cd artifacts/php-server
   ```
2. Start the built-in PHP development server on port 5000:
   ```bash
   php -S localhost:5000 index.php
   ```
3. Open a second terminal window in the root directory and start the React frontend:
   ```bash
   npm run dev
   ```
4. Open your browser to `http://localhost:3000`. You can now log in using the demo accounts (e.g. `student@example.com` or `warden@example.com` with password `password123` or any input password) and test the leaves workflow.

---

## 2. Production Mode (XAMPP Apache Deployment)

To deploy the entire production application (React frontend + PHP API) directly to your XAMPP server so it runs on port 80/8080 without Node:

### Steps:
1. **Build the React frontend:**
   From the root of the project, run:
   ```bash
   # Build all monorepo assets
   npm run build
   ```
   This generates the optimized static files inside `artifacts/hostel-outpass/dist/public`.

2. **Deploy to XAMPP htdocs:**
   - Create a folder named `hostel-pass-manager` inside your XAMPP `htdocs` directory (typically `C:\xampp\htdocs\hostel-pass-manager`).
   - Copy all contents of `artifacts/hostel-outpass/dist/public/` directly into `C:\xampp\htdocs\hostel-pass-manager\`.
   - Copy the entire `artifacts/php-server/` directory into `C:\xampp\htdocs\hostel-pass-manager\api/` (so that `index.php` is located at `C:\xampp\htdocs\hostel-pass-manager\api\index.php`).

3. **Access the application:**
   - Make sure Apache and MySQL are running in your XAMPP Control Panel.
   - Open your browser and navigate to:
     `http://localhost/hostel-pass-manager/`
   - The React frontend will serve files from the root directory, and calls to `/api/...` will automatically route to the PHP server at `/api/index.php` via Apache's URL rewriting (`.htaccess`).

---

## Technical Details

- **Database Connection:** The PHP server reads `DATABASE_URL` from the root `.env` file. If `.env` is not present, it defaults to:
  - Host: `localhost`
  - Port: `3306`
  - User: `root`
  - Password: `(none)`
  - Database Name: `hostel_pass_manager`
- **Auto-Initialization & Seeding:** When the PHP server starts up, it automatically creates the database and the required tables (`users`, `leaves`, `outpasses`, `notifications`) if they do not exist. It then checks if the `users` table is empty and seeds it with demo users.
- **CamelCase/SnakeCase Converter:** The PHP server translates camelCase JSON keys from request bodies to snake_case for MySQL, and translates MySQL query results back to camelCase for the React frontend, matching Drizzle ORM's behavior.
- **Demo authentication:** Uses base64-encoded session tokens that match the Express server format exactly, ensuring session persistent states work interchangeably.
