import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';

// Tipo para el tema
type Theme = 'light' | 'dark';

// Custom hook extraído con tipado TS
const useThemeStyles = (theme: Theme) => {
  const isDark = theme === 'dark';
  
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? '#121212' : '#F5F5F5',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
    },
    card: {
      backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
      padding: 30,
      borderRadius: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 8,
      elevation: 5,
      width: '80%',
      maxWidth: 400,
    },
    countText: {
      fontSize: 80,
      fontWeight: 'bold',
      color: isDark ? '#FFFFFF' : '#333333',
      marginVertical: 20,
    },
    titleText: {
      fontSize: 20,
      color: isDark ? '#AAAAAA' : '#666666',
      marginBottom: 10,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 20,
    },
    button: {
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonPrimary: {
      backgroundColor: '#007AFF',
    },
    buttonSecondary: {
      backgroundColor: isDark ? '#444444' : '#E5E5EA',
    },
    buttonDisabled: {
      backgroundColor: isDark ? '#333333' : '#CCCCCC',
      opacity: 0.6,
    },
    buttonTextPrimary: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    buttonTextSecondary: {
      color: isDark ? '#FFFFFF' : '#333333',
      fontSize: 16,
      fontWeight: '600',
    },
    toggleButton: {
      marginTop: 10,
      padding: 12,
      borderWidth: 1,
      borderColor: isDark ? '#555555' : '#DDDDDD',
      borderRadius: 8,
      width: '100%',
      alignItems: 'center',
    }
  });
};

export default function Counter() {
  const [count, setCount] = useState<number>(0);
  const [theme, setTheme] = useState<Theme>('light');
  
  const styles = useThemeStyles(theme);

  const handleIncrement = () => {
    if (count >= 10) {
      Alert.alert('Límite alcanzado', 'El contador no puede superar el valor de 10.');
      return;
    }
    setCount(prev => prev + 1);
  };

  const handleReset = () => {
    setCount(0);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.titleText}>Contador</Text>
        <Text style={styles.countText}>{count}</Text>
        
        <View style={styles.buttonContainer}>
          <Pressable 
            onPress={handleReset} 
            style={({ pressed }) => [
              styles.button, 
              styles.buttonSecondary,
              pressed && { opacity: 0.7 }
            ]}
          >
            <Text style={styles.buttonTextSecondary}>Reset</Text>
          </Pressable>
          
          <Pressable 
            onPress={handleIncrement} 
            disabled={count >= 10}
            style={({ pressed }) => [
              styles.button, 
              count >= 10 ? styles.buttonDisabled : styles.buttonPrimary,
              pressed && { opacity: 0.7 }
            ]}
          >
            <Text style={styles.buttonTextPrimary}>+1</Text>
          </Pressable>
        </View>

        <Pressable 
          onPress={toggleTheme} 
          style={({ pressed }) => [
            styles.toggleButton,
            pressed && { backgroundColor: theme === 'dark' ? '#333333' : '#EEEEEE' }
          ]}
        >
          <Text style={styles.buttonTextSecondary}>
            Tema: {theme === 'light' ? 'Claro' : 'Oscuro'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
