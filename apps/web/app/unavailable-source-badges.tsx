export default function UnavailableSourceBadges({ sources }: { sources: string[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="unavailable-source-list" aria-label="Unavailable evidence sources">
      {sources.map((source) => (
        <span className="unavailable-source-badge" key={source}>
          {source}
        </span>
      ))}
    </div>
  );
}
