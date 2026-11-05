# Query Master

An internal web application that centralises reusable **SQL query templates** for support teams. Admins define a template once; support engineers fill in a form and get a correct, safely escaped SQL query to copy, instead of hand-editing SQL every time.

> Query Master **only generates SQL text**. It never connects to a customer database and never executes queries.

---

## Table of Contents

1. [Features](#features)
2. [Tech Stack](#tech-stack)
3. [How It Works](#how-it-works)
4. [Roles and Access Rules](#roles-and-access-rules)
5. [Project Structure](#project-structure)
6. [Getting Started (Local)](#getting-started-local)
7. [Environment Variables](#environment-variables)
8. [Using the App (Walkthrough)](#using-the-app-walkthrough)
9. [Building a Query Template](#building-a-query-template)
10. [API Overview](#api-overview)
11. [Security](#security)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)
14. [Testing](#testing)
15. [Known Limitations and Roadmap](#known-limitations-and-roadmap)
16. [Author](#author)

---

## Features

**Authentication and sessions**

- Email/password login with a 15-minute JWT access token (kept in memory) and a 7-day refresh token (httpOnly cookie, stored hashed in the database, auto-expired by a TTL index)
- Silent session restore on page load and automatic token refresh on `401`, with duplicate refresh calls merged into one
- Logout revokes the refresh token on the server; change-password in Settings
- Super Admin account is created automatically on first boot (no seed script)

**Roles and isolation**

- Three roles: **Super Admin**, **Admin**, **User**
- Each Admin owns an **isolated** Category → Module → Query tree; no Admin can see another Admin's content
- Users see only the queries their Admin explicitly granted
- All rules are enforced on the **API**, not just hidden in the UI

**Content management (Admin)**

- Category → Module → Sub Module hierarchy; a **Sub Module is exactly one query**
- Archive status at every level; delete is blocked while children exist
- Query editor: SQL template, placeholders, insertable/updatable fields, WHERE fields, AND/OR logic, tags, table name, versioning
- Optional per-query private notes (switch on per query)

**Using queries (Admin and User)**

- Browse, filter by category / module / type, and full-text search on name, description and tags
- Dynamic form driven by data type: text box, True/False dropdown, option dropdown, chip input, option pills
- Live **SQL generation** with quote escaping and strict numeric validation
- **`IN (...)` lists**: paste a column from Excel/Sheets; values are trimmed, de-duplicated and validated
- One-click copy to clipboard
- Favorites, Recently Viewed (last 20), and private Notes (20 per query per user, 2,000 characters each)

**Platform quality**

- Helmet security headers, CORS lock-down, rate limiting, 1 MB body limit, gzip
- Fails fast on missing environment variables; graceful shutdown on `SIGTERM`/`SIGINT`
- React error boundary, skeleton loaders, toasts, light/dark theme with no flash, reduced-motion support

---

## Tech Stack

| Layer               | Technology                                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Frontend            | React 19, Vite 8, React Router 8, Tailwind CSS 4, Redux Toolkit, TanStack Query 5, Axios, Recharts 3, lucide-react, react-hot-toast |
| Backend             | Node.js 22+, Express 5, Mongoose 9                                                                                                  |
| Database            | MongoDB (Atlas free tier or local)                                                                                                  |
| Auth                | JWT access token + refresh token cookie, bcryptjs                                                                                   |
| Security            | Helmet, express-rate-limit, CORS                                                                                                    |
| Logging             | Winston, Morgan                                                                                                                     |
| Hosting (suggested) | MongoDB Atlas, Render (API), Vercel (frontend)                                                                                      |

Plain JavaScript throughout (no TypeScript).

---

## How It Works

```
Browser (React SPA)
   |  HTTPS  Authorization: Bearer <accessToken>
   |         + httpOnly cookie "refreshToken" (path /api/auth)
   v
Express API
   helmet > compression > cors > json > cookieParser > morgan > rateLimit
     > router > requireAuth > requireRole > controller > errorHandler
   v
MongoDB  (users, refreshtokens, categories, modules, submodules,
          permissions, favorites, notes)
```

**Navigation model**

```
Category   (e.g. Employee)
  └─ Module      (e.g. Payroll)
       └─ Sub Module = exactly ONE query template
```

**SQL generation in one paragraph.** The Admin stores a template such as `UPDATE Employee SET {{SET_CLAUSE}} WHERE {{WHERE_CLAUSE}};` plus metadata for placeholders and columns. The user ticks fields and enters values. The server builds a map of token → text, then replaces every `{{token}}` in a **single pass** (so pasted values like `$&` or `{{WHERE_CLAUSE}}` cannot corrupt the output). Strings are quoted with `'` doubled, numbers are validated by regex before being written unquoted, booleans become `1`/`0`, and multi-value fields become `column IN ('a', 'b', 'c')`.

---

## Roles and Access Rules

| Role            | Created by                 | Can see                                                                            | Can do                                                            |
| --------------- | -------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Super Admin** | Auto-created on first boot | Dashboard (user/admin counts and growth), Users, Admins, Settings. **No content.** | Create Admins and Users; enable/disable; delete                   |
| **Admin**       | Super Admin                | Only their own categories, modules, queries and users                              | Full CRUD on their tree; create Users; grant access; enable notes |
| **User**        | An Admin                   | Only sub modules granted to them                                                   | Browse, search, generate and copy SQL, favorite, keep notes       |

Isolation rules:

1. Admin A never sees Admin B's Categories, Modules or Queries, even by guessing an id.
2. Name uniqueness is **per Admin** (two Admins can both have an "Employee" category).
3. An Admin can only grant access to Users they created, and only on sub modules they created.
4. Super Admin manages accounts, not content.

The logic lives in `backend/utils/accessScope.js` (`getContentFilter` for lists, `assertContentAccess` for single documents).

---

## Project Structure

Both apps are organised **feature-first**: each capability owns its model, controller and routes (backend) or API client and screens (frontend).

```
query-master/
├── README.md
├── docs/
│   └── QUERY_TEMPLATE_GUIDE.md      step-by-step guide for building templates
├── backend/
│   ├── server.js                    app wiring, startup, graceful shutdown
│   ├── config/db.js                 MongoDB connection
│   ├── middleware/                  auth, rbac, permission, errorHandler
│   ├── utils/                       tokens, sqlGenerator, accessScope, ensureSuperAdmin,
│   │                                trackRecentlyViewed, logger, ApiError, asyncHandler
│   └── modules/
│       ├── auth/  users/  categories/  modules/  submodules/
│       └── favorites/  notes/  permissions/  dashboard/
└── frontend/
    └── src/
        ├── main.jsx, App.jsx, index.css
        ├── api/axiosClient.js       HTTP client + silent-refresh interceptor
        ├── store/store.js           Redux store (auth slice)
        ├── hooks/                   useTheme, useCountUp
        ├── lib/                     roles, format, multiValue
        ├── components/
        │   ├── common/              Button, Modal, DataTable, MultiValueInput, ...
        │   └── layout/              AppShell, Sidebar, Topbar
        └── features/
            ├── auth/  dashboard/  admin/  categories/  modules/
            ├── submodules/  favorites/  notes/  users/
            └── permissions/  settings/
```

---

## Getting Started (Local)

**Requirements:** Node.js **22.22 or newer**, npm, and MongoDB (local or a free Atlas cluster).

### 1. Backend

```bash
cd backend
cp .env.example .env        # then edit the values (see Environment Variables)
npm install
npm run dev                 # http://localhost:5000
```

Check it is alive:

```bash
curl http://localhost:5000/api/health
```

On the first start against an empty database the server creates the Super Admin from `SUPER_ADMIN_EMAIL`. If `SUPER_ADMIN_PASSWORD` is blank, a random password is generated and **printed once in the terminal**. Copy it immediately.

### 2. Frontend

```bash
cd frontend
cp .env.example .env        # VITE_API_URL=http://localhost:5000/api
npm install
npm run dev                 # http://localhost:5173
```

### Scripts

| Where    | Command           | What it does                             |
| -------- | ----------------- | ---------------------------------------- |
| backend  | `npm run dev`     | Start with `node --watch` (auto-restart) |
| backend  | `npm start`       | Start for production                     |
| frontend | `npm run dev`     | Vite dev server                          |
| frontend | `npm run build`   | Production build into `dist/`            |
| frontend | `npm run preview` | Serve the production build locally       |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable               | Local value                              | Production value               | Notes                                            |
| ---------------------- | ---------------------------------------- | ------------------------------ | ------------------------------------------------ |
| `PORT`                 | `5000`                                   | leave unset                    | Render provides its own                          |
| `NODE_ENV`             | `development`                            | `production`                   | Enables `trust proxy` and `combined` logs        |
| `MONGO_URI`            | `mongodb://localhost:27017/query-master` | Atlas connection string        | **Required**                                     |
| `JWT_ACCESS_SECRET`    | any string                               | long random string             | **Required**                                     |
| `JWT_REFRESH_SECRET`   | a different string                       | a different long random string | **Required**, must differ from the access secret |
| `JWT_ACCESS_EXPIRES`   | `15m`                                    | `15m`                          |                                                  |
| `JWT_REFRESH_EXPIRES`  | `7d`                                     | `7d`                           |                                                  |
| `COOKIE_SECURE`        | `false`                                  | `true`                         |                                                  |
| `COOKIE_SAMESITE`      | `lax`                                    | `none`                         | `none` requires `COOKIE_SECURE=true`             |
| `CLIENT_URL`           | `http://localhost:5173`                  | exact frontend origin          | **Required**; no trailing slash; used for CORS   |
| `SUPER_ADMIN_EMAIL`    | e.g. `superadmin@querymaster.local`      | your email                     | Used to bootstrap the first account              |
| `SUPER_ADMIN_PASSWORD` | blank                                    | a strong password              | If blank, a random one is logged once            |
| `SUPER_ADMIN_NAME`     | `Super Admin`                            | your name                      |                                                  |

Generate strong secrets with:

```bash
openssl rand -base64 48
```

The server exits at startup with a clear message if `MONGO_URI`, either JWT secret or `CLIENT_URL` is missing.

### Frontend (`frontend/.env`)

| Variable       | Example                     | Notes                                                                                        |
| -------------- | --------------------------- | -------------------------------------------------------------------------------------------- |
| `VITE_API_URL` | `http://localhost:5000/api` | Must end in `/api`. Baked in at **build time**, so changing it on a host requires a redeploy |

---

## Using the App (Walkthrough)

1. Start the backend and copy the generated Super Admin password if one was printed.
2. Log in as **Super Admin**. Open **Admins** and create an Admin account. Log out.
3. Log in as the **Admin**. Open **Admin Panel** and create a **Category**, then a **Module** inside it.
4. **Admin Panel → Queries → Create Query**: fill in the name, type, SQL template and any placeholders or fields. Save.
5. Open **Users** and create a **User**. Open **Permissions**, pick the user, tick actions on the query, and save.
6. Log in as the **User**. The sidebar shows only the granted query. Open it, fill the form, click **Generate SQL**, then **Copy Query**.

---

## Building a Query Template

A query is built from up to three ingredients. Full reference: [`docs/QUERY_TEMPLATE_GUIDE.md`](./docs/QUERY_TEMPLATE_GUIDE.md).

| Ingredient                        | Purpose                                         | Token in the template                                             |
| --------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------- |
| **Placeholders**                  | Fill-in values                                  | `{{YourName}}`                                                    |
| **Updatable / Insertable fields** | Columns the user ticks for `UPDATE` or `INSERT` | `{{SET_CLAUSE}}`, or `{{INSERT_COLUMNS}}` and `{{INSERT_VALUES}}` |
| **WHERE fields**                  | Conditions the user ticks                       | `{{WHERE_CLAUSE}}` (joined by AND or OR)                          |

**Query types:** `INSERT`, `UPDATE`, `DELETE`, `SELECT`.

**Data types and what the user sees**

| Data type                              | Control                            | Output                                                                    |
| -------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------- |
| `STRING`, `DATE`, `DATETIME`, `CUSTOM` | Text box                           | `'value'` (quotes escaped)                                                |
| `INTEGER`, `DECIMAL`                   | Text box, validated                | Unquoted number; anything else is rejected with an error naming the field |
| `BOOLEAN`                              | True/False dropdown                | `1` or `0`                                                                |
| `ARRAY`                                | Dropdown of the options you define | `'option'`                                                                |
| `JSON`                                 | Text box                           | Quoted JSON text                                                          |
| `NULL`                                 | Nothing to fill                    | `NULL`                                                                    |

Tick **Multiple values** on a WHERE field or a placeholder to accept a list (not available for `BOOLEAN`, `NULL`, `JSON`).

**Example: UPDATE**

Template:

```sql
UPDATE Employee
SET
{{SET_CLAUSE}}
WHERE
{{WHERE_CLAUSE}};
```

User ticks _Is Active_ (True) and _Department_ (Finance), and enters Employee ID `EMP1001`. Result:

```sql
UPDATE Employee
SET
is_active = 1,
  department = 'Finance'
WHERE
employee_id = 'EMP1001';
```

**Example: IN lists**

```sql
SELECT * FROM Employee WHERE employee_id IN ('E101', 'E102', 'E103') AND level IN (1, 2);
```

**Rules to remember**

- Never make a table or column name a `{{placeholder}}`; values are quoted, which breaks identifiers.
- Include the reserved token that matches your field list, otherwise nothing is injected.
- Use a _Multiple values_ placeholder only inside `IN ( ... )`.

---

## API Overview

Base path `/api`. All responses use `{ success, data?, message?, details?, pagination? }`.

| Area        | Endpoints                                                                                                                                                                                                    |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Health      | `GET /health`                                                                                                                                                                                                |
| Auth        | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password`                                                                                                  |
| Users       | `GET /users`, `GET /users/:id`, `POST /users`, `PATCH /users/:id`, `DELETE /users/:id` (Super Admin and Admin)                                                                                               |
| Categories  | `GET /categories`, `GET /categories/sidebar`, `GET /categories/:id`, `POST`, `PATCH /:id`, `DELETE /:id` (writes: Admin)                                                                                     |
| Modules     | `GET /modules`, `POST`, `PATCH /:id`, `DELETE /:id` (writes: Admin)                                                                                                                                          |
| Queries     | `GET /submodules` (filters `module`, `category`, `queryType`, `tag`, `search`, `page`, `limit`), `GET /submodules/:id`, `POST`, `PATCH /:id`, `DELETE /:id` (writes: Admin), `POST /submodules/:id/generate` |
| Favorites   | `GET /favorites`, `POST /favorites/:subModuleId`, `DELETE /favorites/:subModuleId`                                                                                                                           |
| Notes       | `GET /notes?subModule=`, `POST /notes`, `PATCH /notes/:id`, `DELETE /notes/:id`                                                                                                                              |
| Permissions | `GET /permissions/:userId`, `PUT /permissions/:userId` (Admin; replaces the user's full grant set)                                                                                                           |
| Dashboard   | `GET /dashboard` (content depends on role)                                                                                                                                                                   |

**Generate request body**

```json
{
  "placeholderValues": { "Ids": ["E1", "E2"] },
  "selectedUpdateFields": ["Is Active", "Department"],
  "updateFieldValues": { "Is Active": "true", "Department": "Finance" },
  "selectedWhereFields": ["Employee ID"],
  "whereFieldValues": { "Employee ID": "EMP1001" }
}
```

Status codes used: `200`, `201`, `400` (validation), `401` (not authenticated), `403` (not allowed), `404`, `409` (duplicate or has children), `500`.

---

## Security

- **Tokens:** access token in memory only (never `localStorage`); refresh token in an httpOnly cookie scoped to `/api/auth`; only its SHA-256 hash is stored; separate secrets for the two token types.
- **Passwords:** bcrypt (10 rounds); `password` is `select: false` and never returned.
- **Per-request account check:** `requireAuth` reloads the user, so disabling an account takes effect immediately.
- **Authorization on the server:** ownership and grant checks for every id-based request (prevents IDOR).
- **Hardening:** Helmet, CORS limited to `CLIENT_URL`, rate limit of 500 requests per 15 minutes per IP, 1 MB JSON limit.
- **Generator safety:** string escaping, strict numeric validation, one-pass token replacement.
- **Operations:** env validation on boot, graceful shutdown with a 10-second deadline, process exit on unhandled rejections.

---

## Deployment

Suggested free-tier stack: **MongoDB Atlas** (database), **Render** (API), **Vercel** (frontend). The two apps end up on different domains, so the refresh cookie must be `SameSite=None; Secure`.

Order of operations: **Atlas → Render (temporary `CLIENT_URL`) → Vercel → set the real `CLIENT_URL` on Render.**

### 1. MongoDB Atlas

1. Create a free **M0** cluster.
2. _Database Access_: add a user with a strong password (URL-encode special characters in the connection string).
3. _Network Access_: allow `0.0.0.0/0` (free-tier Render has no fixed IP).
4. Copy the connection string and add the database name:
   `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/query-master?retryWrites=true&w=majority`

### 2. Backend on Render

1. Push the repo to GitHub. Render → **New → Web Service** → select the repo.
2. **Root Directory:** `backend` · **Build:** `npm install` · **Start:** `npm start`
3. Add the production environment variables from the table above (`NODE_ENV=production`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`, and so on).
4. Deploy and check the logs for `MongoDB connected` and `Super Admin account created`. Copy the generated password if you did not set one.
5. Open `https://<service>.onrender.com/api/health`.

### 3. Frontend on Vercel

1. **Add New → Project** → same repo.
2. **Root Directory:** `frontend` · **Preset:** Vite · **Build:** `npm run build` · **Output:** `dist`
3. Environment variable: `VITE_API_URL = https://<service>.onrender.com/api`
4. Add `frontend/vercel.json` so deep links work after a refresh:

   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
   ```

5. Deploy and copy the Vercel URL.

### 4. Finish

Set `CLIENT_URL` on Render to the exact Vercel origin (`https://...vercel.app`, no trailing slash). Render restarts the service.

### 5. Verify

- Log in on the Vercel site.
- DevTools → _Application → Cookies_: `refreshToken` with `Secure` and `SameSite=None`.
- **Refresh the page and confirm you stay logged in.** This is the first thing to break if cookies or CORS are misconfigured.

> **Heads-up:** a cross-site cookie can be blocked by some browsers (Safari by default). For the most reliable setup, serve the frontend and API under one parent domain (for example `app.example.com` and `api.example.com`) or have Vercel proxy `/api/*` to Render.

---

## Troubleshooting

| Symptom                                                      | Likely cause                                                     | Fix                                                                                                                       |
| ------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Server exits with _Missing required environment variable(s)_ | `MONGO_URI`, a JWT secret or `CLIENT_URL` not set                | Set it and restart                                                                                                        |
| Cannot connect to MongoDB                                    | Atlas IP allowlist, wrong password, unencoded special characters | Allow `0.0.0.0/0`; URL-encode the password                                                                                |
| CORS error in the browser                                    | `CLIENT_URL` does not exactly match the frontend origin          | Match it exactly (scheme, host, no trailing slash)                                                                        |
| Login works but a page refresh logs you out                  | Refresh cookie not stored or sent                                | `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`; check Render logs for the startup warning; check browser cookie blocking |
| Redirected to `/login` in a loop                             | Refresh returns `401`                                            | Cookie issue above, or `JWT_REFRESH_SECRET` was changed                                                                   |
| 404 when refreshing `/dashboard` on Vercel                   | No SPA fallback                                                  | Add `vercel.json` rewrite                                                                                                 |
| Frontend calls `localhost:5000` in production                | `VITE_API_URL` missing at build time                             | Set it, then redeploy                                                                                                     |
| First request after idle is slow                             | Render free tier sleeps                                          | Expected; ping `/api/health` or upgrade                                                                                   |
| `429 Too Many Requests`                                      | Rate limit reached                                               | Wait, or raise the limit; confirm `NODE_ENV=production` behind a proxy                                                    |
| Lost the Super Admin password                                | Bootstrap runs only once; there is no reset flow                 | Delete that user document in Atlas and restart with `SUPER_ADMIN_PASSWORD` set                                            |

---

## Testing

There is no automated test suite in the repository yet. The SQL generator is a set of pure functions and is the best place to start. Node 22 includes a test runner, so no extra package is needed:

```bash
cd backend
node --test utils/sqlGenerator.test.js
```

Suggested cases: quote escaping, `$&` in values, non-numeric `INTEGER` rejected with `400`, `IN` list de-duplication, `UPDATE` and `INSERT` output, empty optional multi-value placeholder renders `NULL`.

---

## Known Limitations and Roadmap

- [ ] **Query list pagination in the UI.** The API paginates (default 20 per page) but the All Queries screen does not request further pages yet.
- [ ] **Permission actions.** `CREATE`, `UPDATE`, `DELETE` and `MANAGE` are stored but not enforced; only `VIEW` changes behaviour. `requireSubModuleAccess` exists but is not mounted on any route.
- [ ] **Error mapping.** Mongoose cast, validation and duplicate-key errors currently return `500`; map them to `400` and `409`.
- [ ] **Refresh token rotation** and revocation on password change.
- [ ] **Stricter login rate limit** and lockout.
- [ ] **Cascade cleanup** of permissions, favorites and refresh tokens when a user is deleted.
- [ ] **Create-query validation:** derive `category` from the chosen module and whitelist accepted fields.
- [ ] **Dialect support** (PostgreSQL, Oracle, MySQL) for boolean literals and string escaping.
- [ ] **Query version history** (today `version` is only a counter).
- [ ] **Route-level code splitting** (the production bundle is a single ~800 kB chunk).
- [ ] **Automated tests** and a CI workflow.
- [ ] Forgot-password flow and Admin-initiated password reset.

**Out of scope by design:** executing SQL, connecting to databases, AI features.

---

## Author

**Ashish Pawar**

GitHub: `https://github.com/Ashish-Pawar-AP` · LinkedIn: `https://www.linkedin.com/in/ashish-pawar-ap/` · Email: `ashishpawarap1904@gmail.com`
