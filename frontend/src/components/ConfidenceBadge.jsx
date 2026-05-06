const CONFIG = {
  high: {
    label: 'High confidence',
    color: '#15803d',
    background: '#dcfce7',
    border: '#86efac',
  },
  medium: {
    label: 'Medium confidence',
    color: '#a16207',
    background: '#fef9c3',
    border: '#fde047',
  },
  low: {
    label: 'Low confidence — verify before acting',
    color: '#c2410c',
    background: '#ffedd5',
    border: '#fdba74',
  },
}

export default function ConfidenceBadge({ confidence }) {
  const cfg = CONFIG[confidence]
  if (!cfg) return null   // 'none' or unknown → render nothing

  return (
    <span
      title="Based on similarity of retrieved sources"
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: 12,
        border: `1px solid ${cfg.border}`,
        background: cfg.background,
        color: cfg.color,
        fontSize: 12,
        fontWeight: 600,
        cursor: 'default',
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  )
}
