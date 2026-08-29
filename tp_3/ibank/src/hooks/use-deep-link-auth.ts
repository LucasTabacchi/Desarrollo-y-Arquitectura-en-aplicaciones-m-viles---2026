import { useEffect } from "react";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";

/**
 * Extracts auth tokens from a deep link URL and creates a Supabase session.
 *
 * Supabase sends emails with links like:
 *   ibanktp://confirm#access_token=...&refresh_token=...&type=signup
 *   ibanktp://reset-password#access_token=...&refresh_token=...&type=recovery
 *
 * Since `detectSessionInUrl` is false for React Native, we must handle
 * the URL manually: extract tokens and call `setSession`.
 *
 * For PKCE flow, the URL may contain a `code` query param instead.
 */
async function createSessionFromUrl(url: string) {
  // Handle PKCE flow (code in query params)
  const parsedUrl = Linking.parse(url);
  if (parsedUrl.queryParams?.code) {
    await supabase.auth.exchangeCodeForSession(
      parsedUrl.queryParams.code as string
    );
    return;
  }

  // Handle implicit flow (tokens in hash fragment)
  // In React Native, hash fragments may appear as query params
  // depending on how the linking library parses the URL.
  const hashIndex = url.indexOf("#");
  if (hashIndex === -1) return;

  const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");

  if (accessToken && refreshToken) {
    await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
  }
}

/**
 * Hook that listens for incoming deep links and processes Supabase auth tokens.
 * Should be mounted once at the root of the app (e.g., in _layout.tsx or AuthProvider).
 */
export function useDeepLinkAuth() {
  useEffect(() => {
    // Handle the URL that opened the app (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) createSessionFromUrl(url);
    });

    // Handle URLs received while the app is already open (warm start)
    const subscription = Linking.addEventListener("url", ({ url }) => {
      createSessionFromUrl(url);
    });

    return () => subscription.remove();
  }, []);
}
