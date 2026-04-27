export type PredictionRequest = {
  symbol: string;
  includeCharts?: boolean;
};

export const requestPrediction = async (
  payload: PredictionRequest
): Promise<PredictResponseData> => {
  const response = await fetch('/api/prediction', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as PredictApiResponse;

  if (!response.ok || data.status !== 'success' || !data.data) {
    const fallbackError = 'Prediction request failed.';
    const errorMessage =
      data.status === 'error' && data.error?.message
        ? data.error.message
        : fallbackError;
    throw new Error(errorMessage);
  }

  return data.data;
};
