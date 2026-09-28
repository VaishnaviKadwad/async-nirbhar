import { notFound } from "next/navigation";
import { getIncident } from "@/lib/api";
import IncidentReview from "./incident-review";
import MockIncidentReview from "./mock-incident-review";

const useMocks = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

export default async function IncidentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (useMocks) return <MockIncidentReview id={id} />;

  let incident;

  try {
    incident = await getIncident(id);
  } catch {
    notFound();
  }

  return <IncidentReview incident={incident} />;
}