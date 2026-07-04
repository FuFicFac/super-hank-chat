export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="empty-state">
      <div className="empty-title">
        {title}
      </div>
      <div className="empty-description">
        {description}
      </div>
    </div>
  );
}
