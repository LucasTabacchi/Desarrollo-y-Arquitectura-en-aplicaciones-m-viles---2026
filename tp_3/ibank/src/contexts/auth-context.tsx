import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Linking from "expo-linking";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useDeepLinkAuth } from "@/hooks/use-deep-link-auth";

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  isPasswordRecovery: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  isPasswordRecovery: false,
});

export function useSession() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const appState = useRef(AppState.currentState);

  // Process incoming deep links (confirm email, reset password)
  useDeepLinkAuth();

  useEffect(() => {
    // 1. Check for Cold Start and handle initial session
    const handleColdStart = async () => {
      const initialUrl = await Linking.getInitialURL();
      
      // If it's a cold start without a deep link, force sign out for banking app security
      if (!initialUrl) {
        await supabase.auth.signOut();
      }

      // Get initial session after potential signout
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsLoading(false);
    };

    handleColdStart();

    // 2. Listen for background/foreground transitions
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App has come to the foreground
        const lastActiveStr = await AsyncStorage.getItem("lastActiveTime");
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          const timeElapsed = Date.now() - lastActive;
          
          // If in background for more than 20 seconds (20000ms), lock the app
          if (timeElapsed > 20000) {
            await supabase.auth.signOut();
          }
        }
      } else if (nextAppState.match(/inactive|background/)) {
        // App has gone to the background
        await AsyncStorage.setItem("lastActiveTime", Date.now().toString());
      }
      appState.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener("change", handleAppStateChange);

    // 3. Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === "PASSWORD_RECOVERY") {
        setIsPasswordRecovery(true);
      }

      if (event === "SIGNED_IN") {
        setIsPasswordRecovery(false);
      }

      if (event === "SIGNED_OUT") {
        setIsPasswordRecovery(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      appStateSubscription.remove();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, isLoading, isPasswordRecovery }}>
      {children}
    </AuthContext.Provider>
  );
}
