import type { MetadataRoute } from "next";

/** Lets MedHome be added to a phone home screen and open without browser chrome. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MedHome — Home Medicine Tracker",
    short_name: "MedHome",
    description: "Private inventory of the medicines you keep at home.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f8",
    theme_color: "#059669",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
