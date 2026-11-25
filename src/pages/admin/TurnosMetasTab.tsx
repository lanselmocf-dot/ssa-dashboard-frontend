import { useMemo, useState, type FormEvent } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { MaquinasApi, MetasApi, TurnosApi } from '../../services/api/adminApi';
import type { Maquina, MetaProducao, Turno } from '../../types/api';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Field } from '../../components/ui/Field';
import { Badge, EmptyState, ErrorState, Spinner } from '../../components/ui/Feedback';
import { useToast } from '../../components/ui/Toast';
import { errosPorCampo, mensagemErro } from '../../utils/errors';
import { formatarDataISO, formatarHora, formatarMinutos, formatarSegundos, hojeISO } from '../../utils/format';

/** Mesma regra do back: turno que cruza a meia-noite (fim < início) soma 24h. */
function duracaoMinutos(ini: string, fim: string): number {
  const s = (h: string) => { const [a, b, c] = h.split(':').map(Number); return a * 3600 + b * 60 + (c || 0); };
  return Math.floor((((s(fim) - s(ini)) % 86400) + 86400) % 86400 / 60);
}
const comSegundos = (h: string) => (h.length === 5 ? `${h}:00` : h);

export function TurnosMetasTab() {
  const turnos = useFetch(() => TurnosApi.listar(), []);
  return (
    <div className="space-y-10">
      <TurnosPanel turnos={turnos} />
      <MetasPanel turnos={turnos.data ?? []} />
    </div>
  );
}

/* ───────────────────────────── Turnos ───────────────────────────── */

function TurnosPanel({ turnos }: { turnos: ReturnType<typeof useFetch<Turno[]>> }) {
  const toast = useToast();
  const [nome, setNome] = useState('');
  const [ini, setIni] = useState('');
  const [fim, setFim] = useState('');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const previa = ini && fim ? duracaoMinutos(comSegundos(ini), comSegundos(fim)) : null;

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const e: Record<string, string> = {};
    if (nome.trim().length < 2) e.nome = 'O nome deve ter no mínimo 2 caracteres';
    if (!ini) e.hora_inicio = 'Informe a hora de início';
    if (!fim) e.hora_fim = 'Informe a hora de término';
    if (ini && fim && previa === 0) e.hora_fim = 'Término não pode ser igual ao início';
    setErros(e);
    if (Object.keys(e).length) return;
    setSalvando(true);
    const res = await TurnosApi.criar({ nome: nome.trim(), hora_inicio: comSegundos(ini), hora_fim: comSegundos(fim) });
    setSalvando(false);
    if (res.success) {
      toast.sucesso(`Turno ${nome.trim()} cadastrado.`);
      setNome(''); setIni(''); setFim('');
      turnos.reload();
    } else if (res.error?.code === 'CONFLICT') setErros({ nome: 'Já existe um turno com este nome' });
    else if (Object.keys(errosPorCampo(res)).length) setErros(errosPorCampo(res));
    else toast.erro(mensagemErro(res));
  }

  return (
    <section aria-labelledby="t-turnos" className="space-y-4">
      <div>
        <h2 id="t-turnos" className="text-lg font-semibold text-slate-900">Turnos de trabalho</h2>
        <p className="text-sm text-slate-500">Parametrize os turnos da fábrica. Turnos que viram a madrugada (ex.: 22:00 → 06:00) são calculados corretamente.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {turnos.loading && !turnos.data ? <Spinner /> :
           turnos.error && !turnos.data ? <ErrorState mensagem={turnos.error} onRetry={turnos.reload} /> :
           !turnos.data?.length ? <EmptyState titulo="Nenhum turno cadastrado" descricao="Use o formulário ao lado para criar o primeiro." /> : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50"><tr><th className="th">Turno</th><th className="th">Início</th><th className="th">Término</th><th className="th">Duração</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {turnos.data.map((t) => (
                  <tr key={t.id}>
                    <td className="td font-medium text-slate-900">{t.nome}</td>
                    <td className="td tabular-nums">{formatarHora(t.hora_inicio)}</td>
                    <td className="td tabular-nums">{formatarHora(t.hora_fim)} {t.hora_fim <= t.hora_inicio && <Badge tom="azul">dia seguinte</Badge>}</td>
                    <td className="td">{formatarMinutos(t.duracao_minutos)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <form onSubmit={enviar} noValidate className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-900">Novo turno</h3>
          <Field label="Nome" htmlFor="t-nome" erro={erros.nome}>
            <input id="t-nome" className={`input ${erros.nome ? 'input-error' : ''}`} value={nome} maxLength={50} placeholder="Ex.: T1" onChange={(e) => setNome(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início" htmlFor="t-ini" erro={erros.hora_inicio}>
              <input id="t-ini" type="time" className={`input ${erros.hora_inicio ? 'input-error' : ''}`} value={ini} onChange={(e) => setIni(e.target.value)} />
            </Field>
            <Field label="Término" htmlFor="t-fim" erro={erros.hora_fim}>
              <input id="t-fim" type="time" className={`input ${erros.hora_fim ? 'input-error' : ''}`} value={fim} onChange={(e) => setFim(e.target.value)} />
            </Field>
          </div>
          {previa !== null && previa > 0 && <p className="text-xs text-slate-600">Duração calculada: <strong>{formatarMinutos(previa)}</strong></p>}
          <Button type="submit" loading={salvando} className="w-full">Cadastrar turno</Button>
        </form>
      </div>
    </section>
  );
}

/* ────────────────────────────── Metas ───────────────────────────── */

function MetasPanel({ turnos }: { turnos: Turno[] }) {
  const maquinas = useFetch(() => MaquinasApi.listar(), []);
  const [fMaq, setFMaq] = useState('');
  const [fTurno, setFTurno] = useState('');
  const [fIni, setFIni] = useState('');
  const [fFim, setFFim] = useState('');
  const [modal, setModal] = useState<{ modo: 'criar' } | { modo: 'editar'; meta: MetaProducao } | null>(null);

  const dataInvalida = !!fIni && !!fFim && fIni > fFim;
  const metas = useFetch(
    () => dataInvalida
      ? Promise.resolve({ success: true, data: [] as MetaProducao[] })
      : MetasApi.listar({ maquina_id: fMaq, turno_id: fTurno, data_inicio: fIni, data_fim: fFim }),
    [fMaq, fTurno, fIni, fFim]
  );
  const ativas = useMemo(() => (maquinas.data ?? []).filter((m) => m.situacao !== 'Inativa'), [maquinas.data]);

  return (
    <section aria-labelledby="t-metas" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="t-metas" className="text-lg font-semibold text-slate-900">Metas diárias de produção</h2>
          <p className="text-sm text-slate-500">Uma meta por máquina, turno e data. Máquina, turno e data não mudam depois de criada; ajuste quantidade e tempo.</p>
        </div>
        <Button onClick={() => setModal({ modo: 'criar' })} disabled={!ativas.length || !turnos.length}>Nova meta</Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select aria-label="Filtrar por máquina" className="input" value={fMaq} onChange={(e) => setFMaq(e.target.value)}>
          <option value="">Todas as máquinas</option>
          {(maquinas.data ?? []).map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}
        </select>
        <select aria-label="Filtrar por turno" className="input" value={fTurno} onChange={(e) => setFTurno(e.target.value)}>
          <option value="">Todos os turnos</option>
          {turnos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <input aria-label="Data inicial" type="date" className="input" value={fIni} onChange={(e) => setFIni(e.target.value)} />
        <input aria-label="Data final" type="date" className="input" value={fFim} onChange={(e) => setFFim(e.target.value)} />
      </div>
      {dataInvalida && <p role="alert" className="text-sm text-red-600">A data final não pode ser anterior à data inicial.</p>}

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {metas.loading && !metas.data ? <Spinner /> :
         metas.error && !metas.data ? <ErrorState mensagem={metas.error} onRetry={metas.reload} /> :
         !metas.data?.length ? <EmptyState titulo="Nenhuma meta encontrada" descricao="Ajuste os filtros ou crie uma nova meta." /> : (
          <div className={`overflow-x-auto ${metas.loading ? 'opacity-60' : ''}`}>
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr><th className="th">Data</th><th className="th">Máquina</th><th className="th">Turno</th>
                    <th className="th text-right">Qtd. planejada</th><th className="th text-right">Tempo planejado</th><th className="th text-right">Ações</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metas.data.map((m) => (
                  <tr key={m.id}>
                    <td className="td whitespace-nowrap">{formatarDataISO(m.data_referencia)}</td>
                    <td className="td"><span className="font-mono text-xs text-slate-500">{m.maquina_codigo}</span> {m.maquina_nome}</td>
                    <td className="td">{m.turno_nome}</td>
                    <td className="td text-right tabular-nums">{m.quantidade_planejada.toLocaleString('pt-BR')}</td>
                    <td className="td text-right tabular-nums">{formatarSegundos(m.tempo_planejado_segundos)}</td>
                    <td className="td"><div className="flex justify-end"><Button size="sm" variant="secondary" onClick={() => setModal({ modo: 'editar', meta: m })}>Editar</Button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {metas.data && metas.data.length >= 200 && (
          <p className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">Exibindo as 200 metas mais recentes. Use os filtros para refinar.</p>
        )}
      </div>

      {modal && <MetaFormModal meta={modal.modo === 'editar' ? modal.meta : undefined} maquinas={ativas} turnos={turnos}
        onClose={() => setModal(null)} onSalvo={() => { setModal(null); metas.reload(); }} />}
    </section>
  );
}

function MetaFormModal({ meta, maquinas, turnos, onClose, onSalvo }: {
  meta?: MetaProducao; maquinas: Maquina[]; turnos: Turno[]; onClose: () => void; onSalvo: () => void;
}) {
  const toast = useToast();
  const editando = !!meta;
  const [maq, setMaq] = useState(meta?.maquina_id ?? '');
  const [turno, setTurno] = useState(meta?.turno_id ?? '');
  const [data, setData] = useState(meta?.data_referencia ?? hojeISO());
  const [qtd, setQtd] = useState(meta ? String(meta.quantidade_planejada) : '');
  const [minutos, setMinutos] = useState(meta ? String(Math.round(meta.tempo_planejado_segundos / 60)) : '');
  const [erros, setErros] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState(false);

  const turnoSel = turnos.find((t) => t.id === turno);

  function validar() {
    const e: Record<string, string> = {};
    if (!editando) {
      if (!maq) e.maquina_id = 'Selecione a máquina';
      if (!turno) e.turno_id = 'Selecione o turno';
      if (!data) e.data_referencia = 'Informe a data';
    }
    const q = Number(qtd), m = Number(minutos);
    if (!Number.isInteger(q) || q < 1) e.quantidade_planejada = 'Informe um inteiro maior que zero';
    if (!Number.isInteger(m) || m < 1) e.tempo_planejado_segundos = 'Informe os minutos (inteiro maior que zero)';
    else if (turnoSel && m > turnoSel.duracao_minutos) e.tempo_planejado_segundos = `Não pode exceder a duração do turno (${formatarMinutos(turnoSel.duracao_minutos)})`;
    return e;
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    const e = validar();
    setErros(e);
    if (Object.keys(e).length) return;
    setSalvando(true);
    const corpo = { quantidade_planejada: Number(qtd), tempo_planejado_segundos: Number(minutos) * 60 };
    const res = editando
      ? await MetasApi.editar(meta!.id, corpo)
      : await MetasApi.criar({ maquina_id: maq, turno_id: turno, data_referencia: data, ...corpo });
    setSalvando(false);
    if (res.success) {
      toast.sucesso(editando ? 'Meta atualizada.' : 'Meta cadastrada.');
      onSalvo();
      return;
    }
    const porCampo = errosPorCampo(res);
    if (Object.keys(porCampo).length) setErros(porCampo);
    else if (res.error?.code === 'PLANNED_TIME_EXCEEDS_SHIFT') setErros({ tempo_planejado_segundos: res.error.message });
    else toast.erro(mensagemErro(res));
  }

  const cls = (k: string) => `input ${erros[k] ? 'input-error' : ''}`;
  return (
    <Modal open title={editando ? 'Editar meta' : 'Nova meta de produção'} onClose={salvando ? () => {} : onClose}
      footer={<>
        <Button variant="secondary" onClick={onClose} disabled={salvando}>Cancelar</Button>
        <Button type="submit" form="form-meta" loading={salvando}>{editando ? 'Salvar alterações' : 'Cadastrar meta'}</Button>
      </>}>
      <form id="form-meta" onSubmit={enviar} noValidate className="space-y-4">
        <Field label="Máquina" htmlFor="mt-maq" erro={erros.maquina_id}>
          {editando
            ? <input id="mt-maq" className="input" disabled value={`${meta!.maquina_codigo} — ${meta!.maquina_nome}`} />
            : <select id="mt-maq" className={cls('maquina_id')} value={maq} onChange={(e) => setMaq(e.target.value)}>
                <option value="">Selecione…</option>
                {maquinas.map((m) => <option key={m.id} value={m.id}>{m.codigo} — {m.nome}</option>)}
              </select>}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Turno" htmlFor="mt-turno" erro={erros.turno_id}>
            {editando
              ? <input id="mt-turno" className="input" disabled value={meta!.turno_nome} />
              : <select id="mt-turno" className={cls('turno_id')} value={turno} onChange={(e) => setTurno(e.target.value)}>
                  <option value="">Selecione…</option>
                  {turnos.map((t) => <option key={t.id} value={t.id}>{t.nome} ({formatarHora(t.hora_inicio)}–{formatarHora(t.hora_fim)})</option>)}
                </select>}
          </Field>
          <Field label="Data" htmlFor="mt-data" erro={erros.data_referencia}>
            <input id="mt-data" type="date" className={cls('data_referencia')} value={data} disabled={editando} onChange={(e) => setData(e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantidade planejada" htmlFor="mt-qtd" erro={erros.quantidade_planejada}>
            <input id="mt-qtd" type="number" min={1} step={1} inputMode="numeric" className={cls('quantidade_planejada')} value={qtd} onChange={(e) => setQtd(e.target.value)} />
          </Field>
          <Field label="Tempo planejado (min)" htmlFor="mt-tempo" erro={erros.tempo_planejado_segundos}
                 dica={turnoSel ? `Máx. ${turnoSel.duracao_minutos} min (turno ${turnoSel.nome})` : undefined}>
            <input id="mt-tempo" type="number" min={1} step={1} inputMode="numeric" className={cls('tempo_planejado_segundos')} value={minutos} onChange={(e) => setMinutos(e.target.value)} />
          </Field>
        </div>
      </form>
    </Modal>
  );
}
