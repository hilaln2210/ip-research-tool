export default function FlagBadge({ label, color }) {
  return (
    <span style={{
      padding: '4px 10px',
      borderRadius: 12,
      border: `1px solid ${color}`,
      color,
      fontSize: 12,
      fontWeight: 600,
    }}>
      {label}
    </span>
  )
}
