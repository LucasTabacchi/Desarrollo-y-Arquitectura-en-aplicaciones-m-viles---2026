import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  FlatList, 
  StyleSheet, 
  Pressable, 
  Alert, 
  LayoutAnimation,
  Platform,
  UIManager
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const STORAGE_KEY = '@todos_tp1';

interface Todo {
  id: string;
  text: string;
  completed: boolean;
}

type FilterType = 'All' | 'Active' | 'Completed';

// Componente para un item individual, extraído para optimizar renderizado y manejar estados locales de edición
const TodoItem = ({ 
  item, 
  onToggle, 
  onDelete, 
  onEdit 
}: { 
  item: Todo; 
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, newText: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.text);
  
  // Ref to hold the timeout for single/double tap detection
  const tapTimer = useRef<NodeJS.Timeout | null>(null);

  const handlePress = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
      // Double tap -> Edit
      setIsEditing(true);
    } else {
      tapTimer.current = setTimeout(() => {
        tapTimer.current = null;
        // Single tap -> Toggle
        onToggle(item.id);
      }, 250); // 250ms delay for double tap detection
    }
  };

  const handleLongPress = () => {
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
    Alert.alert(
      "Eliminar tarea",
      `¿Estás seguro que deseas eliminar "${item.text}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Eliminar", style: "destructive", onPress: () => onDelete(item.id) }
      ]
    );
  };

  const submitEdit = () => {
    const trimmed = editValue.trim();
    if (trimmed.length > 0) {
      onEdit(item.id, trimmed);
    } else {
      setEditValue(item.text); // revert if empty
    }
    setIsEditing(false);
  };

  return (
    <Pressable 
      onPress={handlePress}
      onLongPress={handleLongPress}
      style={({ pressed }) => [
        styles.todoItem, 
        item.completed && styles.todoItemCompleted,
        pressed && !isEditing && { opacity: 0.7 }
      ]}
    >
      <View style={styles.checkboxContainer}>
        <View style={[styles.checkbox, item.completed && styles.checkboxChecked]} />
      </View>
      
      {isEditing ? (
        <TextInput
          style={styles.editInput}
          value={editValue}
          onChangeText={setEditValue}
          onBlur={submitEdit}
          onSubmitEditing={submitEdit}
          autoFocus
        />
      ) : (
        <Text style={[styles.todoText, item.completed && styles.todoTextCompleted]}>
          {item.text}
        </Text>
      )}
    </Pressable>
  );
};

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [filter, setFilter] = useState<FilterType>('All');
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from AsyncStorage
  useEffect(() => {
    const loadTodos = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          setTodos(JSON.parse(stored));
        }
      } catch (e) {
        console.error("Error loading todos:", e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadTodos();
  }, []);

  // Save to AsyncStorage whenever todos change
  useEffect(() => {
    if (isLoaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos)).catch(e => {
        console.error("Error saving todos:", e);
      });
    }
  }, [todos, isLoaded]);

  const animateLayout = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  };

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (trimmed.length === 0) return;
    
    animateLayout();
    setTodos(prev => [
      { id: Date.now().toString(), text: trimmed, completed: false },
      ...prev
    ]);
    setInputValue('');
  };

  const handleToggle = (id: string) => {
    animateLayout();
    setTodos(prev => prev.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const handleDelete = (id: string) => {
    animateLayout();
    setTodos(prev => prev.filter(todo => todo.id !== id));
  };

  const handleEdit = (id: string, newText: string) => {
    setTodos(prev => prev.map(todo => 
      todo.id === id ? { ...todo, text: newText } : todo
    ));
  };

  // Derived state for filtering and counts
  const filteredTodos = todos.filter(todo => {
    if (filter === 'Active') return !todo.completed;
    if (filter === 'Completed') return todo.completed;
    return true; // 'All'
  });

  const totalCount = todos.length;
  const completedCount = todos.filter(t => t.completed).length;

  if (!isLoaded) return null; // or a loader

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Mis Tareas</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Agregar nueva tarea..."
          value={inputValue}
          onChangeText={setInputValue}
          onSubmitEditing={handleAdd}
          returnKeyType="done"
        />
        <Pressable 
          onPress={handleAdd} 
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>Totales: {totalCount}</Text>
        <Text style={styles.statsText}>Completadas: {completedCount}</Text>
      </View>

      <View style={styles.filtersContainer}>
        {(['All', 'Active', 'Completed'] as FilterType[]).map(f => (
          <Pressable 
            key={f}
            onPress={() => { animateLayout(); setFilter(f); }}
            style={[styles.filterButton, filter === f && styles.filterButtonActive]}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'All' ? 'Todas' : f === 'Active' ? 'Activas' : 'Completadas'}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={filteredTodos}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TodoItem 
            item={item} 
            onToggle={handleToggle} 
            onDelete={handleDelete}
            onEdit={handleEdit}
          />
        )}
        style={styles.list}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay tareas para mostrar.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingTop: 50,
    paddingHorizontal: 20,
    width: '100%',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  statsText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filtersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
    backgroundColor: '#EEE',
    borderRadius: 8,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  filterButtonActive: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  todoItemCompleted: {
    opacity: 0.6,
  },
  checkboxContainer: {
    marginRight: 15,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
  },
  todoText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#007AFF',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
    fontSize: 16,
  }
});
