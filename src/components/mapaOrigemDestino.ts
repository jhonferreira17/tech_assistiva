/**
 * Componente em TypeScript: Mapa Dinâmico de Origem e Destino de Tecnologias Assistivas no SUS
 * Permite clicar em qualquer Estado (UF), Polo de Atendimento (Destino) ou Município de Moradia (Origem)
 * para visualizar de onde o paciente sai e para onde ele vai buscar o recurso assistivo.
 */

import L from 'leaflet';

export interface RotaOD {
  c_orig: string;
  n_orig: string;
  uf_orig: string;
  lat_o: number;
  lon_o: number;
  pcd_o: number;
  c_dest: string;
  n_dest: string;
  uf_dest: string;
  lat_d: number;
  lon_d: number;
  dist_km: number;
  cruza_rs: boolean;
  cruza_uf: boolean;
  prod: number;
  proc: number;
  val: number;
  mods: Record<string, number>;
}

export interface PoloOD {
  cod: string;
  nome: string;
  uf: string;
  rs_nome: string;
  lat: number;
  lon: number;
  pcd_local: number;
  prod_local: number;
  proc_local: number;
  prod_ext: number;
  proc_ext: number;
  total_itens: number;
  val_total: number;
  mun_atendidos: number;
  dist_media_km: number;
  dist_max_km: number;
  mods: Record<string, number>;
}

export interface MapaODPayload {
  uf_bounds: Record<string, { min_lat: number; max_lat: number; min_lon: number; max_lon: number }>;
  polos: PoloOD[];
  top_nacional: RotaOD[];
  rotas_por_uf: Record<string, RotaOD[]>;
}

declare global {
  interface Window {
    MAPA_OD_SUS?: MapaODPayload;
    BR_ESTADOS_GEOJSON?: any;
  }
}

const MOD_NAMES: Record<string, string> = {
  TA01: 'Locomoção (Cadeiras de Rodas / Andadores)',
  TA02: 'Órteses Ortopédicas',
  TA03: 'Próteses de Membros',
  TA04: 'Audição (Aparelhos Auditivos / FM)',
  TA05: 'Visão e Baixa Visão',
  TA06: 'Reabilitação Vocal (Laringe)',
  TA10: 'Adequação Postural'
};

const fmtInt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });
const fmtDec1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/**
 * Calcula pontos de uma curva Bézier quadrática entre (lat1, lon1) e (lat2, lon2)
 * para desenhar arcos elegantes de deslocamento Origem -> Destino no Leaflet.
 */
function getCurvedLatLngs(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  segments = 24
): L.LatLngExpression[] {
  const latMid = (lat1 + lat2) / 2;
  const lonMid = (lon1 + lon2) / 2;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  // Offset perpendicular suave para criar o arco
  const curvature = 0.18;
  const ctrlLat = latMid - dLon * curvature;
  const ctrlLon = lonMid + dLat * curvature;

  const pts: L.LatLngExpression[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const inv = 1 - t;
    const lat = inv * inv * lat1 + 2 * inv * t * ctrlLat + t * t * lat2;
    const lon = inv * inv * lon1 + 2 * inv * t * ctrlLon + t * t * lon2;
    pts.push([lat, lon]);
  }
  return pts;
}

function getRouteColor(distKm: number): string {
  if (distKm >= 250) return '#e11d48'; // Longa distância (>250 km) - Rose
  if (distKm >= 100) return '#d97706'; // Média distância (100-250 km) - Amber
  return '#0284c7'; // Regional (<100 km) - Blue
}

export class MapaOrigemDestinoController {
  private map: L.Map | null = null;
  private statesLayer: L.GeoJSON | null = null;
  private arcsLayer: L.LayerGroup = L.layerGroup();
  private markersLayer: L.LayerGroup = L.layerGroup();

  private currentUF: string = 'ALL';
  private currentMod: string = 'ALL';
  private maxRoutes: number = 45;
  private selectedPoloCod: string = 'ALL';
  private onStateSelectCallback?: (uf: string) => void;

  constructor(onStateSelect?: (uf: string) => void) {
    this.onStateSelectCallback = onStateSelect;
  }

  public initMap(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container || this.map) return;

    this.map = L.map(containerId, {
      center: [-14.2, -52.0],
      zoom: 4,
      minZoom: 3,
      maxZoom: 12,
      zoomControl: true
    });

    // Basemap CartoDB Positron (limpo e ideal para visualização de fluxos)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO | Dados SIA/SUS & Censo IBGE 2022',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(this.map);

    this.renderBrazilStatesGeoJSON();
    this.arcsLayer.addTo(this.map);
    this.markersLayer.addTo(this.map);

    this.bindMapControls();
    this.updateView('ALL');
  }

  public invalidateSize(): void {
    if (this.map) {
      setTimeout(() => {
        this.map?.invalidateSize();
      }, 120);
    }
  }

  private renderBrazilStatesGeoJSON(): void {
    const geojson = window.BR_ESTADOS_GEOJSON;
    if (!this.map || !geojson) return;

    this.statesLayer = L.geoJSON(geojson, {
      style: feature => {
        const sigla = feature?.properties?.sigla || '';
        const isSelected = this.currentUF !== 'ALL' && sigla === this.currentUF;
        return {
          color: isSelected ? '#0284c7' : '#64748b',
          weight: isSelected ? 2.5 : 1,
          fillColor: isSelected ? '#0284c7' : '#94a3b8',
          fillOpacity: isSelected ? 0.08 : 0.04
        };
      },
      onEachFeature: (feature, layer) => {
        const sigla = feature?.properties?.sigla || '';
        const nome = feature?.properties?.nome || sigla;

        layer.bindTooltip(`<strong>${nome} (${sigla})</strong><br/>Clique para ver as rotas de pacientes deste estado`, {
          sticky: true,
          direction: 'top',
          className: 'map-state-tooltip'
        });

        layer.on('mouseover', () => {
          if (this.currentUF !== sigla) {
            (layer as L.Path).setStyle({
              weight: 2,
              color: '#0284c7',
              fillOpacity: 0.12
            });
          }
        });

        layer.on('mouseout', () => {
          this.statesLayer?.resetStyle(layer as L.Path);
        });

        layer.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          this.selectState(sigla);
          if (this.onStateSelectCallback) {
            this.onStateSelectCallback(sigla);
          }
        });
      }
    }).addTo(this.map);
  }

  public selectState(uf: string, triggerFly = true): void {
    this.currentUF = uf;
    this.selectedPoloCod = 'ALL';

    const selUfMap = document.getElementById('mapSelectUF') as HTMLSelectElement | null;
    if (selUfMap && selUfMap.value !== uf) {
      selUfMap.value = uf;
    }

    this.populatePoloDropdown(uf);
    this.statesLayer?.setStyle(feature => {
      const sigla = feature?.properties?.sigla || '';
      const isSelected = this.currentUF !== 'ALL' && sigla === this.currentUF;
      return {
        color: isSelected ? '#0284c7' : '#64748b',
        weight: isSelected ? 2.5 : 1,
        fillColor: isSelected ? '#0284c7' : '#94a3b8',
        fillOpacity: isSelected ? 0.08 : 0.03
      };
    });

    if (this.map && triggerFly) {
      const payload = window.MAPA_OD_SUS;
      if (uf === 'ALL' || !payload?.uf_bounds[uf]) {
        this.map.flyTo([-14.5, -52.0], 4, { duration: 0.8 });
      } else {
        const b = payload.uf_bounds[uf];
        const padLat = Math.max(0.4, (b.max_lat - b.min_lat) * 0.15);
        const padLon = Math.max(0.4, (b.max_lon - b.min_lon) * 0.15);
        this.map.flyToBounds(
          [
            [b.min_lat - padLat, b.min_lon - padLon],
            [b.max_lat + padLat, b.max_lon + padLon]
          ],
          { duration: 0.85, maxZoom: 8 }
        );
      }
    }

    this.updateView(uf);
  }

  private populatePoloDropdown(uf: string): void {
    const selPolo = document.getElementById('mapSelectPolo') as HTMLSelectElement | null;
    if (!selPolo || !window.MAPA_OD_SUS) return;

    const polos = window.MAPA_OD_SUS.polos.filter(p => uf === 'ALL' || p.uf === uf);
    selPolo.innerHTML = `<option value="ALL">Todos os Polos de Destino (${polos.length})</option>`;
    polos.slice(0, 80).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.cod;
      opt.textContent = `${p.nome} (${p.uf}) — atende +${p.mun_atendidos} cidades`;
      selPolo.appendChild(opt);
    });
  }

  private getActiveRoutes(): RotaOD[] {
    const payload = window.MAPA_OD_SUS;
    if (!payload) return [];

    let baseRoutes: RotaOD[] =
      this.currentUF === 'ALL'
        ? payload.top_nacional
        : payload.rotas_por_uf[this.currentUF] || [];

    if (this.selectedPoloCod !== 'ALL') {
      baseRoutes = baseRoutes.filter(r => r.c_dest === this.selectedPoloCod);
    }

    if (this.currentMod !== 'ALL') {
      baseRoutes = baseRoutes.filter(r => (r.mods[this.currentMod] || 0) > 0);
    }

    // Sort by volume in selected modality (or total)
    const sorted = [...baseRoutes].sort((a, b) => {
      const volA = this.currentMod === 'ALL' ? a.prod + a.proc : a.mods[this.currentMod] || 0;
      const volB = this.currentMod === 'ALL' ? b.prod + b.proc : b.mods[this.currentMod] || 0;
      return volB - volA;
    });

    return sorted.slice(0, this.maxRoutes);
  }

  public updateView(_uf?: string): void {
    if (!this.map || !window.MAPA_OD_SUS) return;

    this.arcsLayer.clearLayers();
    this.markersLayer.clearLayers();

    const routes = this.getActiveRoutes();
    const polosMap = new Map<string, PoloOD>();
    window.MAPA_OD_SUS.polos.forEach(p => polosMap.set(p.cod, p));

    const activeOrigins = new Map<
      string,
      {
        cod: string;
        nome: string;
        uf: string;
        lat: number;
        lon: number;
        pcd: number;
        destinos: RotaOD[];
        totalSaida: number;
      }
    >();
    const activeDests = new Set<string>();

    const maxVol = routes.reduce((acc, r) => {
      const v = this.currentMod === 'ALL' ? r.prod + r.proc : r.mods[this.currentMod] || 0;
      return Math.max(acc, v);
    }, 1);

    // 1. Draw Curved Flow Arcs (Origem -> Destino)
    routes.forEach(r => {
      const vol = this.currentMod === 'ALL' ? r.prod + r.proc : r.mods[this.currentMod] || 0;
      if (vol <= 0) return;

      activeDests.add(r.c_dest);
      if (!activeOrigins.has(r.c_orig)) {
        activeOrigins.set(r.c_orig, {
          cod: r.c_orig,
          nome: r.n_orig,
          uf: r.uf_orig,
          lat: r.lat_o,
          lon: r.lon_o,
          pcd: r.pcd_o,
          destinos: [],
          totalSaida: 0
        });
      }
      const origEntry = activeOrigins.get(r.c_orig)!;
      origEntry.destinos.push(r);
      origEntry.totalSaida += vol;

      const latlngs = getCurvedLatLngs(r.lat_o, r.lon_o, r.lat_d, r.lon_d);
      const weight = Math.max(1.8, Math.min(6.5, 1.8 + (vol / maxVol) * 4.7));
      const color = getRouteColor(r.dist_km);

      const polyline = L.polyline(latlngs, {
        color,
        weight,
        opacity: 0.72,
        className: 'od-flow-arc'
      });

      polyline.bindTooltip(
        `<div style="font-size:12px;line-height:1.45;">
          <strong>De: ${r.n_orig} (${r.uf_orig})</strong><br/>
          <strong>Para: ${r.n_dest} (${r.uf_dest})</strong><br/>
          Distância: <strong>${fmtDec1.format(r.dist_km)} km</strong> • Itens: <strong>${fmtInt.format(vol)}</strong>
        </div>`,
        { sticky: true }
      );

      polyline.on('mouseover', () => {
        polyline.setStyle({ weight: weight + 2, opacity: 1.0 });
      });
      polyline.on('mouseout', () => {
        polyline.setStyle({ weight, opacity: 0.72 });
      });
      polyline.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        this.renderRouteDetailCard(r);
      });

      this.arcsLayer.addLayer(polyline);
    });

    // 2. Draw Origin Municipality Markers (Blue circles = onde a pessoa mora)
    activeOrigins.forEach(orig => {
      // If an origin is also an active destination hub, we draw it as a hub below
      if (activeDests.has(orig.cod)) return;

      const radius = Math.max(4.5, Math.min(9.5, 4.5 + Math.log10(orig.totalSaida + 1) * 1.4));
      const marker = L.circleMarker([orig.lat, orig.lon], {
        radius,
        fillColor: '#0284c7',
        color: '#ffffff',
        weight: 1.5,
        fillOpacity: 0.9
      });

      marker.bindTooltip(
        `<div style="font-size:12px;">
          <span style="color:#0284c7;font-weight:700;">● Município de Origem (Moradia)</span><br/>
          <strong>${orig.nome} (${orig.uf})</strong><br/>
          Pacientes saem para buscar <strong>${fmtInt.format(orig.totalSaida)}</strong> recursos
        </div>`,
        { direction: 'top' }
      );

      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        this.renderOriginDetailCard(orig);
      });

      this.markersLayer.addLayer(marker);
    });

    // 3. Draw Destination Hub Markers (Green/Gold circles with halo = onde a pessoa vai buscar o recurso)
    activeDests.forEach(cDest => {
      const polo = polosMap.get(cDest);
      if (!polo) return;

      // Outer pulse halo
      const halo = L.circleMarker([polo.lat, polo.lon], {
        radius: 14,
        fillColor: '#059669',
        color: '#059669',
        weight: 1,
        fillOpacity: 0.22
      });
      this.markersLayer.addLayer(halo);

      const hubMarker = L.circleMarker([polo.lat, polo.lon], {
        radius: 8,
        fillColor: '#059669',
        color: '#ffffff',
        weight: 2.2,
        fillOpacity: 1
      });

      hubMarker.bindTooltip(
        `<div style="font-size:12px;">
          <span style="color:#059669;font-weight:700;">★ Polo de Atendimento (Destino)</span><br/>
          <strong>${polo.nome} (${polo.uf})</strong><br/>
          Recebe pacientes de <strong>+${polo.mun_atendidos} municípios</strong> (raio médio ${fmtDec1.format(polo.dist_media_km)} km)
        </div>`,
        { direction: 'top' }
      );

      hubMarker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        this.selectedPoloCod = this.selectedPoloCod === polo.cod ? 'ALL' : polo.cod;
        const selPolo = document.getElementById('mapSelectPolo') as HTMLSelectElement | null;
        if (selPolo) selPolo.value = this.selectedPoloCod;
        this.updateView();
        this.renderPoloDetailCard(polo);
      });

      this.markersLayer.addLayer(hubMarker);
    });

    // Update Summary Side Panel if no specific click or show default top route/hub
    this.renderStateOverviewCard(routes, activeOrigins.size, activeDests.size);
  }

  private renderStateOverviewCard(routes: RotaOD[], nOrigens: number, nPolos: number): void {
    const panel = document.getElementById('mapInspectorPanel');
    if (!panel) return;

    const totalItens = routes.reduce((acc, r) => acc + r.prod + r.proc, 0);
    const totalVal = routes.reduce((acc, r) => acc + r.val, 0);
    const distPond =
      totalItens > 0
        ? routes.reduce((acc, r) => acc + r.dist_km * (r.prod + r.proc), 0) / totalItens
        : 0;
    const maxRoute = routes.reduce(
      (best, r) => (r.dist_km > (best?.dist_km || 0) ? r : best),
      routes[0] as RotaOD | undefined
    );

    const ufLabel = this.currentUF === 'ALL' ? 'Brasil (Principais Fluxos Nacionais)' : `Estado: ${this.currentUF}`;

    const top5ListHtml = routes
      .slice(0, 6)
      .map(
        (r, i) => `
      <div class="od-mini-route" data-route-idx="${i}" style="padding:9px 11px;border:1px solid var(--border-light);border-radius:8px;background:var(--bg-hover);cursor:pointer;transition:all 0.15s;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;">
          <span><strong>${r.n_orig}</strong> → <strong style="color:var(--emerald);">${r.n_dest}</strong></span>
          <span class="tag ${r.dist_km >= 250 ? 'tag-crit' : r.dist_km >= 100 ? 'tag-zero' : 'tag-prod'}">${fmtDec1.format(r.dist_km)} km</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;display:flex;justify-content:space-between;">
          <span>Equip.: <strong>${fmtInt.format(r.prod)}</strong> • Adaptações: <strong>${fmtInt.format(r.proc)}</strong></span>
          <span>${fmtBRL.format(r.val)}</span>
        </div>
      </div>
    `
      )
      .join('');

    panel.innerHTML = `
      <div style="border-bottom:1px solid var(--border-light);padding-bottom:12px;margin-bottom:14px;">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--primary);letter-spacing:0.05em;">Resumo do Deslocamento</div>
        <h4 style="font-size:16px;font-weight:800;margin-top:2px;">${ufLabel}</h4>
        <p style="font-size:12px;color:var(--text-muted);margin-top:2px;">Clique em qualquer estado no mapa, em uma cidade azul (origem), em um polo verde (destino) ou em uma linha de rota.</p>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
        <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Cidades de Origem</div>
          <div style="font-size:18px;font-weight:800;color:var(--primary);">${fmtInt.format(nOrigens)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Polos de Destino</div>
          <div style="font-size:18px;font-weight:800;color:var(--emerald);">${fmtInt.format(nPolos)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Distância Média</div>
          <div style="font-size:18px;font-weight:800;color:var(--amber);">${fmtDec1.format(distPond)} km</div>
        </div>
        <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Recursos nas Rotas</div>
          <div style="font-size:18px;font-weight:800;">${fmtInt.format(totalItens)}</div>
        </div>
      </div>

      ${
        maxRoute
          ? `<div style="font-size:12px;background:var(--rose-soft);color:var(--rose);padding:9px 12px;border-radius:8px;margin-bottom:14px;">
              <strong>Maior distância exibida:</strong> Pacientes de <strong>${maxRoute.n_orig} (${maxRoute.uf_orig})</strong> viajam <strong>${fmtDec1.format(maxRoute.dist_km)} km</strong> até <strong>${maxRoute.n_dest} (${maxRoute.uf_dest})</strong>.
            </div>`
          : ''
      }

      <div style="font-size:12px;font-weight:700;color:var(--text-main);margin-bottom:8px;">Principais Rotas Origem → Destino (Clique para inspecionar):</div>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:290px;overflow-y:auto;">
        ${top5ListHtml || '<div style="font-size:12px;color:var(--text-muted);">Nenhuma rota encontrada para este filtro.</div>'}
      </div>
    `;

    panel.querySelectorAll('.od-mini-route').forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-route-idx') || 0);
        const r = routes[idx];
        if (r) {
          this.renderRouteDetailCard(r);
          this.map?.flyToBounds(
            [
              [Math.min(r.lat_o, r.lat_d) - 0.3, Math.min(r.lon_o, r.lon_d) - 0.3],
              [Math.max(r.lat_o, r.lat_d) + 0.3, Math.max(r.lon_o, r.lon_d) + 0.3]
            ],
            { duration: 0.6, maxZoom: 9 }
          );
        }
      });
    });
  }

  private renderRouteDetailCard(r: RotaOD): void {
    const panel = document.getElementById('mapInspectorPanel');
    if (!panel) return;

    const modsHtml = Object.entries(r.mods)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([m, q]) => `
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border-light);">
          <span>${MOD_NAMES[m] || m}</span>
          <strong>${fmtInt.format(q)} un.</strong>
        </div>
      `
      )
      .join('');

    panel.innerHTML = `
      <div style="border-bottom:1px solid var(--border-light);padding-bottom:12px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="tag tag-prod">Rota de Deslocamento</span>
          <button class="btn" id="btnBackToOverview" style="padding:3px 9px;font-size:11px;">← Voltar</button>
        </div>
        <h4 style="font-size:16px;font-weight:800;margin-top:8px;">
          ${r.n_orig} (${r.uf_orig}) → ${r.n_dest} (${r.uf_dest})
        </h4>
      </div>

      <div class="clean-list" style="margin-bottom:14px;">
        <div class="clean-list-item">
          <div>
            <span style="font-size:11px;color:var(--primary);font-weight:700;">● ONDE A PESSOA MORA (ORIGEM)</span>
            <div><strong>${r.n_orig} (${r.uf_orig})</strong></div>
            <div style="font-size:11.5px;color:var(--text-muted);">População c/ Deficiência (Censo 2022): <strong>${fmtInt.format(r.pcd_o)} pessoas</strong></div>
          </div>
        </div>
        <div class="clean-list-item">
          <div>
            <span style="font-size:11px;color:var(--emerald);font-weight:700;">★ ONDE VAI BUSCAR O RECURSO (DESTINO)</span>
            <div><strong>${r.n_dest} (${r.uf_dest})</strong></div>
            <div style="font-size:11.5px;color:var(--text-muted);">Distância em linha reta: <strong>${fmtDec1.format(r.dist_km)} km</strong> (${r.cruza_rs ? 'Sai da Região de Saúde' : 'Mesma Região de Saúde'})</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
        <div style="background:var(--bg-subtle);padding:8px 10px;border-radius:8px;">
          <div style="font-size:10.5px;color:var(--text-muted);">Equipamentos</div>
          <div style="font-size:15px;font-weight:800;">${fmtInt.format(r.prod)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:8px 10px;border-radius:8px;">
          <div style="font-size:10.5px;color:var(--text-muted);">Adaptações</div>
          <div style="font-size:15px;font-weight:800;">${fmtInt.format(r.proc)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:8px 10px;border-radius:8px;">
          <div style="font-size:10.5px;color:var(--text-muted);">Custeio SUS</div>
          <div style="font-size:13px;font-weight:800;">${fmtBRL.format(r.val)}</div>
        </div>
      </div>

      <div style="font-size:12px;font-weight:700;margin-bottom:6px;">O que os moradores foram buscar neste polo:</div>
      <div>${modsHtml}</div>
    `;

    document.getElementById('btnBackToOverview')?.addEventListener('click', () => {
      this.updateView();
    });
  }

  private renderOriginDetailCard(orig: {
    cod: string;
    nome: string;
    uf: string;
    pcd: number;
    destinos: RotaOD[];
    totalSaida: number;
  }): void {
    const panel = document.getElementById('mapInspectorPanel');
    if (!panel) return;

    const destsHtml = orig.destinos
      .map(
        r => `
      <div style="padding:9px 11px;border:1px solid var(--border-light);border-radius:8px;background:var(--bg-hover);">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;">
          <span>Vai para: <strong style="color:var(--emerald);">${r.n_dest} (${r.uf_dest})</strong></span>
          <span class="tag tag-zero">${fmtDec1.format(r.dist_km)} km</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">
          Equipamentos: <strong>${fmtInt.format(r.prod)}</strong> • Adaptações: <strong>${fmtInt.format(r.proc)}</strong> • ${fmtBRL.format(r.val)}
        </div>
      </div>
    `
      )
      .join('');

    panel.innerHTML = `
      <div style="border-bottom:1px solid var(--border-light);padding-bottom:12px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="tag tag-prod">● Município de Moradia (Origem)</span>
          <button class="btn" id="btnBackToOverview" style="padding:3px 9px;font-size:11px;">← Voltar</button>
        </div>
        <h4 style="font-size:16px;font-weight:800;margin-top:8px;">${orig.nome} (${orig.uf})</h4>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
          População com Deficiência (Censo 2022): <strong>${fmtInt.format(orig.pcd)} moradores</strong>
        </div>
      </div>

      <div style="font-size:12.5px;margin-bottom:10px;">
        Os moradores de <strong>${orig.nome}</strong> viajaram para buscar <strong>${fmtInt.format(orig.totalSaida)}</strong> recursos assistivos nos seguintes polos:
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto;">
        ${destsHtml}
      </div>
    `;

    document.getElementById('btnBackToOverview')?.addEventListener('click', () => {
      this.updateView();
    });
  }

  private renderPoloDetailCard(polo: PoloOD): void {
    const panel = document.getElementById('mapInspectorPanel');
    if (!panel) return;

    const modsHtml = Object.entries(polo.mods)
      .sort((a, b) => b[1] - a[1])
      .map(
        ([m, q]) => `
        <div style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid var(--border-light);">
          <span>${MOD_NAMES[m] || m}</span>
          <strong>${fmtInt.format(q)} un.</strong>
        </div>
      `
      )
      .join('');

    panel.innerHTML = `
      <div style="border-bottom:1px solid var(--border-light);padding-bottom:12px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="tag tag-ok">★ Polo Regional de Atendimento (Destino)</span>
          <button class="btn" id="btnResetPoloFilter" style="padding:3px 9px;font-size:11px;">Mostrar Todos os Polos</button>
        </div>
        <h4 style="font-size:16px;font-weight:800;margin-top:8px;">${polo.nome} (${polo.uf})</h4>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Região de Saúde: <strong>${polo.rs_nome}</strong></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
        <div style="background:var(--bg-subtle);padding:9px 11px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Cidades Atendidas</div>
          <div style="font-size:17px;font-weight:800;color:var(--emerald);">+${fmtInt.format(polo.mun_atendidos)} cidades</div>
        </div>
        <div style="background:var(--bg-subtle);padding:9px 11px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Raio Médio / Máx.</div>
          <div style="font-size:15px;font-weight:800;color:var(--amber);">${fmtDec1.format(polo.dist_media_km)} / ${fmtDec1.format(polo.dist_max_km)} km</div>
        </div>
        <div style="background:var(--bg-subtle);padding:9px 11px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Atend. Moradores Locais</div>
          <div style="font-size:15px;font-weight:800;">${fmtInt.format(polo.prod_local + polo.proc_local)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:9px 11px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Atend. Pacientes de Fora</div>
          <div style="font-size:15px;font-weight:800;color:var(--primary);">${fmtInt.format(polo.prod_ext + polo.proc_ext)}</div>
        </div>
      </div>

      <div style="font-size:12px;font-weight:700;margin-bottom:6px;">Tecnologias Assistivas fornecidas por este polo:</div>
      <div>${modsHtml}</div>
    `;

    document.getElementById('btnResetPoloFilter')?.addEventListener('click', () => {
      this.selectedPoloCod = 'ALL';
      const selPolo = document.getElementById('mapSelectPolo') as HTMLSelectElement | null;
      if (selPolo) selPolo.value = 'ALL';
      this.updateView();
    });
  }

  private bindMapControls(): void {
    const selUfMap = document.getElementById('mapSelectUF') as HTMLSelectElement | null;
    if (selUfMap && window.MAPA_OD_SUS) {
      const ufs = Object.keys(window.MAPA_OD_SUS.uf_bounds).sort();
      ufs.forEach(uf => {
        const opt = document.createElement('option');
        opt.value = uf;
        opt.textContent = `Estado: ${uf}`;
        selUfMap.appendChild(opt);
      });
      selUfMap.addEventListener('change', () => {
        this.selectState(selUfMap.value, true);
        if (this.onStateSelectCallback) {
          this.onStateSelectCallback(selUfMap.value);
        }
      });
    }

    this.populatePoloDropdown('ALL');

    document.getElementById('mapSelectPolo')?.addEventListener('change', e => {
      this.selectedPoloCod = (e.target as HTMLSelectElement).value;
      this.updateView();
      if (this.selectedPoloCod !== 'ALL' && window.MAPA_OD_SUS) {
        const p = window.MAPA_OD_SUS.polos.find(x => x.cod === this.selectedPoloCod);
        if (p) this.renderPoloDetailCard(p);
      }
    });

    document.getElementById('mapSelectMod')?.addEventListener('change', e => {
      this.currentMod = (e.target as HTMLSelectElement).value;
      this.updateView();
    });

    document.getElementById('mapSelectLimit')?.addEventListener('change', e => {
      this.maxRoutes = Number((e.target as HTMLSelectElement).value || 45);
      this.updateView();
    });

    document.getElementById('btnMapResetBrazil')?.addEventListener('click', () => {
      this.selectState('ALL', true);
      if (this.onStateSelectCallback) {
        this.onStateSelectCallback('ALL');
      }
    });
  }
}
