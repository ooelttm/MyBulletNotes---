// storage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const keyForDate = (date: string) => `log:${date}`;

export async function getLog(date: string): Promise<string> {
  return (await AsyncStorage.getItem(keyForDate(date))) ?? '';
}

export async function setLog(date: string, raw: string): Promise<void> {
  await AsyncStorage.setItem(keyForDate(date), raw);
}

export function nextDate(date: string): string {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}
