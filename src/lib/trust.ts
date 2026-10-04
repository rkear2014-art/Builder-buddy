import { websiteHref } from "./branding";

export type TrustDetails = {
  insurer: string;
  coverAmount: string;
  guarantee: string;
  accreditations: string;
  reviewUrl: string;
};

export function trustBadges(details: TrustDetails): string[] {
  const badges: string[] = [];
  const insurer = details.insurer.trim();
  const cover = details.coverAmount.trim();
  if (insurer || cover) {
    const insurance = [insurer ? `Public liability: ${insurer}` : "Public liability", cover].filter(Boolean).join(" · ");
    badges.push(insurance);
  }
  const guarantee = details.guarantee.trim();
  if (guarantee) {
    badges.push(/guarantee/i.test(guarantee) ? guarantee : `${guarantee} workmanship guarantee`);
  }
  for (const line of details.accreditations.split(/\n+/)) {
    const badge = line.replace(/\s+/g, " ").trim();
    if (!badge || badge.length > 60) continue;
    badges.push(badge);
    if (badges.length >= 8) break;
  }
  return badges.slice(0, 8);
}

export function reviewHref(value: string): string | null {
  return websiteHref(value);
}
