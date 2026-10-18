import React, { useState, useEffect } from 'react';
import { ApiClient } from './services/api/apiClient';

export default function App() {
  const [backendStatus, setBackendStatus] = useState<'verificando' | 'online' | 'offline'>('verificando');
  const [timestamp, setTimestamp] = useState<string>('');

  useEffect(() => {
    async function checkHealth() {
      const res = await ApiClient.get('/health');
      if (res.success || (res as any).status === 'UP') {
        setBackendStatus('online');
        setTimestamp(new Date().toLocaleTimeString());
      } else {
        setBackendStatus('offline');
      }
    }
    checkHealth();
  }, []);

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <header style={{ borderBottom: '2px solid #e2e8f0', paddingBottom: '1rem', marginBottom: '2rem' }}>
        <h1 style={{ color: '#0f172a', margin: '0 0 0.5rem 0' }}>🏢 SSA Distribuidora</h1>
        <p style={{ color: '#64748b', margin: 0 }}>
          Plataforma de Monitoramento Operacional & Inteligência Gerencial — Squad 68
        </p>
      </header>

      <main>
        <section style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', marginTop: 0, color: '#1e293b' }}>Status da Conexão com o Backend</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '1rem' }}>
            <span
              style={{
                display: 'inline-block',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                backgroundColor: backendStatus === 'online' ? '#10b981' : backendStatus === 'verificando' ? '#f59e0b' : '#ef4444'
              }}
            />
            <strong style={{ textTransform: 'uppercase', color: backendStatus === 'online' ? '#065f46' : '#991b1b' }}>
              {backendStatus}
            </strong>
            {timestamp && <span style={{ color: '#64748b', fontSize: '0.875rem' }}>(Verificado às {timestamp})</span>}
          </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#1e3a8a' }}>📊 Módulo Gerencial</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#1e40af' }}>
              Dashboards de faturamento, vendas e estoque integrados ao ERP Winthor.
            </p>
          </div>
          <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#065f46' }}>⚙️ Módulo Operacional</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#064e3b' }}>
              Apontamentos de produção, paradas, ocorrências e cálculo em tempo real de OEE.
            </p>
          </div>
          <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '1rem' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#9a3412' }}>🛡️ Multi-Repositório</h3>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#7c2d12' }}>
              Frontend e Backend desacoplados, com deploy e versionamento independentes.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
