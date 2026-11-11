import { useId } from "react";
import clsx from "clsx";

// Query Master logo: a "Q" whose ring holds a ">" query prompt.
// Below 24px the prompt is dropped (it turns to mud) and the Q gets heavier strokes.
//
// Gradient ids are unique per instance on purpose: the Login page renders two logos and one of
// them is always inside a display:none block, and a gradient defined inside a hidden SVG does
// not paint for another SVG that references it.
export function LogoMark({ size = 32, className, decorative = false }) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const bg = `qm-bg-${uid}`;
  const gloss = `qm-gloss-${uid}`;
  const detailed = size >= 24;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      className={clsx("shrink-0", className)}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : "Query Master"}
      aria-hidden={decorative ? "true" : undefined}
    >
      <defs>
        <linearGradient id={bg} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6EE7B7" />
          <stop offset=".55" stopColor="#10B981" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".26" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx={detailed ? 116 : 112} fill={`url(#${bg})`} />
      <rect width="512" height="512" rx={detailed ? 116 : 112} fill={`url(#${gloss})`} />
      <g fill="none" stroke="#062A20" strokeLinecap="round" strokeLinejoin="round" transform="translate(-6 4)">
        {detailed ? (
          <>
            <circle cx="256" cy="246" r="122" strokeWidth="50" />
            <path d="M310 300L384 374" strokeWidth="50" />
            <path d="M218 206L258 244L218 282" strokeWidth="30" />
          </>
        ) : (
          <>
            <circle cx="254" cy="244" r="112" strokeWidth="62" />
            <path d="M296 286L384 374" strokeWidth="62" />
          </>
        )}
      </g>
    </svg>
  );
}

// Mark + "Query Master" wordmark. Pass the text colour/size via textClassName.
export default function Logo({ size = 32, showText = true, className, textClassName }) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoMark size={size} decorative={showText} />
      {showText && (
        <span className={clsx("font-semibold tracking-tight", textClassName)}>
          Query <span className="text-gradient">Master</span>
        </span>
      )}
    </span>
  );
}
