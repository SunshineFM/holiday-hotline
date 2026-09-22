"use client";
import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { useState } from "react";
export default function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL;
    return url && /^https?:\/\//.test(url) ? new ConvexReactClient(url) : null;
  });
  if (!client)
    return (
      <main className="desk">
        <h1>Our hotline is getting ready.</h1>
        <p>Please check back shortly.</p>
      </main>
    );
  return <ConvexAuthProvider client={client}>{children}</ConvexAuthProvider>;
}
