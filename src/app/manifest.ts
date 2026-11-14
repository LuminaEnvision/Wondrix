import type { MetadataRoute } from "next";

/** Installable on phones ("Add to Home Screen"): the owl icon, full screen, no browser bar. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wondrix",
    short_name: "Wondrix",
    description: "Your friend on the learning path: school practice and curious questions.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#fbf7f0",
    theme_color: "#1f6f68",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
