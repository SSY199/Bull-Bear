'use client';

import { FormEvent, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Sparkles } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requestPrediction } from '@/lib/services/prediction.client';

const toCurrency = (value: number, currencyCode: string) => {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2,
    }).format(value);
  }
};

const toPercent = (value: number) => `${value.toFixed(2)}%`;

const PredictionSection = () => {
  const [symbol, setSymbol] = useState('AAPL');
  const [includeCharts, setIncludeCharts] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PredictResponseData | null>(null);

  const isPositive = useMemo(() => (data?.changeAmount ?? 0) >= 0, [data]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const prediction = await requestPrediction({
        symbol: symbol.trim().toUpperCase(),
        includeCharts,
      });
      setData(prediction);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'Unable to fetch prediction right now.';
      setError(message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="space-y-6">
      <div className="rounded-xl border border-gray-600 bg-gray-800 p-6">
        <div className="mb-4 flex items-center gap-2 text-gray-100">
          <Sparkles className="h-5 w-5 text-yellow-400" />
          <h1 className="text-2xl font-semibold">AI Price Prediction</h1>
        </div>
        <p className="mb-6 text-sm text-gray-400">
          Enter a stock ticker to predict the next closing price using your Python deep learning model.
        </p>

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
          <Input
            value={symbol}
            onChange={(event) => setSymbol(event.target.value.toUpperCase())}
            placeholder="AAPL"
            aria-label="Ticker Symbol"
            className="h-11 border-gray-600 bg-gray-900 text-gray-100"
            maxLength={20}
            required
          />

          <label className="flex items-center gap-2 text-sm text-gray-300">
            <input
              type="checkbox"
              checked={includeCharts}
              onChange={(event) => setIncludeCharts(event.target.checked)}
              className="h-4 w-4 rounded border-gray-500 bg-gray-900"
            />
            Include charts
          </label>

          <Button
            type="submit"
            className="h-11 bg-yellow-500 text-gray-900 hover:bg-yellow-400"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Predicting
              </>
            ) : (
              'Predict'
            )}
          </Button>
        </form>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-gray-600 bg-gray-800 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Symbol</p>
              <p className="mt-2 text-xl font-semibold text-gray-100">{data.symbol}</p>
            </div>

            <div className="rounded-xl border border-gray-600 bg-gray-800 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Current Price</p>
              <p className="mt-2 text-xl font-semibold text-gray-100">
                {toCurrency(data.currentPrice, data.currencyCode)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-600 bg-gray-800 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Predicted Next Close</p>
              <p className="mt-2 text-xl font-semibold text-yellow-400">
                {toCurrency(data.predictedPrice, data.currencyCode)}
              </p>
            </div>

            <div className="rounded-xl border border-gray-600 bg-gray-800 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Expected Change</p>
              <p
                className={`mt-2 inline-flex items-center gap-2 text-xl font-semibold ${
                  isPositive ? 'text-teal-400' : 'text-red-400'
                }`}
              >
                {isPositive ? <ArrowUp className="h-5 w-5" /> : <ArrowDown className="h-5 w-5" />}
                {toCurrency(data.changeAmount, data.currencyCode)} ({toPercent(data.changePercent)})
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-gray-600 bg-gray-800 p-4 text-sm text-gray-400">
            <p>
              Model metadata: {data.trainingSamples} training points, {data.testSamples} test points.
            </p>
            <p className="mt-1">Currency: {data.currencyCode}</p>
            <p className="mt-1">Generated at: {new Date(data.generatedAt).toLocaleString()}</p>
          </div>

          {data.charts ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <img
                src={data.charts.ema_20_50}
                alt={`${data.symbol} EMA 20 and 50 chart`}
                className="w-full rounded-xl border border-gray-600 bg-gray-900"
              />
              <img
                src={data.charts.ema_100_200}
                alt={`${data.symbol} EMA 100 and 200 chart`}
                className="w-full rounded-xl border border-gray-600 bg-gray-900"
              />
              <img
                src={data.charts.prediction}
                alt={`${data.symbol} prediction trend chart`}
                className="w-full rounded-xl border border-gray-600 bg-gray-900 lg:col-span-2"
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
};

export default PredictionSection;
