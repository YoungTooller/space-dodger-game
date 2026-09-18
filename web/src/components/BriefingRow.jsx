export default function BriefingRow({ icon, title, children }) {
  return (
    <article className="briefing-row">
      {icon}
      <div className="row-text">
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  );
}
