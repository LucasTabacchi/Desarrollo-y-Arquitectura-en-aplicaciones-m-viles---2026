import React, { useCallback, useEffect, useRef, useState } from "react";
import { AuthButton } from "./auth-button";
import { ViewStyle } from "react-native";

interface CooldownButtonProps {
  title: string;
  cooldownTitle?: string;
  onPress: () => void | Promise<void>;
  cooldownSeconds?: number;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "link";
  style?: ViewStyle;
}

/**
 * A button that enforces a visual cooldown after being pressed.
 * Used for rate-limited actions like resend email and forgot password.
 */
export function CooldownButton({
  title,
  cooldownTitle,
  onPress,
  cooldownSeconds = 60,
  disabled = false,
  variant = "secondary",
  style,
}: CooldownButtonProps) {
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearTimer;
  }, [clearTimer]);

  const handlePress = async () => {
    setLoading(true);
    try {
      await onPress();
    } finally {
      setLoading(false);
    }

    setRemaining(cooldownSeconds);
    clearTimer();
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const isCooling = remaining > 0;
  const displayTitle = isCooling
    ? `${cooldownTitle ?? title} (${remaining}s)`
    : title;

  return (
    <AuthButton
      title={displayTitle}
      onPress={handlePress}
      loading={loading}
      disabled={disabled || isCooling}
      variant={variant}
      style={style}
    />
  );
}
