import { ApiClient } from './apiClient';
import type {
  AbrirParadaPayload,
  CriarOcorrenciaPayload,
  MotivoParada,
  ParadaMaquina,
  RegistroProducaoPayload,
  TipoOcorrencia
} from '../../types/api';

export const OperadorApi = {
  listarMotivosParada: () => ApiClient.get<MotivoParada[]>('/motivos-parada'),
  listarTiposOcorrencia: () => ApiClient.get<TipoOcorrencia[]>('/tipos-ocorrencia'),
  listarParadasAbertas: (maquinaId?: string) => {
    const query = new URLSearchParams({ apenas_abertas: 'true' });
    if (maquinaId) query.set('maquina_id', maquinaId);
    return ApiClient.get<ParadaMaquina[]>(`/paradas-maquina?${query.toString()}`);
  },
  registrarProducao: (payload: RegistroProducaoPayload) =>
    ApiClient.post('/registros-producao', payload),
  abrirParada: (payload: AbrirParadaPayload) =>
    ApiClient.post<ParadaMaquina>('/paradas-maquina', payload),
  encerrarParada: (id: string) =>
    ApiClient.put<ParadaMaquina>(`/paradas-maquina/${id}/encerrar`, {}),
  registrarOcorrencia: (payload: CriarOcorrenciaPayload) =>
    ApiClient.post('/ocorrencias', payload)
};
