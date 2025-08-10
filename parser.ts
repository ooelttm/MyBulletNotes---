// parser.ts
export type EntryType = 'task' | 'event' | 'note';
export type Status = 'open' | 'done' | 'migrated' | 'scheduled';

export interface ParsedEntry {
  type: EntryType;
  status?: Status;
  text: string;
  raw: string;
  lineIndex: number;
  tags: string[];
  priority: boolean;
}

const trimStartOnce = (s: string) => s.replace(/^\s+/, '');

export function parseLog(raw: string): ParsedEntry[] {
  const lines = raw.split(/\r?\n/);
  return lines.map((line, i) => {
    const l = trimStartOnce(line);
    let type: EntryType = 'note';
    let status: Status | undefined;
    let text = l;

    if (/^x\s+/.test(l)) { type = 'task'; status = 'done'; text = l.replace(/^x\s+/, ''); }
    else if (/^-\s+/.test(l)) { type = 'task'; status = 'open'; text = l.replace(/^-\s+/, ''); }
    else if (/^>\s+/.test(l)) { type = 'task'; status = 'migrated'; text = l.replace(/^>\s+/, ''); }
    else if (/^<\s+/.test(l)) { type = 'task'; status = 'scheduled'; text = l.replace(/^<\s+/, ''); }
    else if (/^o\s+/.test(l)) { type = 'event'; text = l.replace(/^o\s+/, ''); }
    else if (/^[\.\•]\s+/.test(l)) { type = 'note'; text = l.replace(/^[\.\•]\s+/, ''); }

    const priority = /^!/.test(text) || /\s!($|\s)/.test(text);
    const tags = Array.from(text.matchAll(/([#@][\p{Letter}\p{Number}_\-]+)/gu)).map(m => m[1]);

    return {
      type,
      status,
      text: text.replace(/\s!($|\s)/, ' ').replace(/^!\s*/, '').trim(),
      raw: line,
      lineIndex: i,
      tags,
      priority,
    };
  });
}

export function toggleTaskSymbol(line: string): string {
  const l = line.trimStart();
  if (/^x\s+/.test(l)) return l.replace(/^x\s+/, '- ');
  if (/^-\s+/.test(l)) return l.replace(/^-\s+/, 'x ');
  if (/^>\s+/.test(l)) return l.replace(/^>\s+/, '- ');
  if (/^<\s+/.test(l)) return l.replace(/^<\s+/, '- ');
  if (/^[\.\•o]\s+/.test(l)) return l; // 非任務不切換
  // 沒符號的當任務
  return `- ${l}`;
}

export function migrateOpenTask(line: string): string {
  const l = line.trimStart();
  if (/^-\s+/.test(l)) return l.replace(/^-\s+/, '> ');
  return l;
}
