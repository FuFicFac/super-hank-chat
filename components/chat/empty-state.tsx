export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 12,
      padding: "40px 24px",
      textAlign: "center",
    }}>
      <div style={{
        fontFamily: "var(--font-serif, Newsreader, Georgia, serif)",
        fontSize: 20,
        fontWeight: 500,
        color: "var(--d-ink2)",
        letterSpacing: -0.3,
      }}>
        {title}
      </div>
      <div style={{
        fontSize: 12,
        color: "var(--d-mute)",
        maxWidth: 360,
        lineHeight: 1.6,
        letterSpacing: 0.5,
      }}>
        {description}
      </div>
    </div>
  );
}
