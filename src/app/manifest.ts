import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Builder Buddy",
    short_name: "Buddy",
    description: "Job diary for tradespeople",
    start_url: "/",
    display: "standalone",
    background_color: "#f3efe4",
    theme_color: "#f0b429",
  };
}
