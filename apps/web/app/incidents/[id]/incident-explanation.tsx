"use client";

import { useEffect, useState } from "react";
import { getIncidentExplanation } from "@/lib/api";
import { ApiError } from "@/lib/api-error";
import type { IncidentExplanation as Explanation } from "@/types/api";

export default function IncidentExplanation({ incidentId }: { incidentId: string }) {
  const [result, setResult] = useState<{
    incidentId: string;
    explanation?: Explanation;
    error?: string;
  } | null>(null);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrent = true;

    getIncidentExplanation(incidentId, controller.signal)
      .then((result) => {
        if (isCurrent) setResult({ incidentId, explanation: result });
      })
      .catch((loadError: unknown) => {
        if (!isCurrent || controller.signal.aborted) return;
        setResult({
          incidentId,
          error: loadError instanceof ApiError && loadError.status === 404
            ? "This incident is no longer current. Refresh the incident list before requesting an explanation."
            : loadError instanceof Error
              ? loadError.message
              : "The incident explanation could not be loaded.",
        });
      });

    return () => {
      isCurrent = false;
      controller.abort();
    };
  }, [incidentId, retry]);

  const currentResult = result?.incidentId === incidentId ? result : null;

  return (
    <section className="review-card explanation-card" aria-labelledby="explanation-title">
      <div className="card-heading">
        <div>
          <p className="panel-kicker">GROUNDED CONTEXT</p>
          <h2 id="explanation-title">Incident explanation</h2>
        </div>
      </div>
      {currentResult?.error ? (
        <div className="explanation-error" role="alert">
          <p>{currentResult.error}</p>
          <button className="refresh-button" type="button" onClick={() => setRetry((version) => version + 1)}>
            Retry explanation
          </button>
        </div>
      ) : currentResult?.explanation ? (
        <div className="explanation-content">
          <p>{currentResult.explanation.summary}</p>
          <p><strong>Citation:</strong> {currentResult.explanation.citation}</p>
          <p><strong>Uncertainty:</strong> {currentResult.explanation.uncertainty}</p>
          <p><strong>Escalate if:</strong> {currentResult.explanation.escalate_if}</p>
          <p><strong>De-escalate if:</strong> {currentResult.explanation.deescalate_if}</p>
        </div>
      ) : (
        <p className="explanation-loading" role="status" aria-busy="true">
          <span className="explanation-spinner" aria-hidden="true" />
          Loading grounded explanation. This may take 8–14 seconds.
        </p>
      )}
    </section>
  );
}
