const paths = {
  jobs: "M8 3h8l2 2v16H6V5l2-2zM9 3v3h6V3M9 12h6M9 16h4",
  diary: "M7 3v3M17 3v3M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z",
  quotes: "M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M8 13h8M8 17h5",
  invoices: "M6 3h12v18l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4L6 21V3zM9 8h6M9 12h6",
  business: "M4 20V9l8-5 8 5v11M10 20v-5h4v5M9 11h.01M15 11h.01M9 15h.01M15 15h.01",
  library: "M5 4h4v16H5zM10 6h5v14h-5M16 8h3v12h-3",
  chase: "M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z",
} as const;

export type NavIconName = keyof typeof paths;

export function NavIcon({ name }: { name: NavIconName }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d={paths[name]} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
