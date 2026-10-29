# Riadna dashboard

A Next.js dashboard for riad owners and staff to manage bookings, rooms, guests, and availability.

## Requirements

- Node.js **20.9 or newer** (Node 20 LTS recommended)
- npm 10 or newer

Check your versions:

```bash
node -v
npm -v
```

## Install and run

```bash
git clone https://github.com/aouidate47/riadna_dashboard.git
cd riadna_dashboard
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The first request compiles routes and can take a while. Later requests are much faster. Use `npm run build` and `npm start` to measure production performance.

## Troubleshooting installs

`npm ci` installs every dependency, including Next.js. Do not run `npm i next` by itself: it skips the rest of the app's dependencies and leaves the install incomplete.

If `next` is missing or the install stopped partway through, remove `node_modules`, clear the npm cache, and install again.

PowerShell (Windows):

```powershell
Remove-Item -Recurse -Force node_modules
npm cache clean --force
npm ci
```

macOS/Linux:

```bash
rm -rf node_modules
npm cache clean --force
npm ci
```

If installation still fails, check that `node -v` reports 20.9 or newer, then share the full `npm ci` error.

## Demo accounts

All demo accounts use the password `test1234`.

| Role | Email |
| --- | --- |
| Owner | `owner@yasmine.ma` |
| Staff | `staff@yasmine.ma` |
| Owner | `owner@daranika.ma` |
| Owner | `owner@riadzitoun.ma` |

The demo account box is shown in development only.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build |
| `npm start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run verify` | Run the data and tenancy checks |

## Stack

Next.js 16, React 19, Tailwind CSS 4, Radix UI, Recharts, and dnd-kit.
