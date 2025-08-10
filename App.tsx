// App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet } from 'react-native';
import { parseLog, toggleTaskSymbol, migrateOpenTask, ParsedEntry } from './parser';
import { getLog, setLog, nextDate } from './storage';

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [date, setDate] = useState(todayISO());
  const [raw, setRaw] = useState('');
  const parsed = useMemo(() => parseLog(raw), [raw]);

  useEffect(() => {
    getLog(date).then(setRaw);
  }, [date]);

  useEffect(() => {
    const id = setTimeout(() => setLog(date, raw), 300);
    return () => clearTimeout(id);
  }, [date, raw]);

  const updateLine = (idx: number, updater: (line: string) => string) => {
    const lines = raw.split(/\r?\n/);
    lines[idx] = updater(lines[idx] ?? '');
    setRaw(lines.join('\n'));
  };

  const migrateAllOpenToTomorrow = async () => {
    const lines = raw.split(/\r?\n/);
    const tomorrow = nextDate(date);
    const openTasks: string[] = [];
    const updated = lines.map((line, i) => {
      const p = parsed[i];
      if (p?.type === 'task' && p?.status === 'open') {
        openTasks.push(line.trimStart());
        return migrateOpenTask(line);
      }
      return line;
    });
    // 追加到明天
    const tomorrowRaw = await getLog(tomorrow);
    const appended = (tomorrowRaw ? tomorrowRaw + '\n' : '') + openTasks.map(t => `- ${t.replace(/^-\s+/, '').trim()}`).join('\n');
    await setLog(tomorrow, appended);
    setRaw(updated.join('\n'));
    setDate(tomorrow);
  };

  const changeDateBy = (days: number) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  const renderItem = ({ item }: { item: ParsedEntry }) => (
    <View style={styles.row}>
      <TouchableOpacity
        disabled={item.type !== 'task'}
        onPress={() => updateLine(item.lineIndex, toggleTaskSymbol)}
        style={[styles.checkbox, item.status === 'done' && styles.checkboxDone]}
      />
      <Text style={[styles.text, item.priority && styles.priority]}>
        {item.text} {(item.tags || []).join(' ')}
      </Text>
      {item.type === 'task' && item.status === 'open' && (
        <TouchableOpacity onPress={() => updateLine(item.lineIndex, migrateOpenTask)}>
          <Text style={styles.action}>遷移</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => changeDateBy(-1)}><Text style={styles.nav}>{'‹'}</Text></TouchableOpacity>
        <Text style={styles.title}>{date} 日誌</Text>
        <TouchableOpacity onPress={() => changeDateBy(1)}><Text style={styles.nav}>{'›'}</Text></TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        multiline
        placeholder="- 任務, o 事件, . 筆記, x 完成, > 遷移, < 排程, ! 優先"
        value={raw}
        onChangeText={setRaw}
      />

      <View style={styles.listHeader}>
        <Text style={styles.subtitle}>解析條目</Text>
        <TouchableOpacity onPress={migrateAllOpenToTomorrow}>
          <Text style={styles.action}>一鍵遷移到明天</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={parsed}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1115' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  nav: { color: '#9aa4b2', fontSize: 22, padding: 8 },
  title: { color: '#e6eaf2', fontSize: 18, fontWeight: '600' },
  input: { minHeight: 140, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#1f2430', padding: 12, color: '#e6eaf2' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  subtitle: { color: '#9aa4b2', fontSize: 14 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#171b24' },
  checkbox: { width: 18, height: 18, borderRadius: 4, borderWidth: 2, borderColor: '#3b82f6', marginRight: 12 },
  checkboxDone: { backgroundColor: '#3b82f6' },
  text: { color: '#e6eaf2', flex: 1 },
  priority: { color: '#f59e0b', fontWeight: '700' },
  action: { color: '#60a5fa', marginLeft: 12 },
});
