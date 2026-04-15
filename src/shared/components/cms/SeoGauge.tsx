export const SeoGauge = ({ score }: { score: number }) => {
  const radius = 30;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  let color = 'text-red-500';
  let icon = 'fa-frown';
  let label = 'Ruim';

  if (score >= 50 && score < 80) {
    color = 'text-orange-400';
    icon = 'fa-meh';
    label = 'Regular';
  } else if (score >= 80) {
    color = 'text-green-500';
    icon = 'fa-smile';
    label = 'Excelente';
  }

  return (
    <div className="flex items-center gap-4 bg-surface-elevated p-4 rounded-xl border border-divider">
      <div className="relative w-16 h-16 flex items-center justify-center">
        <svg height={radius * 2} width={radius * 2} className="rotate-[-90deg]">
          <circle stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
          <circle stroke="currentColor" className={`${color} transition-all duration-1000 ease-out`} strokeWidth={stroke} strokeDasharray={circumference + ' ' + circumference} style={{ strokeDashoffset }} strokeLinecap="round" fill="transparent" r={normalizedRadius} cx={radius} cy={radius} />
        </svg>
        <div className={`absolute text-xl ${color}`}><i className={`fa-solid ${icon}`}></i></div>
      </div>
      <div>
        <div className="text-[10px] uppercase font-bold text-text-muted opacity-80 mb-0.5">SEO Score</div>
        <div className={`text-2xl font-black ${color}`}>{score}/100</div>
        <div className="text-sm font-medium text-text-primary opacity-80">{label}</div>
      </div>
    </div>
  );
};
