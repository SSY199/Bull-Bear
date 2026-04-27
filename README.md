# Bull Bear

Bull Bear is a stock intelligence app with:

1. A Next.js frontend at port `3000`
2. A Python Flask prediction backend at port `5001`
3. A TensorFlow/Keras `.h5` model for stock prediction

This guide is a full, step-by-step install and runbook with verification checks after each major step.

## 1) Prerequisites

Install these first:

1. Node.js `20+`
2. npm `10+`
3. Python `3.13.x` (recommended for this backend venv)
4. `git`
5. `curl`

Verify:

```bash
node -v
npm -v
python3 --version
git --version
curl --version
```

Expected:

1. All commands return versions
2. No command should fail with `not found`

## 2) Clone And Enter Project

```bash
git clone <your-repo-url>
cd bull-bear
```

Verify folder structure:

```bash
ls
```

Expected entries include:

1. `app`
2. `backend`
3. `package.json`

## 3) Configure Environment Variables

Create a root `.env` file (same folder as `package.json`) and set your required keys.

Minimum keys used in code:

1. `MONGODB_URI`
2. `FINNHUB_API_KEY` (or `NEXT_PUBLIC_FINNHUB_API_KEY`)
3. Clerk keys (for auth)
4. Optional: `PYTHON_API_BASE_URL` (defaults to `http://127.0.0.1:5001`)
5. Optional mail/news keys if you use those flows:
	`NODEMAILER_EMAIL`, `NODEMAILER_KEY`, `GEMINI_API_KEY`

Quick check (no secret values printed):

```bash
grep -E '^(MONGODB_URI|FINNHUB_API_KEY|NEXT_PUBLIC_FINNHUB_API_KEY|PYTHON_API_BASE_URL|NODEMAILER_EMAIL|NODEMAILER_KEY|GEMINI_API_KEY|CLERK_)=' .env
```

Expected:

1. Required keys appear as lines

## 4) Install Frontend Dependencies

From project root:

```bash
npm install
```

Verify:

```bash
npm ls --depth=0 > /tmp/bull-bear-npm-check.txt && tail -n 20 /tmp/bull-bear-npm-check.txt
```

Expected:

1. Command completes without install errors
2. Top-level dependencies are listed

## 5) Setup Python Backend Virtual Environment

From project root:

```bash
cd backend
python3 -m venv venv
```

Verify interpreter exists:

```bash
./venv/bin/python --version
```

Expected:

1. A Python version is printed

## 6) Install Backend Dependencies

From `backend` folder:

```bash
./venv/bin/python -m pip install --upgrade pip
./venv/bin/python -m pip install -r requirements.txt
./venv/bin/python -m pip install tf_keras
```

Why `tf_keras`:

1. Your legacy `.h5` model uses settings that require TensorFlow legacy Keras compatibility.

Verify imports:

```bash
./venv/bin/python - <<'PY'
import flask
import numpy
import pandas
import tensorflow
import tf_keras
import yfinance
print('backend imports: OK')
PY
```

Expected:

1. Output prints `backend imports: OK`

## 7) Start Python Prediction Backend

From project root, run with explicit paths to avoid cwd mistakes:

```bash
./backend/venv/bin/python ./backend/app.py
```

Expected log:

1. `Running on http://127.0.0.1:5001`

Keep this terminal running.

### Verify backend health in another terminal

```bash
curl -sS -m 15 -w '\nHTTP_STATUS:%{http_code}\n' http://127.0.0.1:5001/api/health
```

Expected:

1. JSON body: `{"status":"ok"}`
2. HTTP status: `200`

### Verify backend prediction in another terminal

```bash
curl -sS -m 60 -X POST http://127.0.0.1:5001/api/predict \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"AAPL","includeCharts":false}' \
  -w '\nHTTP_STATUS:%{http_code}\n'
```

Expected:

1. JSON with `"status":"success"`
2. `data.predictedPrice`, `data.currentPrice`, `data.changePercent`
3. HTTP status: `200`

## 8) Start Next.js App

From project root:

```bash
npm run dev
```

Expected log:

1. `Local: http://localhost:3000`

Keep this terminal running.

## 9) Verify Next.js -> Python Integration

In another terminal:

```bash
curl -sS -m 90 -X POST http://127.0.0.1:3000/api/prediction \
  -H 'Content-Type: application/json' \
  -d '{"symbol":"AAPL","includeCharts":false}' \
  -w '\nHTTP_STATUS:%{http_code}\n'
```

Expected:

1. JSON with `"status":"success"`
2. Same prediction structure as backend API
3. HTTP status: `200`

## 10) Verify In Browser

1. Open `http://localhost:3000`
2. Sign in
3. Open `http://localhost:3000/prediction`
4. Enter symbol (example `AAPL`)
5. Click `Predict`

Expected:

1. Predicted next close card appears
2. Current price and change metrics appear
3. Optional charts appear when requested

## 11) One-Command Verification Script

You already have:

1. `backend/scripts/verify_prediction.sh`

Run backend-only checks:

```bash
chmod +x backend/scripts/verify_prediction.sh
./backend/scripts/verify_prediction.sh
```

Run backend + Next proxy checks:

```bash
./backend/scripts/verify_prediction.sh --next
```

Expected:

1. Step logs `[1/6] ... [6/6]`
2. `All checks passed.`

## 12) Troubleshooting

1. `ModuleNotFoundError` when running backend:
	Use backend venv interpreter only:
	`./backend/venv/bin/python ./backend/app.py`

2. Port `5000` returns `AirTunes` / `403`:
	This project uses port `5001` by default to avoid macOS conflict.

3. Next.js API cannot reach Python:
	Ensure backend is running and `PYTHON_API_BASE_URL` points to `http://127.0.0.1:5001` (or leave unset for default).

4. Auth pages not working:
	Verify Clerk env keys are present and valid.

5. Prediction endpoint slow first time:
	First model inference can take longer due model load/warm-up.

## 13) Production Notes

1. Flask in this repo runs as a development server.
2. For production, run behind Gunicorn/Uvicorn workers and proper reverse proxy.
3. Keep secrets only in environment variables, never commit `.env`.
