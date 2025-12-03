import React, { useEffect, useState } from 'react';

type FakeEvent = {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
  timestamp: string;
};

const DEFAULT_TYPES = [
  'phishing',
  'xss',
  'csrf',
  'sensitive_data_exposure',
  'dos',
  'oauth_abuse',
  'sql_injection'
];

const storageKey = 'fake_attack_logger_events_v1';

const FakeAttackLogger: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [events, setEvents] = useState<FakeEvent[]>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [type, setType] = useState<string>(DEFAULT_TYPES[0]);
  const [severity, setSeverity] = useState<FakeEvent['severity']>('medium');
  const [details, setDetails] = useState('');

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(events)); } catch {}
  }, [events]);

  const addEvent = () => {
    const ev: FakeEvent = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2,8),
      type,
      severity,
      details: details || undefined,
      timestamp: new Date().toISOString()
    };
    setEvents(prev => [ev, ...prev]);
    setDetails('');
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(events, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fake-attacks-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[720px] max-w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Өтірік шабуыл тіркеуші</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm border rounded" onClick={clearEvents}>Тазалау</button>
            <button className="px-3 py-1 text-sm border rounded" onClick={exportJson}>Экспорт</button>
            <button className="px-3 py-1 text-sm bg-gray-100 rounded" onClick={onClose}>Жабу</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <select value={type} onChange={e => setType(e.target.value)} className="p-2 border rounded">
            {DEFAULT_TYPES.map(t => <option value={t} key={t}>{t}</option>)}
          </select>

          <select value={severity} onChange={e => setSeverity(e.target.value as any)} className="p-2 border rounded">
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
            <option value="critical">critical</option>
          </select>

          <div className="flex">
            <button onClick={addEvent} className="px-4 py-2 bg-blue-600 text-white rounded w-full">Тіркеу</button>
          </div>
        </div>

        <textarea placeholder="Толығырақ (міндетті емес)" value={details} onChange={e=>setDetails(e.target.value)} className="w-full p-2 border rounded mb-4" />

        <div className="max-h-64 overflow-auto border rounded p-2">
          {events.length === 0 ? (
            <div className="text-sm text-gray-500">Ешқандай оқиға жоқ.</div>
          ) : (
            <ul className="space-y-2">
              {events.map(ev => (
                <li key={ev.id} className="p-2 border rounded bg-gray-50 flex justify-between items-start">
                  <div>
                    <div className="font-medium">{ev.type} <span className="text-xs text-gray-400">({ev.severity})</span></div>
                    <div className="text-xs text-gray-500">{ev.details || '—'}</div>
                  </div>
                  <div className="text-xs text-gray-400">{new Date(ev.timestamp).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default FakeAttackLogger;
