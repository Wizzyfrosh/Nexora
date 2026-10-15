import Link from "next/link";
export function Brand() {
  return (
    <Link href="/" className="nexora-brand" aria-label="Nexora home">
      <span className="nexora-mark" aria-hidden="true">
        n<span>•</span>
      </span>
      <span>
        nexora<span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
