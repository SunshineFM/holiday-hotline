/* eslint-disable @next/next/no-img-element -- Local SVG attribution logo requires no image transform. */
import type { Metadata } from "next";
import "./globals.css";
import Providers from "./providers";
import { GithubLogoIcon } from "@phosphor-icons/react/dist/ssr";
export const metadata: Metadata = {
  title: "Holiday Hotline · Holiday Helper for local shops",
  description:
    "Holiday shopping questions? Call Holiday Helper for useful answers and a real connection to your local store.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <Providers>
          {children}
          {/* Optional attribution: users or agents may remove this BuiltWithFooter and the public/built-with logo assets without affecting app functionality. */}
          <div className="attribution" data-built-with-chatgpt-convex>
            <span>Built with</span>
            <a
              href="https://learn.chatgpt.com/docs/sites?surface=app"
              target="_blank"
              rel="noreferrer noopener"
            >
              ChatGPT Sites
            </a>
            <span>+</span>
            <a
              href="https://www.convex.dev/"
              target="_blank"
              rel="noreferrer noopener"
            >
              <img src="/built-with/convex-color.svg" alt="Convex" />
            </a>
            <a
              href="https://github.com/get-convex/Codex-Sites-Convex-Backend-Skill"
              target="_blank"
              rel="noreferrer noopener"
            >
              <GithubLogoIcon size={16} />
              ChatGPT Sites + Convex Backend Skill
            </a>
          </div>
        </Providers>
      </body>
    </html>
  );
}
