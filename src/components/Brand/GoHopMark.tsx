type GoHopMarkProps = {
  className?: string;
  /** Hide from screen readers when the name "goHop" is already next to it. */
  decorative?: boolean;
};

export function GoHopMark({ className, decorative = false }: GoHopMarkProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      {...(decorative
        ? { "aria-hidden": true }
        : { role: "img", "aria-label": "goHop" })}
    >
      <rect width="64" height="64" rx="14" fill="#0F1210" />
      <path
        d="M16 38C20 16 42 16 46 38"
        fill="none"
        stroke="#C6F432"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="16" cy="38" r="3.5" fill="#C6F432" />
      <circle cx="46" cy="38" r="6" fill="#C6F432" />
    </svg>
  );
}
