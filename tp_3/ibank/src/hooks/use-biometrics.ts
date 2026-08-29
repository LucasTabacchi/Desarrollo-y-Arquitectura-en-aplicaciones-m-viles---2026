import { useState, useEffect } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';

export function useBiometrics() {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [hasBiometricRecords, setHasBiometricRecords] = useState(false);

  useEffect(() => {
    (async () => {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsBiometricSupported(compatible);
      
      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setHasBiometricRecords(enrolled);
      }
    })();
  }, []);

  const authenticate = async (): Promise<boolean> => {
    if (!isBiometricSupported || !hasBiometricRecords) {
      return false;
    }

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Autenticación requerida para iBank',
        fallbackLabel: 'Usar contraseña',
        disableDeviceFallback: false,
      });

      return result.success;
    } catch (error) {
      console.error('Biometric authentication error:', error);
      return false;
    }
  };

  return {
    isBiometricSupported,
    hasBiometricRecords,
    authenticate,
  };
}
