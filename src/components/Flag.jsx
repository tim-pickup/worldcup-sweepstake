/**
 * Renders a team flag from the "Flag Emoji" column.
 * The value is either a URL (rendered as <img>) or a short string / emoji
 * (rendered as inline text).
 */
export default function Flag({ value, className = 'team-flag', style }) {
  if (!value) return null;
  if (typeof value === 'string' && value.startsWith('http')) {
    return <img src={value} alt="" className={className} style={style} />;
  }
  return (
    <span style={{ marginRight: '0.4em', verticalAlign: 'middle', ...style }}>
      {value}
    </span>
  );
}
