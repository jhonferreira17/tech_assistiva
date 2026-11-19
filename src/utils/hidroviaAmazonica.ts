/**
 * Roteador Hidroviário da Bacia Amazônica (ANTAQ / DNIT / IBGE)
 * Calcula trajetos fluviais reais seguindo os principais rios navegáveis da Região Norte
 * (Solimões, Amazonas, Negro, Madeira, Purus, Juruá, Tapajós e Estreito de Breves),
 * com estimativa de tempo para Barco Regional (~16 km/h) e Lancha Rápida (~35 km/h).
 */

interface RiverNode {
  id: string;
  name: string;
  river: string;
  lat: number;
  lon: number;
}

export interface FluvialRouteResult {
  points: [number, number][];
  fluvialKm: number;
  riversLabel: string;
  boatDurationStr: string;
  speedboatDurationStr: string;
  isPrimaryMode: boolean;
}

const NORTH_UFS = new Set(['AM', 'PA', 'AP', 'AC', 'RO', 'RR']);

// Nós reais ao longo dos principais corredores hidroviários da Bacia Amazônica
const RIVER_NODES: RiverNode[] = [
  // Alto e Médio Solimões
  { id: 'tabatinga', name: 'Tabatinga', river: 'Rio Solimões', lat: -4.2526, lon: -69.9383 },
  { id: 'benjamin', name: 'Benjamin Constant', river: 'Rio Solimões', lat: -4.3831, lon: -70.0314 },
  { id: 'sp_olivenca', name: 'São Paulo de Olivença', river: 'Rio Solimões', lat: -3.4658, lon: -68.9478 },
  { id: 'amatura', name: 'Amaturá', river: 'Rio Solimões', lat: -3.3647, lon: -68.1981 },
  { id: 'sto_antonio_ica', name: 'Santo Antônio do Içá', river: 'Rio Solimões', lat: -3.1022, lon: -67.9397 },
  { id: 'tonantins', name: 'Tonantins', river: 'Rio Solimões', lat: -2.8731, lon: -67.8022 },
  { id: 'jutai', name: 'Jutaí', river: 'Rio Solimões', lat: -2.7472, lon: -66.7669 },
  { id: 'fonte_boa', name: 'Fonte Boa', river: 'Rio Solimões', lat: -2.5139, lon: -66.0917 },
  { id: 'foz_jurua', name: 'Foz do Juruá', river: 'Rio Solimões', lat: -2.6330, lon: -65.7550 },
  { id: 'alvaraes', name: 'Alvarães', river: 'Rio Solimões', lat: -3.2208, lon: -64.8042 },
  { id: 'tefe', name: 'Tefé', river: 'Rio Solimões', lat: -3.3542, lon: -64.7114 },
  { id: 'coari', name: 'Coari', river: 'Rio Solimões', lat: -4.0850, lon: -63.1414 },
  { id: 'codajas', name: 'Codajás', river: 'Rio Solimões', lat: -3.8367, lon: -62.0569 },
  { id: 'foz_purus', name: 'Foz do Purus', river: 'Rio Solimões', lat: -3.7000, lon: -61.4600 },
  { id: 'anori', name: 'Anori', river: 'Rio Solimões', lat: -3.7728, lon: -61.6442 },
  { id: 'anama', name: 'Anamã', river: 'Rio Solimões', lat: -3.5800, lon: -61.4036 },
  { id: 'manacapuru', name: 'Manacapuru', river: 'Rio Solimões', lat: -3.2997, lon: -60.6206 },
  { id: 'iranduba', name: 'Iranduba', river: 'Rio Solimões', lat: -3.2847, lon: -60.1861 },
  { id: 'encontro_aguas', name: 'Encontro das Águas', river: 'Rio Amazonas', lat: -3.1360, lon: -59.9030 },

  // Rio Negro
  { id: 'sgc', name: 'São Gabriel da Cachoeira', river: 'Rio Negro', lat: -0.1303, lon: -67.0892 },
  { id: 'sta_isabel', name: 'Santa Isabel do Rio Negro', river: 'Rio Negro', lat: -0.4139, lon: -65.0192 },
  { id: 'barcelos', name: 'Barcelos', river: 'Rio Negro', lat: -0.9750, lon: -62.9239 },
  { id: 'novo_airao', name: 'Novo Airão', river: 'Rio Negro', lat: -2.6214, lon: -60.9439 },
  { id: 'manaus', name: 'Manaus', river: 'Rio Negro', lat: -3.1190, lon: -60.0217 },

  // Rio Amazonas (AM -> PA -> AP)
  { id: 'careiro_varzea', name: 'Careiro da Várzea', river: 'Rio Amazonas', lat: -3.1981, lon: -59.8267 },
  { id: 'foz_madeira', name: 'Foz do Madeira', river: 'Rio Amazonas', lat: -3.3850, lon: -58.7950 },
  { id: 'itacoatiara', name: 'Itacoatiara', river: 'Rio Amazonas', lat: -3.1431, lon: -58.4442 },
  { id: 'urucurituba', name: 'Urucurituba', river: 'Rio Amazonas', lat: -2.7850, lon: -57.7436 },
  { id: 'maues', name: 'Maués', river: 'Rio Maués-Açu', lat: -3.3836, lon: -57.7186 },
  { id: 'urucara', name: 'Urucará', river: 'Rio Amazonas', lat: -2.5364, lon: -57.7600 },
  { id: 'parintins', name: 'Parintins', river: 'Rio Amazonas', lat: -2.6283, lon: -56.7358 },
  { id: 'juruti', name: 'Juruti', river: 'Rio Amazonas', lat: -2.1522, lon: -56.0922 },
  { id: 'obidos', name: 'Óbidos', river: 'Rio Amazonas', lat: -1.9175, lon: -55.5181 },
  { id: 'oriximina', name: 'Oriximiná', river: 'Rio Trombetas', lat: -1.7656, lon: -55.8661 },
  { id: 'santarem', name: 'Santarém', river: 'Rio Amazonas', lat: -2.4431, lon: -54.7083 },
  { id: 'alenquer', name: 'Alenquer', river: 'Rio Amazonas', lat: -1.9417, lon: -54.7383 },
  { id: 'monte_alegre', name: 'Monte Alegre', river: 'Rio Amazonas', lat: -2.0078, lon: -54.0692 },
  { id: 'prainha', name: 'Prainha', river: 'Rio Amazonas', lat: -1.8000, lon: -53.4800 },
  { id: 'almeirim', name: 'Almeirim', river: 'Rio Amazonas', lat: -1.5233, lon: -52.5817 },
  { id: 'gurupa', name: 'Gurupá', river: 'Rio Amazonas', lat: -1.4050, lon: -51.6400 },
  { id: 'macapa', name: 'Macapá / Santana', river: 'Rio Amazonas', lat: -0.0560, lon: -51.1810 },
  { id: 'breves', name: 'Breves', river: 'Estreito de Breves', lat: -1.6822, lon: -50.4803 },
  { id: 'curralinho', name: 'Curralinho', river: 'Estreito de Breves', lat: -1.8136, lon: -49.7953 },
  { id: 'belem', name: 'Belém', river: 'Baía do Guajará', lat: -1.4558, lon: -48.5044 },

  // Rio Madeira
  { id: 'porto_velho', name: 'Porto Velho', river: 'Rio Madeira', lat: -8.7619, lon: -63.9039 },
  { id: 'humaita', name: 'Humaitá', river: 'Rio Madeira', lat: -7.5061, lon: -63.0208 },
  { id: 'manicore', name: 'Manicoré', river: 'Rio Madeira', lat: -5.8092, lon: -61.3003 },
  { id: 'novo_aripuana', name: 'Novo Aripuanã', river: 'Rio Madeira', lat: -5.1206, lon: -60.3797 },
  { id: 'borba', name: 'Borba', river: 'Rio Madeira', lat: -4.3878, lon: -59.5939 },
  { id: 'nova_olinda', name: 'Nova Olinda do Norte', river: 'Rio Madeira', lat: -3.8881, lon: -59.0942 },
  { id: 'autazes', name: 'Autazes', river: 'Rio Madeira', lat: -3.5797, lon: -59.1306 },

  // Rio Purus
  { id: 'boca_acre', name: 'Boca do Acre', river: 'Rio Purus', lat: -8.7522, lon: -67.3978 },
  { id: 'pauini', name: 'Pauini', river: 'Rio Purus', lat: -7.7136, lon: -66.9764 },
  { id: 'labrea', name: 'Lábrea', river: 'Rio Purus', lat: -7.2589, lon: -64.7978 },
  { id: 'canutama', name: 'Canutama', river: 'Rio Purus', lat: -6.5339, lon: -64.3831 },
  { id: 'tapaua', name: 'Tapauá', river: 'Rio Purus', lat: -5.6278, lon: -63.1828 },
  { id: 'beruri', name: 'Beruri', river: 'Rio Purus', lat: -3.8986, lon: -61.3731 },

  // Rio Juruá
  { id: 'cruzeiro_sul', name: 'Cruzeiro do Sul', river: 'Rio Juruá', lat: -7.6310, lon: -72.6700 },
  { id: 'eirunepe', name: 'Eirunepé', river: 'Rio Juruá', lat: -6.6603, lon: -69.8736 },
  { id: 'itamarati', name: 'Itamarati', river: 'Rio Juruá', lat: -6.4342, lon: -68.2414 },
  { id: 'carauari', name: 'Carauari', river: 'Rio Juruá', lat: -4.8828, lon: -66.8958 },
  { id: 'jurua', name: 'Juruá', river: 'Rio Juruá', lat: -3.4811, lon: -66.0689 },

  // Rio Tapajós
  { id: 'itaituba', name: 'Itaituba', river: 'Rio Tapajós', lat: -4.2761, lon: -55.9836 },
  { id: 'aveiro', name: 'Aveiro', river: 'Rio Tapajós', lat: -3.6061, lon: -55.3317 }
];

// Arestas bidirecionais do grafo hidroviário navegável
const RIVER_EDGES: Array<[string, string]> = [
  // Solimões
  ['benjamin', 'tabatinga'],
  ['tabatinga', 'sp_olivenca'],
  ['sp_olivenca', 'amatura'],
  ['amatura', 'sto_antonio_ica'],
  ['sto_antonio_ica', 'tonantins'],
  ['tonantins', 'jutai'],
  ['jutai', 'fonte_boa'],
  ['fonte_boa', 'foz_jurua'],
  ['foz_jurua', 'alvaraes'],
  ['alvaraes', 'tefe'],
  ['tefe', 'coari'],
  ['coari', 'codajas'],
  ['codajas', 'anori'],
  ['anori', 'foz_purus'],
  ['foz_purus', 'anama'],
  ['anama', 'manacapuru'],
  ['manacapuru', 'iranduba'],
  ['iranduba', 'encontro_aguas'],

  // Rio Negro
  ['sgc', 'sta_isabel'],
  ['sta_isabel', 'barcelos'],
  ['barcelos', 'novo_airao'],
  ['novo_airao', 'manaus'],
  ['manaus', 'encontro_aguas'],

  // Rio Amazonas
  ['encontro_aguas', 'careiro_varzea'],
  ['careiro_varzea', 'foz_madeira'],
  ['foz_madeira', 'itacoatiara'],
  ['itacoatiara', 'urucurituba'],
  ['urucurituba', 'maues'],
  ['urucurituba', 'urucara'],
  ['urucara', 'parintins'],
  ['maues', 'parintins'],
  ['parintins', 'juruti'],
  ['juruti', 'obidos'],
  ['obidos', 'oriximina'],
  ['obidos', 'santarem'],
  ['santarem', 'alenquer'],
  ['santarem', 'monte_alegre'],
  ['alenquer', 'monte_alegre'],
  ['monte_alegre', 'prainha'],
  ['prainha', 'almeirim'],
  ['almeirim', 'gurupa'],
  ['gurupa', 'macapa'],
  ['gurupa', 'breves'],
  ['macapa', 'breves'],
  ['breves', 'curralinho'],
  ['curralinho', 'belem'],

  // Rio Madeira
  ['porto_velho', 'humaita'],
  ['humaita', 'manicore'],
  ['manicore', 'novo_aripuana'],
  ['novo_aripuana', 'borba'],
  ['borba', 'nova_olinda'],
  ['nova_olinda', 'autazes'],
  ['autazes', 'foz_madeira'],
  ['nova_olinda', 'foz_madeira'],

  // Rio Purus
  ['boca_acre', 'pauini'],
  ['pauini', 'labrea'],
  ['labrea', 'canutama'],
  ['canutama', 'tapaua'],
  ['tapaua', 'beruri'],
  ['beruri', 'foz_purus'],

  // Rio Juruá
  ['cruzeiro_sul', 'eirunepe'],
  ['eirunepe', 'itamarati'],
  ['itamarati', 'carauari'],
  ['carauari', 'jurua'],
  ['jurua', 'foz_jurua'],

  // Rio Tapajós
  ['itaituba', 'aveiro'],
  ['aveiro', 'santarem']
];

const NODE_MAP = new Map<string, RiverNode>(RIVER_NODES.map(n => [n.id, n]));
const ADJACENCY = new Map<string, Array<{ to: string; distKm: number }>>();

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Pré-constrói lista de adjacência com fator de sinuosidade fluvial (1.18x)
RIVER_EDGES.forEach(([aId, bId]) => {
  const a = NODE_MAP.get(aId);
  const b = NODE_MAP.get(bId);
  if (!a || !b) return;
  const d = haversineKm(a.lat, a.lon, b.lat, b.lon) * 1.18;
  if (!ADJACENCY.has(aId)) ADJACENCY.set(aId, []);
  if (!ADJACENCY.has(bId)) ADJACENCY.set(bId, []);
  ADJACENCY.get(aId)!.push({ to: bId, distKm: d });
  ADJACENCY.get(bId)!.push({ to: aId, distKm: d });
});

function findNearestNode(lat: number, lon: number): { node: RiverNode; distKm: number } | null {
  let best: RiverNode | null = null;
  let bestDist = Infinity;
  for (const n of RIVER_NODES) {
    const d = haversineKm(lat, lon, n.lat, n.lon);
    if (d < bestDist) {
      bestDist = d;
      best = n;
    }
  }
  return best ? { node: best, distKm: bestDist } : null;
}

function formatHours(hours: number): string {
  const totalMins = Math.max(15, Math.round(hours * 60));
  const d = Math.floor(totalMins / (60 * 24));
  const h = Math.floor((totalMins % (60 * 24)) / 60);
  const m = totalMins % 60;
  if (d >= 1) return `${d}d ${h}h`;
  if (h <= 0) return `${m} min`;
  return `${h}h ${m}min`;
}

export function computeFluvialRoute(
  latO: number,
  lonO: number,
  ufO: string,
  latD: number,
  lonD: number,
  ufD: string,
  hasRoad: boolean,
  roadKm?: number
): FluvialRouteResult | null {
  // Só calcula hidrovia amazônica quando envolve Região Norte
  if (!NORTH_UFS.has(ufO) && !NORTH_UFS.has(ufD)) return null;

  const startNearest = findNearestNode(latO, lonO);
  const endNearest = findNearestNode(latD, lonD);
  if (!startNearest || !endNearest) return null;

  // Exige proximidade razoável da malha hidroviária navegável (até 160 km)
  if (startNearest.distKm > 160 || endNearest.distKm > 160) return null;

  // Dijkstra no grafo hidroviário
  const dist = new Map<string, number>();
  const prev = new Map<string, string>();
  const unvisited = new Set<string>(RIVER_NODES.map(n => n.id));
  dist.set(startNearest.node.id, 0);

  while (unvisited.size > 0) {
    let curr: string | null = null;
    let minD = Infinity;
    for (const id of unvisited) {
      const d = dist.get(id) ?? Infinity;
      if (d < minD) {
        minD = d;
        curr = id;
      }
    }
    if (!curr || minD === Infinity) break;
    if (curr === endNearest.node.id) break;
    unvisited.delete(curr);

    for (const edge of ADJACENCY.get(curr) || []) {
      if (!unvisited.has(edge.to)) continue;
      const alt = minD + edge.distKm;
      if (alt < (dist.get(edge.to) ?? Infinity)) {
        dist.set(edge.to, alt);
        prev.set(edge.to, curr);
      }
    }
  }

  const pathIds: string[] = [];
  let step: string | undefined = endNearest.node.id;
  while (step) {
    pathIds.unshift(step);
    if (step === startNearest.node.id) break;
    step = prev.get(step);
  }
  if (pathIds[0] !== startNearest.node.id) return null;

  const pts: [number, number][] = [[latO, lonO]];
  const riversOrdered: string[] = [];
  pathIds.forEach(id => {
    const node = NODE_MAP.get(id);
    if (!node) return;
    pts.push([node.lat, node.lon]);
    if (riversOrdered[riversOrdered.length - 1] !== node.river) {
      riversOrdered.push(node.river);
    }
  });
  pts.push([latD, lonD]);

  const directKm = haversineKm(latO, lonO, latD, lonD);
  const graphKm = (dist.get(endNearest.node.id) ?? 0) + startNearest.distKm * 1.1 + endNearest.distKm * 1.1;
  const fluvialKm = Math.max(directKm * 1.15, graphKm);

  // Barco regional / recreio (~16 km/h) e Lancha rápida / expresso (~35 km/h)
  const boatDurationStr = formatHours(fluvialKm / 16);
  const speedboatDurationStr = formatHours(fluvialKm / 35);

  // Considera hidrovia como modal principal se não houver rodovia ou se o desvio rodoviário for > 1.7x o fluvial no AM/PA/AP
  const isAmazonRiverState = ufO === 'AM' || ufD === 'AM' || ufO === 'AP' || ufD === 'AP';
  const isPrimaryMode = !hasRoad || (isAmazonRiverState && (!roadKm || roadKm > fluvialKm * 1.65));

  return {
    points: pts,
    fluvialKm,
    riversLabel: riversOrdered.slice(0, 3).join(' → ') || 'Hidrovia Amazônica',
    boatDurationStr,
    speedboatDurationStr,
    isPrimaryMode
  };
}
