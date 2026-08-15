# Deploying GAMA SUPREME (step by step, no dev experience needed)

This app has two parts that get deployed separately:
- The **backend** (API + database) goes on **Railway**.
- The **frontend** (the website you click around in) goes on **Netlify**.

You'll deploy the backend first, copy its URL, then deploy the frontend using that URL.

Before starting: push this project to a GitHub repository (Railway and Netlify both deploy by connecting to GitHub).

## Part 1: Backend on Railway

1. Go to railway.app and create a new project.
2. Click **"Add PostgreSQL"** (or "New" → "Database" → "PostgreSQL") to add a Postgres database plugin to the project.
3. Click **"New"** → **"GitHub Repo"** and select this repository to add the backend as a service.
4. Once the service is created, open its **Settings** tab and set the **Root Directory** to `backend`.
5. Open the service's **Variables** tab and add:
   - `DATABASE_URL` — click "Add Reference" (or similar) and link it to the Postgres plugin's connection string, so it's filled in automatically. (You do not type this one yourself — Railway generates it from the Postgres plugin.)
   - `JWT_SECRET` — type any long random string of letters and numbers (this is used to secure login sessions). Example: mash your keyboard for 30+ characters.
   - `ALLOWED_ORIGIN` — leave this blank for now (a placeholder like `*` is fine temporarily). You'll come back and set it after Part 2.
6. Railway will build and deploy automatically. Once it's live, open the service's **Settings** → **Networking** and click "Generate Domain" if one isn't already there. Copy this URL — it looks like `https://your-backend.up.railway.app`. Write it down, you'll need it in Part 2.

## Part 2: Frontend on Netlify

1. Go to app.netlify.com and click **"Add new site"** → **"Import an existing project"**.
2. Choose GitHub and select this same repository.
3. When asked for build settings, enter:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist`
4. Before deploying (or right after, in Site settings → **Environment variables**), add:
   - `VITE_API_URL` — paste the Railway backend URL you copied in Part 1, step 6 (e.g. `https://your-backend.up.railway.app`).
5. Deploy the site. Once it's live, Netlify will give you a URL like `https://your-site-name.netlify.app`. Write this down too.

## Part 3: Connect them (go back to Railway)

1. Go back to your Railway backend service → **Variables**.
2. Set `ALLOWED_ORIGIN` to your Netlify URL from Part 2, step 5 (e.g. `https://your-site-name.netlify.app`). This tells the backend to allow requests from your website.
3. Railway will automatically redeploy the backend with the new setting.

## Part 4: Load starter data into the production database (one time only)

The app comes with a "seed" script that creates initial data (like the first admin user). You only need to run this once, against your live Railway database.

**Option A — Railway CLI (if you're comfortable installing a small command-line tool):**
1. Install the Railway CLI by following the instructions at railway.app (search "Railway CLI install").
2. In a terminal, run `railway login` and follow the prompts.
3. Run `railway link` and pick this project when asked.
4. Run:
   ```
   railway run npx prisma db seed
   ```
   from inside the `backend` folder. This runs the seed script against your live Postgres database.

**Option B — Railway dashboard (no install needed, if available on your plan):**
1. Open your backend service in the Railway dashboard.
2. Look for a **"Run Command"** or similar option in the service settings/menu.
3. Enter `npx prisma db seed` and run it.

That's it — the app is live. Visit your Netlify URL to use it.
