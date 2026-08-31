import type { Metadata } from "next";
import { Inter_Tight, Newsreader, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/app/components/providers";
import { THEME_COOKIE_NAME } from "@/app/lib/theme";

const interTight = Inter_Tight({
    variable: "--font-inter-tight",
    subsets: ["latin"],
});

const newsreader = Newsreader({
    variable: "--font-newsreader",
    subsets: ["latin"],
    weight: ["300", "400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
    variable: "--font-plex-mono",
    subsets: ["latin"],
    weight: ["400", "500"],
});

const DESCRIPTION =
    "Legal document review, drafting, and research for regulated practice.";

export const metadata: Metadata = {
    metadataBase: new URL("https://app.accelerateai.io"),
    title: "Accelerate Legal",
    description: DESCRIPTION,
    icons: {
        icon: [
            { url: "/icon.svg", type: "image/svg+xml" },
            { url: "/favicon.ico" },
        ],
        apple: "/apple-touch-icon.png",
    },
    openGraph: {
        type: "website",
        url: "https://app.accelerateai.io",
        siteName: "Accelerate Legal",
        title: "Accelerate Legal",
        description: DESCRIPTION,
        images: [
            {
                url: "/link-image.png",
                width: 1200,
                height: 651,
                alt: "Accelerate Legal",
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Accelerate Legal",
        description: DESCRIPTION,
        images: ["/link-image.png"],
    },
};

/**
 * Dark mode is a server-persisted user-profile field, so without this the
 * theme could only be applied after the profile fetch resolved — a visible
 * light flash on every first paint. The preference is mirrored into a cookie
 * whenever it changes (see `applyDarkMode`), and this blocking script reads
 * that cookie before the first paint. Kept inline and dependency-free on
 * purpose; anything async defeats the point.
 */
const THEME_BOOTSTRAP = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=([^;]*)/);if(m&&decodeURIComponent(m[1])==="dark"){document.documentElement.classList.add("dark");document.documentElement.style.colorScheme="dark";}}catch(e){}})();`;

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
            </head>
            <body
                className={`${interTight.variable} ${newsreader.variable} ${plexMono.variable} font-sans antialiased`}
            >
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
