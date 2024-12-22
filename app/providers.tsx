"use client";

import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";

if (typeof window !== "undefined") {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key)
    throw new Error("Missing NEXT_PUBLIC_POSTHOG_KEY environment variable");

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: "always",
  });
}
export function CSPostHogProvider({ children }: { children: React.ReactNode }) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
