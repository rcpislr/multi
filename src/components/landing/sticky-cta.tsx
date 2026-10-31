"use client";
import * as React from "react";

/** Mobile bottom CTA; hidden while the order form is on screen. */
export function StickyCta({ targetId, label }: { targetId: string; label: string }) {
  const [hidden, setHidden] = React.useState(false);
  React.useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(([e]) => setHidden(!!e?.isIntersecting), { rootMargin: "0px 0px -20% 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);
  return (
    <a
      href={`#${targetId}`}
      aria-hidden={hidden}
      tabIndex={hidden ? -1 : 0}
      className={`fixed inset-x-4 bottom-4 z-40 rounded-xl bg-[var(--brand)] py-4 text-center text-lg font-extrabold text-white shadow-2xl transition sm:hidden ${hidden ? "pointer-events-none translate-y-24 opacity-0" : ""}`}
    >
      {label}
    </a>
  );
}
