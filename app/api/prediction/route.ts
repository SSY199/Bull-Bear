import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_PYTHON_BASE_URL = 'http://127.0.0.1:5001';
const REQUEST_TIMEOUT_MS = 60000;

const getPythonApiBaseUrl = () =>
  process.env.PYTHON_API_BASE_URL ?? DEFAULT_PYTHON_BASE_URL;

const isValidTicker = (value: string) => /^[A-Z0-9.\-]{1,20}$/.test(value);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const symbol = typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
    const includeCharts = Boolean(body?.includeCharts);

    if (!symbol) {
      return NextResponse.json(
        {
          status: 'error',
          error: {
            code: 'symbol_required',
            message: 'Ticker symbol is required.',
          },
        },
        { status: 400 }
      );
    }

    if (!isValidTicker(symbol)) {
      return NextResponse.json(
        {
          status: 'error',
          error: {
            code: 'invalid_symbol',
            message: 'Ticker symbol format is invalid.',
          },
        },
        { status: 400 }
      );
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const upstreamResponse = await fetch(`${getPythonApiBaseUrl()}/api/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symbol, includeCharts }),
        signal: controller.signal,
        cache: 'no-store',
      });

      const payload = await upstreamResponse.json();
      return NextResponse.json(payload, { status: upstreamResponse.status });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code = message.includes('abort') ? 'upstream_timeout' : 'upstream_error';

    return NextResponse.json(
      {
        status: 'error',
        error: {
          code,
          message: 'Prediction service is unavailable. Please try again.',
        },
      },
      { status: 502 }
    );
  }
}
