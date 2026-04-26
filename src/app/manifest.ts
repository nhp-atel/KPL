import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KaChuFuL Score Tracker",
    short_name: "KaChuFuL",
    description: "Points recording system for the KaChuFuL card game",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/Logo.png", sizes: "192x192", type: "image/png" },
      { src: "/Logo.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
