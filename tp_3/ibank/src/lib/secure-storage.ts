import * as SecureStore from 'expo-secure-store';

const CREDENTIALS_KEY = 'ibank_user_credentials';

export interface SavedCredentials {
  email?: string;
  password?: string;
}

export async function saveCredentials(credentials: SavedCredentials): Promise<void> {
  try {
    const jsonValue = JSON.stringify(credentials);
    await SecureStore.setItemAsync(CREDENTIALS_KEY, jsonValue);
  } catch (error) {
    console.error('Error saving credentials to secure store:', error);
  }
}

export async function getCredentials(): Promise<SavedCredentials | null> {
  try {
    const jsonValue = await SecureStore.getItemAsync(CREDENTIALS_KEY);
    return jsonValue != null ? JSON.parse(jsonValue) : null;
  } catch (error) {
    console.error('Error reading credentials from secure store:', error);
    return null;
  }
}

export async function clearCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
  } catch (error) {
    console.error('Error clearing credentials from secure store:', error);
  }
}
