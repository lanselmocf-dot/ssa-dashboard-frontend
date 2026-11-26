import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CircleStop,
  Clock3,
  Factory,
  LogOut,
  PackageCheck,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Field } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { MaquinasApi, TurnosApi } from '../../services/api/adminApi';
import { OperadorApi } from '../../services/api/operadorApi';
import type {
  AbrirParadaPayload,
  CriarOcorrenciaPayload,
  Maquina,
  MotivoParada,
  ParadaMaquina,
  RegistroProducaoPayload,
  SeveridadeOcorrencia,
  TipoOcorrencia,
  Turno
} from '../../types/api';
import { mensagemErro } from '../../utils/errors';
import { formatarDataHora, formatarHora } from '../../utils/format';
import type { ApiResponse } from '../../services/api/apiClient';

const severidades: { valor: SeveridadeOcorrencia; rotulo: string }[] = [
  { valor: 'Baixa', rotulo: 'Baixa' },
  { valor: 'Media', rotulo: 'Média' },
  { valor: 'Alta', rotulo: 'Alta' },
  { valor: 'Critica', rotulo: 'Crítica' }
];

function erroDeResposta<T>(resposta: ApiResponse<T>, recurso: string): string {
  return resposta.success
    ? `${recurso}: o servidor não retornou os dados esperados.`
    : `${recurso}: ${mensagemErro(resposta)}`;
}

function formatarQuantidade(valor: number): string {
  return new Intl.NumberFormat('pt-BR').format(valor);
}

export function OperatorTerminal() {
  const { usuario, logout } = useAuth();
  const toast = useToast();
  const [maquinas, setMaquinas] = useState<Maquina[]>([]);
  const [turnos, setTurnos] = useState<Turno[]>([]);
  const [motivos, setMotivos] = useState<MotivoParada[]>([]);
  const [tiposOcorrencia, setTiposOcorrencia] = useState<TipoOcorrencia[]>([]);
  const [maquinaId, setMaquinaId] = useState('');
  const [turnoId, setTurnoId] = useState('');
  const [carregandoCatalogos, setCarregandoCatalogos] = useState(true);
  const [erroCatalogos, setErroCatalogos] = useState('');
  const [paradaAberta, setParadaAberta] = useState<ParadaMaquina | null>(null);
  const [carregandoParada, setCarregandoParada] = useState(false);
  const [erroParada, setErroParada] = useState('');
  const [revisaoParadas, setRevisaoParadas] = useState(0);

  const [referenciaProduto, setReferenciaProduto] = useState('');
  const [quantidadeProduzida, setQuantidadeProduzida] = useState('');
  const [quantidadeRejeitada, setQuantidadeRejeitada] = useState('');
  const [observacoesProducao, setObservacoesProducao] = useState('');
  const [enviandoProducao, setEnviandoProducao] = useState(false);

  const [modalParadaAberto, setModalParadaAberto] = useState(false);
  const [motivoParadaId, setMotivoParadaId] = useState('');
  const [observacaoParada, setObservacaoParada] = useState('');
  const [enviandoParada, setEnviandoParada] = useState(false);
  const [confirmarEncerramento, setConfirmarEncerramento] = useState(false);
  const [encerrandoParada, setEncerrandoParada] = useState(false);

  const [modalOcorrenciaAberto, setModalOcorrenciaAberto] = useState(false);
  const [tipoOcorrenciaId, setTipoOcorrenciaId] = useState('');
  const [descricaoOcorrencia, setDescricaoOcorrencia] = useState('');
  const [severidade, setSeveridade] = useState<SeveridadeOcorrencia | ''>('');
  const [observacaoOcorrencia, setObservacaoOcorrencia] = useState('');
  const [enviandoOcorrencia, setEnviandoOcorrencia] = useState(false);

  const carregarCatalogos = useCallback(async () => {
    setCarregandoCatalogos(true);
    setErroCatalogos('');

    const [maquinasRes, turnosRes, motivosRes, tiposRes] = await Promise.all([
      MaquinasApi.listar(),
      TurnosApi.listar(),
      OperadorApi.listarMotivosParada(),
      OperadorApi.listarTiposOcorrencia()
    ]);

    const problemas: string[] = [];

    if (maquinasRes.success && Array.isArray(maquinasRes.data)) setMaquinas(maquinasRes.data);
    else {
      setMaquinas([]);
      problemas.push(erroDeResposta(maquinasRes, 'Máquinas'));
    }

    if (turnosRes.success && Array.isArray(turnosRes.data)) setTurnos(turnosRes.data);
    else {
      setTurnos([]);
      problemas.push(erroDeResposta(turnosRes, 'Turnos'));
    }

    if (motivosRes.success && Array.isArray(motivosRes.data)) setMotivos(motivosRes.data);
    else {
      setMotivos([]);
      problemas.push(erroDeResposta(motivosRes, 'Motivos de parada'));
    }

    if (tiposRes.success && Array.isArray(tiposRes.data)) setTiposOcorrencia(tiposRes.data);
    else {
      setTiposOcorrencia([]);
      problemas.push(erroDeResposta(tiposRes, 'Tipos de ocorrência'));
    }

    setErroCatalogos(problemas.join(' '));
    setCarregandoCatalogos(false);
  }, []);

  useEffect(() => {
    void carregarCatalogos();
  }, [carregarCatalogos]);

  useEffect(() => {
    if (!maquinaId) {
      setParadaAberta(null);
      setErroParada('');
      setCarregandoParada(false);
      return;
    }

    let ativo = true;
    setCarregandoParada(true);
    setErroParada('');
    setParadaAberta(null);

    void OperadorApi.listarParadasAbertas(maquinaId)
      .then((resposta: ApiResponse<ParadaMaquina[]>) => {
        if (!ativo) return;
        if (!resposta.success || !Array.isArray(resposta.data)) {
          setParadaAberta(null);
          setErroParada(erroDeResposta(resposta, 'Paradas em aberto'));
          return;
        }
        setParadaAberta(resposta.data.find((parada: ParadaMaquina) => parada.encerrado_em === null) ?? null);
      })
      .finally(() => {
        if (ativo) setCarregandoParada(false);
      });

    return () => {
      ativo = false;
    };
  }, [maquinaId, revisaoParadas]);

  const maquinaSelecionada = useMemo(
    () => maquinas.find((maquina) => maquina.id === maquinaId),
    [maquinas, maquinaId]
  );
  const turnoSelecionado = useMemo(
    () => turnos.find((turno) => turno.id === turnoId),
    [turnos, turnoId]
  );

  const produzidoAtual = quantidadeProduzida.trim() === '' ? null : Number(quantidadeProduzida);
  const rejeitadoAtual = quantidadeRejeitada.trim() === '' ? null : Number(quantidadeRejeitada);
  const quantidadesValidas =
    produzidoAtual !== null &&
    rejeitadoAtual !== null &&
    Number.isSafeInteger(produzidoAtual) &&
    Number.isSafeInteger(rejeitadoAtual) &&
    produzidoAtual >= 0 &&
    rejeitadoAtual >= 0;
  const refugoExcedeProducao =
    quantidadesValidas && produzidoAtual !== null && rejeitadoAtual !== null
      ? rejeitadoAtual > produzidoAtual
      : false;
  const pecasAprovadas =
    quantidadesValidas && !refugoExcedeProducao && produzidoAtual !== null && rejeitadoAtual !== null
      ? produzidoAtual - rejeitadoAtual
      : null;

  const motivosAgrupados = useMemo(() => {
    const grupos = new Map<string, MotivoParada[]>();
    for (const motivo of motivos) {
      const itens = grupos.get(motivo.categoria) ?? [];
      itens.push(motivo);
      grupos.set(motivo.categoria, itens);
    }
    return Array.from(grupos.entries());
  }, [motivos]);

  const podeOperar =
    Boolean(maquinaSelecionada) &&
    maquinaSelecionada?.situacao === 'Operando' &&
    !carregandoParada &&
    !erroParada;

  async function registrarProducao(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!maquinaSelecionada || !turnoSelecionado) {
      toast.erro('Selecione a máquina e o turno antes de registrar a produção.');
      return;
    }
    if (maquinaSelecionada.situacao !== 'Operando' || carregandoParada || erroParada) {
      toast.erro('A máquina não está disponível para apontamento. Confira a situação operacional.');
      return;
    }

    const produzido = Number(quantidadeProduzida);
    const rejeitado = Number(quantidadeRejeitada);
    if (
      quantidadeProduzida.trim() === '' ||
      quantidadeRejeitada.trim() === '' ||
      !Number.isSafeInteger(produzido) ||
      !Number.isSafeInteger(rejeitado) ||
      produzido < 0 ||
      rejeitado < 0
    ) {
      toast.erro('Informe quantidades inteiras e não negativas.');
      return;
    }
    if (rejeitado > produzido) {
      toast.erro('O refugo não pode ser superior à quantidade produzida (RN-04).');
      return;
    }

    const referencia = referenciaProduto.trim();
    if (referencia.length < 1 || referencia.length > 50) {
      toast.erro('Informe uma referência de produto com até 50 caracteres.');
      return;
    }
    if (observacoesProducao.length > 500) {
      toast.erro('As observações devem ter no máximo 500 caracteres.');
      return;
    }

    const payload: RegistroProducaoPayload = {
      maquina_id: maquinaSelecionada.id,
      turno_id: turnoSelecionado.id,
      referencia_produto: referencia,
      quantidade_produzida: produzido,
      quantidade_rejeitada: rejeitado,
      observacoes: observacoesProducao.trim() || undefined
    };

    setEnviandoProducao(true);
    const resposta = await OperadorApi.registrarProducao(payload);
    setEnviandoProducao(false);

    if (!resposta.success) {
      toast.erro(mensagemErro(resposta));
      return;
    }
    if (!resposta.data) {
      toast.erro('O servidor não confirmou o registro da produção.');
      return;
    }

    toast.sucesso('Apontamento de produção registrado.');
    setReferenciaProduto('');
    setQuantidadeProduzida('');
    setQuantidadeRejeitada('');
    setObservacoesProducao('');
  }

  async function abrirParada(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!maquinaSelecionada || !podeOperar) {
      toast.erro('Selecione uma máquina operando e aguarde a verificação de paradas.');
      return;
    }
    if (!motivoParadaId) {
      toast.erro('Selecione o motivo da parada.');
      return;
    }
    if (observacaoParada.length > 500) {
      toast.erro('A observação deve ter no máximo 500 caracteres.');
      return;
    }

    const payload: AbrirParadaPayload = {
      maquina_id: maquinaSelecionada.id,
      motivo_parada_id: motivoParadaId,
      observacao: observacaoParada.trim() || undefined
    };

    setEnviandoParada(true);
    const resposta = await OperadorApi.abrirParada(payload);
    setEnviandoParada(false);

    if (!resposta.success) {
      toast.erro(mensagemErro(resposta));
      return;
    }
    if (!resposta.data) {
      toast.erro('O servidor não confirmou a abertura da parada.');
      return;
    }

    setParadaAberta(resposta.data);
    setErroParada('');
    setMaquinas((atuais) =>
      atuais.map((maquina) =>
        maquina.id === maquinaSelecionada.id ? { ...maquina, situacao: 'Parada' } : maquina
      )
    );
    setModalParadaAberto(false);
    setMotivoParadaId('');
    setObservacaoParada('');
    toast.sucesso('Parada operacional registrada.');
  }

  async function encerrarParada() {
    if (!paradaAberta) return;

    setEncerrandoParada(true);
    const resposta = await OperadorApi.encerrarParada(paradaAberta.id);
    setEncerrandoParada(false);

    if (!resposta.success) {
      toast.erro(mensagemErro(resposta));
      return;
    }
    if (!resposta.data) {
      toast.erro('O servidor não confirmou o encerramento da parada.');
      return;
    }

    const situacao = resposta.data.maquina_situacao ?? 'Operando';
    setParadaAberta(null);
    setMaquinas((atuais) =>
      atuais.map((maquina) =>
        maquina.id === resposta.data?.maquina_id ? { ...maquina, situacao } : maquina
      )
    );
    setConfirmarEncerramento(false);
    toast.sucesso('Parada encerrada.');
  }

  async function registrarOcorrencia(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!maquinaSelecionada) {
      toast.erro('Selecione a máquina antes de reportar uma anomalia.');
      return;
    }
    if (!tipoOcorrenciaId || !severidade) {
      toast.erro('Selecione o tipo de ocorrência e a severidade.');
      return;
    }

    const descricao = descricaoOcorrencia.trim();
    if (descricao.length < 5 || descricao.length > 2000) {
      toast.erro('A descrição deve ter entre 5 e 2000 caracteres.');
      return;
    }
    if (observacaoOcorrencia.length > 2000) {
      toast.erro('A observação deve ter no máximo 2000 caracteres.');
      return;
    }

    const payload: CriarOcorrenciaPayload = {
      maquina_id: maquinaSelecionada.id,
      tipo_ocorrencia_id: tipoOcorrenciaId,
      descricao,
      severidade,
      observacao: observacaoOcorrencia.trim() || undefined
    };

    setEnviandoOcorrencia(true);
    const resposta = await OperadorApi.registrarOcorrencia(payload);
    setEnviandoOcorrencia(false);

    if (!resposta.success) {
      toast.erro(mensagemErro(resposta));
      return;
    }
    if (!resposta.data) {
      toast.erro('O servidor não confirmou o registro da ocorrência.');
      return;
    }

    toast.sucesso('Anomalia operacional reportada.');
    setModalOcorrenciaAberto(false);
    setTipoOcorrenciaId('');
    setDescricaoOcorrencia('');
    setSeveridade('');
    setObservacaoOcorrencia('');
  }

  const botaoProducaoDesabilitado =
    carregandoCatalogos ||
    enviandoProducao ||
    !podeOperar ||
    !turnoSelecionado ||
    !quantidadesValidas ||
    refugoExcedeProducao ||
    referenciaProduto.trim().length === 0;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-slate-950 text-white shadow-lg">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500 text-slate-950">
              <Factory size={27} aria-hidden />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">SSA Distribuidora</p>
              <h1 className="text-xl font-bold sm:text-2xl">Terminal do operador</h1>
              <p className="hidden text-sm text-slate-300 sm:block">Chão de fábrica · envase e embalagem</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="font-semibold">{usuario?.nome}</p>
              <p className="text-xs uppercase tracking-wide text-slate-300">Operador</p>
            </div>
            <Button
              variant="secondary"
              onClick={logout}
              className="min-h-12 border-slate-600 bg-slate-800 px-4 text-white hover:bg-slate-700"
              aria-label="Sair da conta"
            >
              <LogOut size={18} aria-hidden />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-5 px-4 py-5 sm:px-6 sm:py-7">
        {erroCatalogos && (
          <div role="alert" className="flex flex-col gap-3 rounded-xl border-2 border-amber-400 bg-amber-50 p-4 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 shrink-0" size={22} aria-hidden />
              <div>
                <p className="font-bold">Não foi possível carregar todos os dados operacionais.</p>
                <p className="mt-1 text-sm">{erroCatalogos}</p>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => void carregarCatalogos()}
              loading={carregandoCatalogos}
              className="min-h-12 shrink-0 border-amber-700 text-amber-950"
            >
              <RefreshCw size={17} aria-hidden />
              Atualizar dados
            </Button>
          </div>
        )}

        <section aria-labelledby="contexto-title" className="rounded-2xl bg-slate-900 p-4 text-white shadow-md sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 id="contexto-title" className="text-lg font-bold">Contexto operacional</h2>
              <p className="text-sm text-slate-300">Confirme a máquina e o turno antes do apontamento.</p>
            </div>
            {carregandoCatalogos && <span className="text-sm font-semibold text-emerald-300">Carregando seletores…</span>}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="maquina-operador" className="mb-1.5 block text-sm font-bold text-slate-200">
                Máquina
              </label>
              <select
                id="maquina-operador"
                className="block h-14 w-full rounded-lg border-2 border-slate-300 bg-white px-4 text-lg font-semibold text-slate-950 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={maquinaId}
                onChange={(evento) => setMaquinaId(evento.target.value)}
                disabled={carregandoCatalogos}
              >
                <option value="">Selecione a máquina</option>
                {maquinas.map((maquina) => (
                  <option key={maquina.id} value={maquina.id}>
                    {maquina.codigo} — {maquina.nome} · {maquina.situacao}
                  </option>
                ))}
              </select>
              {!carregandoCatalogos && maquinas.length === 0 && (
                <p className="mt-1.5 text-sm text-amber-300">Nenhuma máquina disponível no cadastro.</p>
              )}
            </div>
            <div>
              <label htmlFor="turno-operador" className="mb-1.5 block text-sm font-bold text-slate-200">
                Turno ativo
              </label>
              <select
                id="turno-operador"
                className="block h-14 w-full rounded-lg border-2 border-slate-300 bg-white px-4 text-lg font-semibold text-slate-950 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={turnoId}
                onChange={(evento) => setTurnoId(evento.target.value)}
                disabled={carregandoCatalogos}
              >
                <option value="">Selecione o turno</option>
                {turnos.map((turno) => (
                  <option key={turno.id} value={turno.id}>
                    {turno.nome} · {formatarHora(turno.hora_inicio)}–{formatarHora(turno.hora_fim)}
                  </option>
                ))}
              </select>
              {!carregandoCatalogos && turnos.length === 0 && (
                <p className="mt-1.5 text-sm text-amber-300">Nenhum turno cadastrado para seleção.</p>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-700 pt-3 text-sm">
            <span className="inline-flex items-center gap-2 text-slate-300">
              <Factory size={17} aria-hidden />
              {maquinaSelecionada ? `${maquinaSelecionada.codigo} · ${maquinaSelecionada.nome}` : 'Máquina não selecionada'}
            </span>
            <span className="inline-flex items-center gap-2 text-slate-300">
              <Clock3 size={17} aria-hidden />
              {turnoSelecionado
                ? `${turnoSelecionado.nome} · ${formatarHora(turnoSelecionado.hora_inicio)}–${formatarHora(turnoSelecionado.hora_fim)}`
                : 'Turno não selecionado'}
            </span>
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.55fr)_minmax(320px,0.9fr)]">
          <section aria-labelledby="producao-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <PackageCheck size={24} aria-hidden />
              </div>
              <div>
                <h2 id="producao-title" className="text-xl font-bold sm:text-2xl">Apontamento de produção</h2>
                <p className="text-sm text-slate-600">Informe a batelada e o refugo deste turno.</p>
              </div>
            </div>

            <form onSubmit={registrarProducao} className="space-y-5">
              <Field label="Referência do produto" htmlFor="referencia-produto">
                <input
                  id="referencia-produto"
                  className="input h-14 text-lg font-medium"
                  value={referenciaProduto}
                  onChange={(evento) => setReferenciaProduto(evento.target.value)}
                  maxLength={50}
                  autoComplete="off"
                  required
                  disabled={!podeOperar || enviandoProducao}
                  placeholder="Ex.: SKU ou código da batelada"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Peças produzidas" htmlFor="quantidade-produzida">
                  <input
                    id="quantidade-produzida"
                    className="input h-16 text-2xl font-bold tabular-nums"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={quantidadeProduzida}
                    onChange={(evento) => setQuantidadeProduzida(evento.target.value)}
                    required
                    disabled={!podeOperar || enviandoProducao}
                    placeholder="0"
                  />
                </Field>
                <Field label="Refugo / rejeitadas" htmlFor="quantidade-rejeitada">
                  <input
                    id="quantidade-rejeitada"
                    className={`input h-16 text-2xl font-bold tabular-nums ${refugoExcedeProducao ? 'input-error' : ''}`}
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    value={quantidadeRejeitada}
                    onChange={(evento) => setQuantidadeRejeitada(evento.target.value)}
                    required
                    disabled={!podeOperar || enviandoProducao}
                    placeholder="0"
                    aria-invalid={refugoExcedeProducao}
                    aria-describedby={refugoExcedeProducao ? 'erro-rn04' : undefined}
                  />
                </Field>
              </div>

              {refugoExcedeProducao && (
                <p id="erro-rn04" role="alert" className="flex items-center gap-2 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 font-semibold text-red-800">
                  <AlertTriangle size={20} aria-hidden />
                  RN-04: o refugo não pode ser maior que a produção.
                </p>
              )}

              <div aria-live="polite" className="flex items-center justify-between gap-4 rounded-xl border-2 border-emerald-300 bg-emerald-50 px-4 py-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide text-emerald-900">Peças aprovadas</p>
                  <p className="text-sm text-emerald-800">Cálculo automático: produzidas − refugo</p>
                </div>
                <p className="min-w-[5rem] text-right text-4xl font-extrabold tabular-nums text-emerald-900">
                  {pecasAprovadas === null ? '—' : formatarQuantidade(pecasAprovadas)}
                </p>
              </div>

              <Field label="Observações (opcional)" htmlFor="observacoes-producao">
                <textarea
                  id="observacoes-producao"
                  className="input min-h-20 resize-y text-base"
                  value={observacoesProducao}
                  onChange={(evento) => setObservacoesProducao(evento.target.value)}
                  maxLength={500}
                  disabled={!podeOperar || enviandoProducao}
                  placeholder="Detalhes relevantes da batelada"
                />
              </Field>

              {!maquinaSelecionada || !turnoSelecionado ? (
                <p className="text-sm font-medium text-slate-600">Selecione a máquina e o turno para habilitar o apontamento.</p>
              ) : !podeOperar ? (
                <p className="text-sm font-semibold text-amber-800">
                  {erroParada || (carregandoParada ? 'Verificando paradas em aberto…' : `Apontamento indisponível: máquina ${maquinaSelecionada.situacao.toLowerCase()}.`)}
                </p>
              ) : null}

              <Button
                type="submit"
                loading={enviandoProducao}
                disabled={botaoProducaoDesabilitado}
                className="min-h-16 w-full rounded-xl bg-emerald-700 text-lg font-extrabold hover:bg-emerald-800 disabled:bg-slate-300 sm:text-xl"
              >
                <CheckCircle2 size={22} aria-hidden />
                Registrar produção
              </Button>
            </form>
          </section>

          <aside className="space-y-5">
            <section aria-labelledby="situacao-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 id="situacao-title" className="text-lg font-bold">Situação da máquina</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {maquinaSelecionada ? `${maquinaSelecionada.codigo} · ${maquinaSelecionada.nome}` : 'Selecione uma máquina'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                    maquinaSelecionada?.situacao === 'Operando'
                      ? 'bg-emerald-100 text-emerald-900'
                      : maquinaSelecionada?.situacao === 'Parada'
                        ? 'bg-red-100 text-red-900'
                        : 'bg-slate-200 text-slate-800'
                  }`}
                >
                  {maquinaSelecionada?.situacao ?? '—'}
                </span>
              </div>

              <div className="mt-4 rounded-xl bg-slate-50 p-4">
                {carregandoParada ? (
                  <p role="status" className="text-sm font-medium text-slate-600">Verificando paradas em aberto…</p>
                ) : erroParada ? (
                  <div role="alert">
                    <p className="text-sm font-semibold text-red-800">{erroParada}</p>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setRevisaoParadas((valor) => valor + 1)}
                      className="mt-3 min-h-10"
                    >
                      <RefreshCw size={16} aria-hidden />
                      Tentar novamente
                    </Button>
                  </div>
                ) : paradaAberta ? (
                  <div>
                    <p className="flex items-center gap-2 font-bold text-red-800">
                      <CircleStop size={19} aria-hidden />
                      Parada em andamento
                    </p>
                    <p className="mt-2 text-sm text-slate-700">{paradaAberta.motivo_nome ?? 'Motivo registrado'}</p>
                    <p className="mt-1 text-xs text-slate-600">Início: {formatarDataHora(paradaAberta.iniciado_em)}</p>
                  </div>
                ) : (
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <CheckCircle2 size={18} className="text-emerald-700" aria-hidden />
                    Nenhuma parada aberta para esta máquina.
                  </p>
                )}
              </div>

              {paradaAberta ? (
                <Button
                  variant="danger"
                  onClick={() => setConfirmarEncerramento(true)}
                  disabled={encerrandoParada || carregandoParada}
                  className="mt-4 min-h-16 w-full rounded-xl text-lg font-extrabold"
                >
                  <CircleStop size={22} aria-hidden />
                  Encerrar parada
                </Button>
              ) : (
                <Button
                  variant="danger"
                  onClick={() => setModalParadaAberto(true)}
                  disabled={
                    !maquinaSelecionada ||
                    maquinaSelecionada.situacao !== 'Operando' ||
                    carregandoCatalogos ||
                    carregandoParada ||
                    Boolean(erroParada) ||
                    motivos.length === 0
                  }
                  className="mt-4 min-h-16 w-full rounded-xl text-lg font-extrabold"
                >
                  <CircleStop size={22} aria-hidden />
                  Abrir parada
                </Button>
              )}
              {!paradaAberta && maquinaSelecionada?.situacao !== 'Operando' && !carregandoParada && (
                <p className="mt-2 text-center text-sm text-slate-600">Abertura disponível quando a máquina estiver operando.</p>
              )}
            </section>

            <section aria-labelledby="ocorrencia-rapida-title" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900">
                  <AlertTriangle size={22} aria-hidden />
                </div>
                <div>
                  <h2 id="ocorrencia-rapida-title" className="text-lg font-bold">Anomalia operacional</h2>
                  <p className="mt-1 text-sm text-slate-600">Reporte um desvio e classifique sua severidade.</p>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => setModalOcorrenciaAberto(true)}
                disabled={!maquinaSelecionada || carregandoCatalogos || tiposOcorrencia.length === 0}
                className="mt-4 min-h-14 w-full rounded-xl border-2 border-slate-400 text-base font-bold text-slate-900 hover:bg-slate-100"
              >
                Reportar anomalia
              </Button>
              {maquinaSelecionada && tiposOcorrencia.length === 0 && !carregandoCatalogos && (
                <p className="mt-2 text-sm text-amber-800">Nenhum tipo de ocorrência foi carregado.</p>
              )}
            </section>
          </aside>
        </div>
      </main>

      <Modal
        open={modalParadaAberto}
        title="Registrar parada de máquina"
        onClose={() => {
          if (!enviandoParada) setModalParadaAberto(false);
        }}
      >
        <form onSubmit={abrirParada} className="space-y-4">
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-900">
            {maquinaSelecionada?.codigo} · {maquinaSelecionada?.nome}
          </p>
          <Field label="Categoria e motivo" htmlFor="motivo-parada">
            <select
              id="motivo-parada"
              className="input h-14 text-base"
              value={motivoParadaId}
              onChange={(evento) => setMotivoParadaId(evento.target.value)}
              required
              disabled={enviandoParada}
            >
              <option value="">Selecione o motivo</option>
              {motivosAgrupados.map(([categoria, itens]) => (
                <optgroup key={categoria} label={categoria}>
                  {itens.map((motivo) => (
                    <option key={motivo.id} value={motivo.id}>{motivo.descricao}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Field>
          <Field label="Observação (opcional)" htmlFor="observacao-parada">
            <textarea
              id="observacao-parada"
              className="input min-h-24 resize-y text-base"
              value={observacaoParada}
              onChange={(evento) => setObservacaoParada(evento.target.value)}
              maxLength={500}
              disabled={enviandoParada}
              placeholder="O que aconteceu?"
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setModalParadaAberto(false)}
              disabled={enviandoParada}
              className="min-h-12"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={enviandoParada}
              disabled={!motivoParadaId || !podeOperar}
              className="min-h-12"
            >
              Confirmar parada
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmarEncerramento}
        title="Encerrar parada?"
        confirmLabel="Confirmar encerramento"
        danger
        loading={encerrandoParada}
        onConfirm={() => void encerrarParada()}
        onCancel={() => setConfirmarEncerramento(false)}
      >
        <p>Confirme o encerramento da parada de <strong>{maquinaSelecionada?.nome}</strong>.</p>
        <p className="mt-2">O horário e a duração serão registrados pelo servidor.</p>
      </ConfirmDialog>

      <Modal
        open={modalOcorrenciaAberto}
        title="Reportar anomalia operacional"
        onClose={() => {
          if (!enviandoOcorrencia) setModalOcorrenciaAberto(false);
        }}
        size="lg"
      >
        <form onSubmit={registrarOcorrencia} className="space-y-4">
          <p className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-800">
            Máquina: {maquinaSelecionada?.codigo} · {maquinaSelecionada?.nome}
          </p>
          <Field label="Classificação do desvio" htmlFor="tipo-ocorrencia">
            <select
              id="tipo-ocorrencia"
              className="input h-14 text-base"
              value={tipoOcorrenciaId}
              onChange={(evento) => setTipoOcorrenciaId(evento.target.value)}
              required
              disabled={enviandoOcorrencia}
            >
              <option value="">Selecione o tipo</option>
              {tiposOcorrencia.map((tipo) => (
                <option key={tipo.id} value={tipo.id}>{tipo.nome}</option>
              ))}
            </select>
          </Field>
          <Field label="Severidade" htmlFor="severidade-ocorrencia">
            <select
              id="severidade-ocorrencia"
              className="input h-14 text-base font-semibold"
              value={severidade}
              onChange={(evento) => setSeveridade(evento.target.value as SeveridadeOcorrencia | '')}
              required
              disabled={enviandoOcorrencia}
            >
              <option value="">Selecione a severidade</option>
              {severidades.map((item) => (
                <option key={item.valor} value={item.valor}>{item.rotulo}</option>
              ))}
            </select>
          </Field>
          <Field label="Descrição do desvio" htmlFor="descricao-ocorrencia">
            <textarea
              id="descricao-ocorrencia"
              className="input min-h-28 resize-y text-base"
              value={descricaoOcorrencia}
              onChange={(evento) => setDescricaoOcorrencia(evento.target.value)}
              minLength={5}
              maxLength={2000}
              required
              disabled={enviandoOcorrencia}
              placeholder="Descreva o que foi observado"
            />
          </Field>
          <Field label="Observação adicional (opcional)" htmlFor="observacao-ocorrencia">
            <textarea
              id="observacao-ocorrencia"
              className="input min-h-20 resize-y text-base"
              value={observacaoOcorrencia}
              onChange={(evento) => setObservacaoOcorrencia(evento.target.value)}
              maxLength={2000}
              disabled={enviandoOcorrencia}
              placeholder="Informações complementares"
            />
          </Field>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button
              variant="secondary"
              onClick={() => setModalOcorrenciaAberto(false)}
              disabled={enviandoOcorrencia}
              className="min-h-12"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={enviandoOcorrencia}
              disabled={!tipoOcorrenciaId || !severidade || descricaoOcorrencia.trim().length < 5}
              className="min-h-12"
            >
              Enviar ocorrência
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
