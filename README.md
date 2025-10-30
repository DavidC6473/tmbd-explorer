# TMDB Explorer

**Interactive movie analytics dashboard** built with **React + TypeScript + Vite** on the front end and a **FastAPI + PostgreSQL (Neon)** backend.  
It visualizes movie budgets, revenues, and ratings through dynamic ECharts scatter plots, all powered by real TMDB dataset insights.

>  **Live demo:** [tmbd-explorer.vercel.app](https://tmbd-explorer.vercel.app)  
>  **API:** [tmbd-explorer.onrender.com](https://tmbd-explorer.onrender.com)

---

##  Features

- **Interactive visualizations** of TMDB movie data using ECharts:
  - Budget vs Revenue (log–log scale)
  - Rating vs Revenue (IMDB / TMDB ratings)
- **Genre and Year filtering** with responsive updates.
- **Smart outlier trimming** for realistic, readable datasets.
- **Export charts as PNGs** directly from the dashboard.
- **Backend powered by FastAPI** with optimized SQLAlchemy queries.
- **PostgreSQL database hosted on Neon** for fast, serverless SQL.
- **Deployed on modern infrastructure:**
  - Render (API)
  - Vercel (frontend)

---

##  Architecture Overview

```
┌─────────────────────────────┐          ┌──────────────────────────────┐
│   React + Vite Frontend     │          │       FastAPI Backend        │
│  (tmbd-explorer.vercel.app) │    ←→    │ (tmbd-explorer.onrender.com) │
│      • TypeScript           │          │      • SQLAlchemy + Psycopg  │
│      • ECharts              │          │      • Neon PostgreSQL       │
└─────────────────────────────┘          └──────────────────────────────┘
```

- **Frontend:**  
  Written in React (Vite + TypeScript + Tailwind). Fetches data from the FastAPI `/meta`, `/scatter/budget`, and `/scatter/rating` endpoints.  
  Hosted on **Vercel**, using `VITE_API_BASE=https://tmbd-explorer.onrender.com`.

- **Backend:**  
  Built with FastAPI, serving JSON endpoints from a **Neon PostgreSQL** instance via SQLAlchemy ORM.  
  Hosted on **Render**, with automatic SSL, connection pooling, and CORS configured for Vercel.

---

##  Tech Stack

| Layer | Technology |
|-------|-------------|
| **Frontend** | React, TypeScript, Vite, Tailwind CSS, ECharts |
| **Backend** | FastAPI, SQLAlchemy, Psycopg (v3), Pydantic |
| **Database** | PostgreSQL (Neon) |
| **Deployment** | Vercel (frontend), Render (API) |
| **Data Source** | TMDB Movie Dataset (via Kaggle export) |

---

##  Dataset & Data Preparation

This project uses the **[TMDB 5000 Movie Dataset](https://www.kaggle.com/datasets/tmdb/tmdb-movie-metadata)** available on Kaggle.  
It contains metadata for thousands of movies, including title, release date, genre, budget, revenue, language, and ratings.

### Cleaning & Transformation
The raw dataset was refined through a lightweight ETL process before being imported into PostgreSQL:
- Removed duplicate or incomplete records.  
- Filtered unrealistic values (e.g., `budget <= 1` or `revenue <= 1`).  
- Converted budgets and revenues from strings to numeric types for proper aggregation.  
- Extracted and normalized genre and language information from JSON-formatted fields.  
- Computed aggregate statistics (year range, genre counts, language counts) for the `/meta` endpoint.  
- Trimmed extreme outliers to ensure charts remain visually interpretable.

The cleaned dataset was then uploaded to **Neon PostgreSQL**, which the FastAPI backend queries directly.

### Integration Notes
- `/meta` endpoint returns dataset metadata (min/max year, genres, languages).  
- `/scatter/budget` and `/scatter/rating` endpoints query pre-cleaned movie records to ensure realistic data scaling.  
- All transformations were performed locally with **Python (pandas + SQLAlchemy)** before loading into the database.

---

##  Running Locally

### 1️ Backend

```bash
cd api
python -m venv .venv
source .venv/bin/activate  # (on Windows: .venv\Scripts\activate)
pip install -r requirements.txt
```

Create `.env` in `api/infra/.env`:

```bash
DB_URL=postgresql+psycopg://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require
```

Run locally:

```bash
uvicorn main:app --reload --port 8000
```

Now visit → `http://127.0.0.1:8000`

---

### 2️ Frontend

```bash
cd frontend
npm install
```

Create `.env` in `/frontend`:

```bash
VITE_API_BASE=http://127.0.0.1:8000
```

Then run:

```bash
npm run dev
```

Visit → `http://localhost:5173`

---

##  Deployment Notes

### Frontend (Vercel)

- **Framework preset:** Vite  
- **Root directory:** `/frontend`
- **Environment variable:**

  ```
  VITE_API_BASE=https://tmbd-explorer.onrender.com
  ```

### Backend (Render)

- **Root directory:** `/api`
- **Start command:**

  ```
  uvicorn main:app --host 0.0.0.0 --port $PORT
  ```

- **Environment variables:**

  ```
  DB_URL=postgresql+psycopg://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require
  DB_POOL_SIZE=5
  ```

---

##  Endpoints

| Endpoint | Description |
|-----------|-------------|
| `/health` | Health check (`{"ok": true}`) |
| `/meta` | Returns global dataset metadata (year range, genres, languages) |
| `/scatter/budget` | Scatter data for **Budget vs Revenue** |
| `/scatter/rating` | Scatter data for **Rating vs Revenue** |

---

##  Example Response (`/meta`)

```json
{
  "year_min": 1920,
  "year_max": 2025,
  "genres": ["Drama", "Comedy", "Action", "Thriller"],
  "languages": ["en", "fr", "es", "ja"]
}
```

---

##  Future Improvements

- Add filtering by language and release decade  
- Integrate live TMDB API for up-to-date data  
- Correlation heatmaps for multi-metric analysis  
- User-saved visualizations (local storage / auth)
