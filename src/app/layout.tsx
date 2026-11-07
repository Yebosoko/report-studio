import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";
import "@/styles/editor.css";

export const metadata: Metadata = {
  title: { default: "Report Studio", template: "%s · Report Studio" },
  description: "Turn draft safeguards reports into designed, editable Word documents in the style of World Bank and UN publications."
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

const FONTS =
  "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400" +
  "&family=Gelasio:ital,wght@0,400;0,600;0,700;1,400&family=Carlito:ital,wght@0,400;0,700;1,400&family=Arimo:ital,wght@0,400;0,700;1,400" +
  "&family=Questrial&family=EB+Garamond:ital,wght@0,400;0,500;0,700;1,400&display=swap";
const ICONS = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0..1,0&display=block";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
        <link rel="stylesheet" href={ICONS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
