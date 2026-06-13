import { initials, avatarColor } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  src?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
  xl: "h-24 w-24 text-2xl",
};

export function Avatar({ name, src, size = "md", className }: Props) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn("rounded-full object-cover border border-border", sizes[size], className)}
        onError={(e) => {
          // On image load failure fall back to initials div
          e.currentTarget.style.display = "none";
          const parent = e.currentTarget.parentElement;
          if (parent) parent.setAttribute("data-fallback", "true");
        }}
      />
    );
  }
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border border-border font-medium text-foreground select-none",
        sizes[size],
        className,
      )}
      style={{ backgroundColor: avatarColor(name) }}
    >
      {initials(name)}
    </div>
  );
}