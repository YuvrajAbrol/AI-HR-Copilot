const PALETTE = [
  "bg-brand-100 text-brand-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function Avatar({
  initials,
  name = "",
  size = "md",
}: {
  initials: string;
  name?: string;
  size?: keyof typeof SIZES;
}) {
  const color = PALETTE[hashString(name || initials) % PALETTE.length];
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${color} ${SIZES[size]}`}
      title={name}
    >
      {initials}
    </span>
  );
}
