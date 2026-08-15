# Setup & Seeded Credentials

## Seeded demo users
Run `npm run seed` inside `backend/` to create these (idempotent - safe to re-run).

All demo accounts use the same password: **`password123`**

| Name            | Email                     | Role         |
|-----------------|----------------------------|--------------|
| Alice Admin     | admin@gamasupreme.com      | admin        |
| Sam Sales       | sam@gamasupreme.com        | sales_staff  |
| Priya Sales     | priya@gamasupreme.com      | sales_staff  |
| Amy Accountant  | amy@gamasupreme.com        | accountant   |
| Ben Accountant  | ben@gamasupreme.com        | accountant   |

The seed also creates:
- 3 businesses: Door Manufacturing (`DM`), Interior Fit-out (`FO`), Material Trading (`MT`)
- 2 demo customers (Acme Retail Pte Ltd, Golden Spoon Restaurant) and 3 demo employees (John Tan, Mary Lim, Rahim Ismail) - shared across all businesses
- 1 supplier (Gulf Hardware Supplies) and 2 Material Trading products (Cement Bag 50kg, PVC Pipe 4in x 3m)
- 1 Interior Fit-out project (Acme HQ Office Fitout) with 4 milestones

## Environment variables
`backend/.env` (already created for local dev):
```
DATABASE_URL="file:./dev.db"
JWT_SECRET="sales-erp-dev-secret-change-in-production"
PORT=4000
```
Change `JWT_SECRET` before any real deployment.

## Switching to Postgres later
1. In `backend/prisma/schema.prisma`, change:
   ```
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
2. Set `DATABASE_URL` to your Postgres connection string.
3. Run `npx prisma migrate dev` again to generate Postgres migrations.

No other schema changes are needed - the schema intentionally avoids SQLite-only features (native enums are modeled as plain strings for portability).

## Quick start (both servers)
```
cd backend && npm install && npx prisma migrate dev --name init && npm run seed && npm run dev
```
In a second terminal:
```
cd frontend && npm install && npm run dev
```
Then open http://localhost:5173, log in with any account above, and use the
business switcher at the top of the sidebar to move between Door
Manufacturing / Interior Fit-out / Material Trading.
