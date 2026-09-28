"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import IncidentReview from "./incident-review";
import { getIncident } from "@/lib/api";
import type { Incident } from "@/types/api";

export default function MockIncidentReview({ id }: { id: string }) {
  const [incident, setIncident] = useState<Incident | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;
    getIncident(id).then((currentIncident) => {
      if (isCurrent) setIncident(currentIncident);
    }).catch((loadError: unknown) => {
      if (isCurrent) {
        setError(loadError instanceof Error ? loadError.message : "Incident could not be loaded.");
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [id]);

  if (incident) return <IncidentReview incident={incident} />;

  return (
    <main className="review-main">
      {error ? (
        <>
          <p className="form-message error-message" role="alert">{error}</p>
          <Link className="back-link" href="/">Return to the Command Center and refresh incidents.</Link>
        </>
      ) : (
        <p className="empty-state" role="status">Loading current incident…</p>
      )}
    </main>
  );
}