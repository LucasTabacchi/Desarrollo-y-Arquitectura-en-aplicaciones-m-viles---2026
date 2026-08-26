import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, StatusBar } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import Counter from './src/components/Counter';
import TodoList from './src/components/TodoList';

type Tab = 'Counter' | 'TodoList';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Counter');

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" />
      
      {/* Navigation Menu */}
      <View style={styles.navBar}>
        <Pressable 
          style={[styles.navButton, activeTab === 'Counter' && styles.navButtonActive]}
          onPress={() => setActiveTab('Counter')}
        >
          <Text style={[styles.navText, activeTab === 'Counter' && styles.navTextActive]}>
            01-A (Contador)
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.navButton, activeTab === 'TodoList' && styles.navButtonActive]}
          onPress={() => setActiveTab('TodoList')}
        >
          <Text style={[styles.navText, activeTab === 'TodoList' && styles.navTextActive]}>
            02-B (To-Do)
          </Text>
        </Pressable>
      </View>

      {/* Content Area */}
      <View style={styles.content}>
        {activeTab === 'Counter' ? <Counter /> : <TodoList />}
      </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  navBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    backgroundColor: '#f8f8f8',
    paddingTop: 10,
  },
  navButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
  },
  navButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: '#007AFF',
  },
  navText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  navTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
  }
});
