import { initialsColor } from "@/lib/format";

const SIZES = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

export function Avatar({
  initials,
  seed = "",
  name,
  size = "sm",
}: {
  initials: string;
  seed?: string;
  /** Full name shown as a native tooltip on hover. Falls back to seed. */
  name?: string;
  size?: keyof typeof SIZES;
}) {
  return (
    <span
      title={name ?? (seed || undefined)}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${initialsColor(
        seed || initials
      )} ${SIZES[size]}`}
    >
      {initials}
    </span>
  );
}
