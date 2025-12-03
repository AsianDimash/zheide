import React, { useState } from 'react';
import { assessSiteRisks, AttackDescriptor } from '../services/securityService';

const prettyPercent = (v: number) => `${Math.round(v * 100)}%`;

const SecurityPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [usesExternalScripts, setUsesExternalScripts] = useState(true);
  const [publicAnonKeyExposed, setPublicAnonKeyExposed] = useState(false);
  const [corsAllowAll, setCorsAllowAll] = useState(false);
  const [rateLimitingEnabled, setRateLimitingEnabled] = useState(false);
  const [authEnabled, setAuthEnabled] = useState(true);
  const [results, setResults] = useState<AttackDescriptor[] | null>(null);

  const runAssessment = () => {
    const r = assessSiteRisks({
      usesExternalScripts,
      publicAnonKeyExposed,
      corsAllowAll,
      rateLimitingEnabled,
      authEnabled
    });
    setResults(r);
  };

  const simpleIfElse = (r: AttackDescriptor[] | null) => {
    if (!r) return 'Қарапайым бағалау әлі жүргізілмеді.';
    // Simple toy logic: if phishing or sensitive_data_exposure likelihood > 50% => high risk
    const phishing = r.find(x => x.id === 'phishing');
    const sde = r.find(x => x.id === 'sensitive_data_exposure');
    if ((phishing && phishing.likelihood > 0.5) || (sde && sde.likelihood > 0.6)) {
      return 'Ескерту: Фишинг пен құпия деректердің көрсеткіші жоғары — пайдаланушы инфобезін күшейтіңіз және кілттерді қайта жасаңыз.';
    }
    if (r.some(x => x.id === 'xss' && x.likelihood > 0.4)) {
      return 'XSS тәуекелі орташа/жоғары — DOM-ға енгізілетін барлық деректерді тазалаңыз.';
    }
    return 'Бағалау нәтижесі: айтарлықтай жоғары қауіп-қатер анықталған жоқ. Қарап шығыңыз.';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-[720px] max-w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold">Қауіпсіздік бағалаушы (ойыншық)</h3>
          <div className="flex gap-2">
            <button className="px-3 py-1 text-sm border rounded" onClick={() => { setResults(null); }}>Тазалау</button>
            <button className="px-3 py-1 text-sm bg-gray-100 rounded" onClick={onClose}>Жабу</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <label className="flex items-center gap-2"><input type="checkbox" checked={usesExternalScripts} onChange={(e)=>setUsesExternalScripts(e.target.checked)} /> сыртқы скрипттер қолданады</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={publicAnonKeyExposed} onChange={(e)=>setPublicAnonKeyExposed(e.target.checked)} /> клиентте Ani key ашық</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={corsAllowAll} onChange={(e)=>setCorsAllowAll(e.target.checked)} /> CORS: * (барлығын рұқсат етеді)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={rateLimitingEnabled} onChange={(e)=>setRateLimitingEnabled(e.target.checked)} /> rate limiting қосылған</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={authEnabled} onChange={(e)=>setAuthEnabled(e.target.checked)} /> аутентификация қосылған</label>
        </div>

        <div className="flex gap-3 mb-4">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={runAssessment}>Бағалау</button>
          <button className="px-4 py-2 border rounded" onClick={() => setResults(assessSiteRisks({ usesExternalScripts, publicAnonKeyExposed, corsAllowAll, rateLimitingEnabled, authEnabled }))}>Жылдам</button>
        </div>

        <div className="mb-4">
          <div className="italic text-sm mb-2">If/else ойыншық нәтижесі:</div>
          <div className="p-3 bg-gray-50 rounded">{simpleIfElse(results)}</div>
        </div>

        <div>
          <h4 className="font-semibold mb-2">Шабуылдар және ықтималдықтар</h4>
          <div className="space-y-2 max-h-64 overflow-auto">
            {results ? results.map(r => (
              <div key={r.id} className="flex justify-between items-center p-2 border rounded">
                <div>
                  <div className="font-medium">{r.name}</div>
                  <div className="text-xs text-gray-500">{r.description}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{prettyPercent(r.likelihood)}</div>
                  <div className="text-xs text-gray-400">confidence {prettyPercent(r.confidence)}</div>
                </div>
              </div>
            )) : (
              <div className="text-sm text-gray-500">Бағалау әлі жүргізілмеді. „Бағалау“ түймесін басыңыз.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPanel;
