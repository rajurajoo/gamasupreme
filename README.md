# GAMA SUPREME

A full-stack ERP for GAMA SUPREME, a technical services company running three
businesses from one shared system: **Door Manufacturing**, **Interior
Fit-out**, and **Material Trading**. Shared login, customers and employees;
each business keeps its own document number series and business-specific
records. Also handles Quotation -> Invoice -> Delivery Order -> Completion
Certificate document chain, Payroll, and a Monthly Account Auditing Report.
All money values are shown in **AED**.

## Stack
- **Backend**: Node.js + Express + Prisma ORM + SQLite (dev). Schema uses only standard/portable types so `datasource provider` can be switched to `postgresql` later without schema changes.
- **Frontend**: React (Vite), plain CSS, `react-router-dom` for routing.
- **Auth**: JWT, 3 roles (admin, sales_staff, accountant).

## Project structure
```
sales-erp/
  backend/    Express API + Prisma schema/migrations/seed
  frontend/   Vite React app (proxies /api -> http://localhost:4000)
```

## First-time setup

### Backend
```
cd backend
npm install
npx prisma migrate dev --name init   # creates dev.db and applies schema
npm run seed                         # seeds users, businesses, demo data
npm run dev                          # starts API on http://localhost:4000
```

### Frontend (separate terminal)
```
cd frontend
npm install
npm run dev                          # starts Vite on http://localhost:5173
```

Open http://localhost:5173 and log in. See `SETUP.md` for seeded credentials.

## Running both dev servers day-to-day
Two terminals:
```
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```
The frontend dev server proxies any `/api/*` request to `http://localhost:4000` (configured in `frontend/vite.config.js`), so the browser only ever talks to `:5173`.

## Businesses
Three businesses are seeded: **Door Manufacturing** (`DM`), **Interior
Fit-out** (`FO`), **Material Trading** (`MT`). The active business is picked
from a switcher in the top of the sidebar; it is sent on every API request as
an `x-business-id` header and used to scope document lists/creation and to
generate that business's own document number series.

- **Door Manufacturing**: quotation/invoice line items carry door size
  (width x height), material and finish/color. Each quotation has a job
  stage tracker (Measurement -> Production -> QC -> Delivery), shown and
  editable on the quotation detail page.
- **Interior Fit-out**: quotations/invoices/DOs/certificates link to a
  Project (site name, address, client, start date). Projects have a
  milestone list (pending/in-progress/done) and an overall % progress bar.
- **Material Trading**: a Product catalog (SKU, unit, unit cost, stock qty,
  reorder threshold) with a low-stock indicator. Purchase Orders (from a
  Supplier) increase stock when marked received. Sales invoices can pick
  catalog products as line items, decrementing stock on invoice creation.

## Document chain
1. **Quotation** (`QT-<code>-2026-001`) - line items, customer, status draft/sent/accepted/rejected.
2. **Invoice** (`INV-<code>-2026-001`) - created from an *accepted* quotation; copies customer + items; own due date and paid/unpaid/partial status.
3. **Delivery Order** (`DO-<code>-2026-001`) - created from an invoice; lists items delivered, delivery date, signed-by.
4. **Completion Certificate** (`CC-<code>-2026-001`) - created from a delivery order, **only for quotations with jobType = "fitout"**; completion date, scope description, client sign-off fields.

`<code>` is the active business's short code (`DM`/`FO`/`MT`). Numbers are generated sequentially per business per year via a `DocumentSequence` table (see `backend/src/docNumber.js`).

## Payroll
Employee records with monthly salary (shared across all three businesses). A payroll run is created per calendar month (`YYYY-MM`), auto-listing active employees; deductions/bonuses can be entered per employee before generating the run, producing payslips with a computed net pay, shown in AED.

## Monthly Account Auditing Report
`GET /api/reports/monthly/:month` aggregates: total sales (sum of invoices issued that month), total collected (sum of amountPaid on those invoices), outstanding (unpaid balance), that month's total payroll cost, and a net summary (collected - payroll cost) - plus a per-business breakdown (`byBusiness`), since payroll/employees are shared but sales are business-specific. Viewable on the Reports page with a clean print-friendly layout (`window.print()` - use "Save as PDF" in the browser print dialog for a PDF export; there is no server-side PDF generation).

## Roles / permissions
- **sales_staff**: create/edit quotations, invoices, delivery orders, completion certificates, projects/milestones, products, suppliers, purchase orders.
- **accountant**: view all documents, manage payroll, view the auditing report, view stock/products/purchase orders.
- **admin**: everything above, plus a simple user list/management page.

## Known limitations / stretch goals not done
- No real PDF export - the print view (`window.print()`) is the "export"; true PDF generation (e.g. via a PDF library) was left as a stretch goal per the spec.
- No password reset/email flows - this is a small internal tool, so accounts are managed manually by an admin.
- No pagination on list pages - fine for a small business's document volume, would need it at scale.
- Client "signature" on completion certificates is a plain text placeholder field, not a real e-signature capture.
- Material Trading invoices are still created via the existing Quotation -> Invoice flow (not a separate "direct sale" screen); product line items and stock decrement happen at invoice-creation time.
- SQLite is used for local dev; switching to Postgres for cloud hosting requires only changing `datasource.provider` and `DATABASE_URL` in `backend/prisma/schema.prisma` / `.env`, then re-running migrations (schema deliberately avoids SQLite-only features and native enums to stay Postgres-compatible).
