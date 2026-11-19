/**
 * Mapa Dinâmico OpenStreetMap: Rotas Origem-Destino + Mapa de Calor (Heatmap Canvas)
 * Utiliza OpenStreetMap (camada base gratuita), Malhas Municipais IBGE e Rotas Rodoviárias OSRM.
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
  municipios_ibge?: Record<string, [string, string, number, string, number, number]>;
}

declare global {
  interface Window {
    MAPA_OD_SUS?: MapaODPayload;
    BR_ESTADOS_GEOJSON?: any;
  }
}

const UF_IBGE_CODE: Record<string, number> = {
  RO: 11, AC: 12, AM: 13, RR: 14, PA: 15, AP: 16, TO: 17,
  MA: 21, PI: 22, CE: 23, RN: 24, PB: 25, PE: 26, AL: 27, SE: 28, BA: 29,
  MG: 31, ES: 32, RJ: 33, SP: 35,
  PR: 41, SC: 42, RS: 43,
  MS: 50, MT: 51, GO: 52, DF: 53
};

const TILE_PROVIDERS: Record<string, { url: string; attribution: string }> = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
  },
  osm_hot: {
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap (HOT)'
  },
  voyager: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery'
  },
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }
};

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

function formatDurationSeconds(sec: number): string {
  const hours = Math.floor(sec / 3600);
  const mins = Math.round((sec % 3600) / 60);
  if (hours <= 0) return `${mins} min`;
  return `${hours}h ${mins}min`;
}

function getCurvedLatLngs(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
  segments = 24
): [number, number][] {
  const latMid = (lat1 + lat2) / 2;
  const lonMid = (lon1 + lon2) / 2;
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const curvature = 0.18;
  const ctrlLat = latMid - dLon * curvature;
  const ctrlLon = lonMid + dLat * curvature;

  const pts: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const inv = 1 - t;
    const lat = inv * inv * lat1 + 2 * inv * t * ctrlLat + t * t * lat2;
    const lon = inv * inv * lon1 + 2 * inv * t * ctrlLon + t * t * lon2;
    pts.push([lat, lon]);
  }
  return pts;
}

function createArrowheadMarker(
  pts: [number, number][],
  color: string,
  weight: number,
  ratio = 0.72
): L.Marker | null {
  if (pts.length < 2) return null;
  const idx = Math.max(1, Math.min(pts.length - 1, Math.floor((pts.length - 1) * ratio)));
  const [latA, lonA] = pts[idx - 1];
  const [latB, lonB] = pts[idx];

  const cosLat = Math.cos(((latA + latB) / 2) * (Math.PI / 180));
  const dX = (lonB - lonA) * cosLat;
  const dY = -(latB - latA); // Y cresce para o sul na tela
  const angleDeg = (Math.atan2(dY, dX) * 180) / Math.PI;
  const size = Math.round(11 + weight * 1.45);

  const icon = L.divIcon({
    className: 'od-arrow-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<svg width="${size}" height="${size}" viewBox="0 0 16 16" style="transform:rotate(${angleDeg.toFixed(1)}deg);display:block;overflow:visible;filter:drop-shadow(0 1px 1.5px rgba(15,23,42,0.28));">
      <path d="M1.5 2 L14.5 8 L1.5 14 L4.8 8 Z" fill="${color}" stroke="#ffffff" stroke-width="1.25" stroke-linejoin="round" />
    </svg>`
  });

  return L.marker([latB, lonB], {
    icon,
    interactive: false,
    keyboard: false
  });
}

function getRouteColor(distKm: number): string {
  if (distKm >= 250) return '#e11d48';
  if (distKm >= 100) return '#d97706';
  return '#0284c7';
}

interface HeatPoint {
  lat: number;
  lon: number;
  weight: number;
}

/**
 * Camada Nativa de Mapa de Calor (Heatmap Canvas 2D) sobre o Leaflet / OpenStreetMap
 * 100% gratuita, leve e compatível com TypeScript estrito.
 */
class SimpleCanvasHeatmapLayer extends L.Layer {
  private canvas: HTMLCanvasElement | null = null;
  private points: HeatPoint[] = [];
  private gradientCanvas: Uint8ClampedArray;

  constructor(points: HeatPoint[] = []) {
    super();
    this.points = points;
    this.gradientCanvas = this.buildColorGradient();
  }

  public setPoints(points: HeatPoint[]): void {
    this.points = points;
    this.redraw();
  }

  private buildColorGradient(): Uint8ClampedArray {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 256;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, 'rgba(37, 99, 235, 0)');
    grad.addColorStop(0.2, 'rgba(56, 189, 248, 0.55)');
    grad.addColorStop(0.45, 'rgba(16, 185, 129, 0.72)');
    grad.addColorStop(0.7, 'rgba(245, 158, 11, 0.85)');
    grad.addColorStop(1.0, 'rgba(225, 29, 72, 0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1, 256);
    return ctx.getImageData(0, 0, 1, 256).data;
  }

  override onAdd(map: L.Map): this {
    this.canvas = L.DomUtil.create('canvas', 'leaflet-heatmap-layer') as HTMLCanvasElement;
    this.canvas.style.position = 'absolute';
    this.canvas.style.pointerEvents = 'none';
    this.canvas.style.zIndex = '410';

    const pane = map.getPane('overlayPane');
    pane?.appendChild(this.canvas);

    map.on('moveend zoomend resize', this.redraw, this);
    this.redraw();
    return this;
  }

  override onRemove(map: L.Map): this {
    map.off('moveend zoomend resize', this.redraw, this);
    if (this.canvas && this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.canvas = null;
    return this;
  }

  public redraw(): void {
    const map = this._map;
    if (!map || !this.canvas) return;

    const size = map.getSize();
    if (size.x === 0 || size.y === 0) return;

    const topLeft = map.containerPointToLayerPoint([0, 0]);
    L.DomUtil.setPosition(this.canvas, topLeft);
    this.canvas.width = size.x;
    this.canvas.height = size.y;

    const ctx = this.canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, size.x, size.y);
    if (!this.points.length) return;

    const zoom = map.getZoom();
    const radius = Math.max(18, Math.min(46, 14 + zoom * 3.2));

    // Draw grayscale alpha intensities
    for (const pt of this.points) {
      const p = map.latLngToContainerPoint([pt.lat, pt.lon]);
      if (p.x < -radius || p.y < -radius || p.x > size.x + radius || p.y > size.y + radius) {
        continue;
      }
      const alpha = Math.max(0.14, Math.min(0.95, pt.weight));
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      grd.addColorStop(0, `rgba(0,0,0,${alpha})`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Colorize alpha channel using thermal palette
    const imgData = ctx.getImageData(0, 0, size.x, size.y);
    const data = imgData.data;
    const grad = this.gradientCanvas;
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3];
      if (a > 0) {
        const gIdx = a * 4;
        data[i] = grad[gIdx];
        data[i + 1] = grad[gIdx + 1];
        data[i + 2] = grad[gIdx + 2];
        data[i + 3] = Math.min(220, Math.round(a * 1.15));
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

export class MapaOrigemDestinoController {
  private map: L.Map | null = null;
  private currentTileLayer: L.TileLayer | null = null;
  private statesLayer: L.GeoJSON | null = null;
  private ibgeMuniLayer: L.GeoJSON | null = null;
  private arcsLayer: L.LayerGroup = L.layerGroup();
  private osrmRoadLayer: L.LayerGroup = L.layerGroup();
  private markersLayer: L.LayerGroup = L.layerGroup();
  private heatmapLayer: SimpleCanvasHeatmapLayer = new SimpleCanvasHeatmapLayer([]);

  private ibgeMeshCache: Map<string, any> = new Map();

  private currentUF: string = 'ALL';
  private currentMod: string = 'ALL';
  private maxRoutes: number = 45;
  private selectedPoloCod: string = 'ALL';
  private displayMode: 'routes' | 'heatmap' | 'both' = 'routes';
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
      maxZoom: 14,
      zoomControl: true
    });

    this.setBaseTileLayer('osm');
    this.renderBrazilStatesGeoJSON();
    this.arcsLayer.addTo(this.map);
    this.osrmRoadLayer.addTo(this.map);
    this.markersLayer.addTo(this.map);

    this.bindMapControls();
    this.updateView('ALL');
  }

  public setBaseTileLayer(providerKey: string): void {
    if (!this.map) return;
    const cfg = TILE_PROVIDERS[providerKey] || TILE_PROVIDERS.osm;
    if (this.currentTileLayer) {
      this.map.removeLayer(this.currentTileLayer);
    }
    this.currentTileLayer = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: 19
    }).addTo(this.map);
    this.currentTileLayer.bringToBack();
  }

  public invalidateSize(): void {
    if (this.map) {
      setTimeout(() => {
        this.map?.invalidateSize();
        this.heatmapLayer.redraw();
      }, 120);
    }
  }

  public setDisplayMode(mode: 'routes' | 'heatmap' | 'both'): void {
    this.displayMode = mode;
    const sel = document.getElementById('mapDisplayMode') as HTMLSelectElement | null;
    if (sel && sel.value !== mode) sel.value = mode;
    this.updateView();
  }

  public focusMunicipality(codMun6: string): void {
    if (!this.map || !window.MAPA_OD_SUS) return;
    const mun = window.MAPA_OD_SUS.municipios_ibge?.[codMun6];
    if (!mun) return;

    const [nome, uf, pcd, _rs, lat, lon] = mun;
    if (this.currentUF !== uf) {
      this.selectState(uf, false);
    }
    this.map.flyTo([lat, lon], 9, { duration: 0.85 });

    const polo = window.MAPA_OD_SUS.polos.find(p => p.cod === codMun6);
    if (polo) {
      this.selectedPoloCod = polo.cod;
      this.updateView();
      this.renderPoloDetailCard(polo);
      return;
    }

    const routes = (window.MAPA_OD_SUS.rotas_por_uf[uf] || []).filter(r => r.c_orig === codMun6);
    if (routes.length > 0) {
      const tot = routes.reduce((acc, r) => acc + r.prod + r.proc, 0);
      this.renderOriginDetailCard({
        cod: codMun6,
        nome,
        uf,
        pcd,
        destinos: routes,
        totalSaida: tot
      });
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
          weight: isSelected ? 2.2 : 0.9,
          fillColor: isSelected ? '#0284c7' : '#94a3b8',
          fillOpacity: isSelected ? 0.04 : 0.02
        };
      },
      onEachFeature: (feature, layer) => {
        const sigla = feature?.properties?.sigla || '';
        const nome = feature?.properties?.nome || sigla;

        layer.bindTooltip(`<strong>${nome} (${sigla})</strong><br/>Clique para explorar este estado`, {
          sticky: true,
          direction: 'top'
        });

        layer.on('mouseover', () => {
          if (this.currentUF !== sigla) {
            (layer as L.Path).setStyle({ weight: 2, color: '#0284c7', fillOpacity: 0.09 });
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

  private async loadIbgeMunicipalMeshForState(uf: string): Promise<void> {
    if (!this.map) return;
    if (this.ibgeMuniLayer) {
      this.map.removeLayer(this.ibgeMuniLayer);
      this.ibgeMuniLayer = null;
    }

    if (uf === 'ALL' || !UF_IBGE_CODE[uf]) return;

    const ibgeCode = UF_IBGE_CODE[uf];
    try {
      let geojsonData = this.ibgeMeshCache.get(uf);
      if (!geojsonData) {
        const url = `https://servicodados.ibge.gov.br/api/v3/malhas/estados/${ibgeCode}?formato=application/vnd.geo+json&qualidade=minima&intrarregiao=municipio`;
        const resp = await fetch(url);
        if (!resp.ok) return;
        geojsonData = await resp.json();
        this.ibgeMeshCache.set(uf, geojsonData);
      }

      if (this.currentUF !== uf) return;

      const payload = window.MAPA_OD_SUS;
      const munDict = payload?.municipios_ibge || {};
      const polosSet = new Set((payload?.polos || []).filter(p => p.uf === uf).map(p => p.cod));
      const allUfRoutes = payload?.rotas_por_uf[uf] || [];

      const origensMap = new Map<string, RotaOD[]>();
      allUfRoutes.forEach(r => {
        if (!origensMap.has(r.c_orig)) origensMap.set(r.c_orig, []);
        origensMap.get(r.c_orig)!.push(r);
      });

      this.ibgeMuniLayer = L.geoJSON(geojsonData, {
        style: feature => {
          const cod6 = String(feature?.properties?.codarea || '').slice(0, 6);
          if (polosSet.has(cod6)) {
            return { color: '#059669', weight: 1.5, fillColor: '#10b981', fillOpacity: 0.24 };
          }
          if (origensMap.has(cod6)) {
            return { color: '#0284c7', weight: 0.9, fillColor: '#38bdf8', fillOpacity: 0.12 };
          }
          return { color: '#94a3b8', weight: 0.5, fillColor: '#cbd5e1', fillOpacity: 0.04 };
        },
        onEachFeature: (feature, layer) => {
          const cod7 = String(feature?.properties?.codarea || '');
          const cod6 = cod7.slice(0, 6);
          const meta = munDict[cod6];
          const nomeMun = meta ? meta[0] : `Município ${cod7}`;
          const pcdMun = meta ? meta[2] : 0;
          const rsMun = meta ? meta[3] : '—';
          const isPolo = polosSet.has(cod6);
          const rotasSaida = origensMap.get(cod6) || [];

          const roleBadge = isPolo
            ? `<span style="color:#059669;font-weight:700;">★ Polo de Atendimento</span>`
            : rotasSaida.length > 0
            ? `<span style="color:#0284c7;font-weight:700;">● Origem (${rotasSaida.length} destino[s])</span>`
            : `<span style="color:#64748b;">Município</span>`;

          layer.bindTooltip(
            `<div style="font-size:12px;line-height:1.4;">
              ${roleBadge}<br/>
              <strong>${nomeMun} (${uf})</strong><br/>
              Região: ${rsMun} • PcD (2022): <strong>${fmtInt.format(pcdMun)}</strong>
            </div>`,
            { sticky: true, direction: 'top' }
          );

          layer.on('mouseover', () => {
            (layer as L.Path).setStyle({ weight: 2, fillOpacity: 0.32 });
          });

          layer.on('mouseout', () => {
            this.ibgeMuniLayer?.resetStyle(layer as L.Path);
          });

          layer.on('click', (e: L.LeafletMouseEvent) => {
            L.DomEvent.stopPropagation(e);
            if (isPolo && payload) {
              const poloObj = payload.polos.find(p => p.cod === cod6);
              if (poloObj) {
                this.selectedPoloCod = this.selectedPoloCod === cod6 ? 'ALL' : cod6;
                const selPolo = document.getElementById('mapSelectPolo') as HTMLSelectElement | null;
                if (selPolo) selPolo.value = this.selectedPoloCod;
                this.updateView();
                this.renderPoloDetailCard(poloObj);
                return;
              }
            }
            if (rotasSaida.length > 0) {
              const totSaida = rotasSaida.reduce((acc, r) => acc + r.prod + r.proc, 0);
              this.renderOriginDetailCard({
                cod: cod6,
                nome: nomeMun,
                uf,
                pcd: pcdMun,
                destinos: rotasSaida,
                totalSaida: totSaida
              });
            }
          });
        }
      }).addTo(this.map);

      this.ibgeMuniLayer.bringToBack();
      this.statesLayer?.bringToBack();
    } catch (_err) {
      // Fallback silencioso
    }
  }

  public selectState(uf: string, triggerFly = true): void {
    this.currentUF = uf;
    this.selectedPoloCod = 'ALL';
    this.osrmRoadLayer.clearLayers();

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
        weight: isSelected ? 2.2 : 0.9,
        fillColor: isSelected ? '#0284c7' : '#94a3b8',
        fillOpacity: isSelected ? 0.04 : 0.02
      };
    });

    if (this.map && triggerFly) {
      const payload = window.MAPA_OD_SUS;
      if (uf === 'ALL' || !payload?.uf_bounds[uf]) {
        this.map.flyTo([-14.5, -52.0], 4, { duration: 0.75 });
      } else {
        const b = payload.uf_bounds[uf];
        const padLat = Math.max(0.35, (b.max_lat - b.min_lat) * 0.14);
        const padLon = Math.max(0.35, (b.max_lon - b.min_lon) * 0.14);
        this.map.flyToBounds(
          [
            [b.min_lat - padLat, b.min_lon - padLon],
            [b.max_lat + padLat, b.max_lon + padLon]
          ],
          { duration: 0.8, maxZoom: 8 }
        );
      }
    }

    void this.loadIbgeMunicipalMeshForState(uf);
    this.updateView(uf);
  }

  private populatePoloDropdown(uf: string): void {
    const selPolo = document.getElementById('mapSelectPolo') as HTMLSelectElement | null;
    if (!selPolo || !window.MAPA_OD_SUS) return;

    const polos = window.MAPA_OD_SUS.polos.filter(p => uf === 'ALL' || p.uf === uf);
    selPolo.innerHTML = `<option value="ALL">Todos os Polos (${polos.length})</option>`;
    polos.slice(0, 80).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.cod;
      opt.textContent = `${p.nome} (${p.uf})`;
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

    const sorted = [...baseRoutes].sort((a, b) => {
      const volA = this.currentMod === 'ALL' ? a.prod + a.proc : a.mods[this.currentMod] || 0;
      const volB = this.currentMod === 'ALL' ? b.prod + b.proc : b.mods[this.currentMod] || 0;
      return volB - volA;
    });

    return sorted.slice(0, this.maxRoutes);
  }

  private buildHeatPoints(routes: RotaOD[]): HeatPoint[] {
    const payload = window.MAPA_OD_SUS;
    if (!payload) return [];

    const heatMapPts: HeatPoint[] = [];
    const polosFiltered = payload.polos.filter(
      p => (this.currentUF === 'ALL' || p.uf === this.currentUF) && (this.selectedPoloCod === 'ALL' || p.cod === this.selectedPoloCod)
    );

    const maxPoloVal = polosFiltered.reduce((m, p) => Math.max(m, p.total_itens), 1);

    polosFiltered.forEach(p => {
      const v = this.currentMod === 'ALL' ? p.total_itens : p.mods[this.currentMod] || 0;
      if (v > 0) {
        const w = Math.pow(v / maxPoloVal, 0.42);
        heatMapPts.push({ lat: p.lat, lon: p.lon, weight: Math.max(0.28, w) });
      }
    });

    // Also include origin municipalities as heat demand points
    const maxRouteVol = routes.reduce((m, r) => Math.max(m, r.prod + r.proc), 1);
    routes.forEach(r => {
      const v = this.currentMod === 'ALL' ? r.prod + r.proc : r.mods[this.currentMod] || 0;
      if (v > 0) {
        heatMapPts.push({
          lat: r.lat_o,
          lon: r.lon_o,
          weight: Math.max(0.18, Math.pow(v / maxRouteVol, 0.5) * 0.7)
        });
      }
    });

    return heatMapPts;
  }

  public updateView(_uf?: string): void {
    if (!this.map || !window.MAPA_OD_SUS) return;

    this.arcsLayer.clearLayers();
    this.osrmRoadLayer.clearLayers();
    this.markersLayer.clearLayers();

    const routes = this.getActiveRoutes();
    const polosMap = new Map<string, PoloOD>();
    window.MAPA_OD_SUS.polos.forEach(p => polosMap.set(p.cod, p));

    // Toggle Heatmap Layer
    if (this.displayMode === 'heatmap' || this.displayMode === 'both') {
      const pts = this.buildHeatPoints(routes);
      this.heatmapLayer.setPoints(pts);
      if (!this.map.hasLayer(this.heatmapLayer)) {
        this.heatmapLayer.addTo(this.map);
      }
    } else if (this.map.hasLayer(this.heatmapLayer)) {
      this.map.removeLayer(this.heatmapLayer);
    }

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

    const drawRoutes = this.displayMode === 'routes' || this.displayMode === 'both';

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

      if (!drawRoutes) return;

      const latlngs = getCurvedLatLngs(r.lat_o, r.lon_o, r.lat_d, r.lon_d);
      const weight = Math.max(1.8, Math.min(6.0, 1.8 + (vol / maxVol) * 4.2));
      const color = getRouteColor(r.dist_km);

      const polyline = L.polyline(latlngs, {
        color,
        weight,
        opacity: 0.78,
        className: 'od-flow-arc'
      });

      const arrowMarker = createArrowheadMarker(latlngs, color, weight, 0.72);

      polyline.bindTooltip(
        `<div style="font-size:12px;line-height:1.45;">
          <strong>${r.n_orig} (${r.uf_orig}) → ${r.n_dest} (${r.uf_dest})</strong><br/>
          Distância: <strong>${fmtDec1.format(r.dist_km)} km</strong> • Itens: <strong>${fmtInt.format(vol)}</strong>
        </div>`,
        { sticky: true }
      );

      polyline.on('mouseover', () => {
        polyline.setStyle({ weight: weight + 2, opacity: 1.0 });
        arrowMarker?.setZIndexOffset(500);
      });
      polyline.on('mouseout', () => {
        polyline.setStyle({ weight, opacity: 0.78 });
        arrowMarker?.setZIndexOffset(0);
      });
      polyline.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        void this.renderRouteDetailCardWithOSRM(r);
      });

      this.arcsLayer.addLayer(polyline);
      if (arrowMarker) {
        this.arcsLayer.addLayer(arrowMarker);
      }
    });

    if (drawRoutes) {
      activeOrigins.forEach(orig => {
        if (activeDests.has(orig.cod)) return;

        const radius = Math.max(4.2, Math.min(9.0, 4.2 + Math.log10(orig.totalSaida + 1) * 1.3));
        const marker = L.circleMarker([orig.lat, orig.lon], {
          radius,
          fillColor: '#0284c7',
          color: '#ffffff',
          weight: 1.4,
          fillOpacity: 0.9
        });

        marker.bindTooltip(
          `<div style="font-size:12px;">
            <span style="color:#0284c7;font-weight:700;">● Origem (Moradia)</span><br/>
            <strong>${orig.nome} (${orig.uf})</strong> • ${fmtInt.format(orig.totalSaida)} itens
          </div>`,
          { direction: 'top' }
        );

        marker.on('click', (e: L.LeafletMouseEvent) => {
          L.DomEvent.stopPropagation(e);
          this.renderOriginDetailCard(orig);
        });

        this.markersLayer.addLayer(marker);
      });

      activeDests.forEach(cDest => {
        const polo = polosMap.get(cDest);
        if (!polo) return;

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
          weight: 2,
          fillOpacity: 1
        });

        hubMarker.bindTooltip(
          `<div style="font-size:12px;">
            <span style="color:#059669;font-weight:700;">★ Polo de Atendimento</span><br/>
            <strong>${polo.nome} (${polo.uf})</strong> • +${polo.mun_atendidos} cidades
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
    }

    this.renderStateOverviewCard(routes, activeOrigins.size, activeDests.size);
  }

  private async renderRouteDetailCardWithOSRM(r: RotaOD): Promise<void> {
    this.renderRouteDetailCard(r, { loading: true });
    this.osrmRoadLayer.clearLayers();

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${r.lon_o},${r.lat_o};${r.lon_d},${r.lat_d}?overview=full&geometries=geojson`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadKm = route.distance / 1000.0;
        const durationStr = formatDurationSeconds(route.duration);

        const roadGeo = L.geoJSON(route.geometry, {
          style: { color: '#4f46e5', weight: 4.2, opacity: 0.95 }
        });
        roadGeo.bindTooltip(
          `<strong>Rota Rodoviária:</strong> ${fmtDec1.format(roadKm)} km (~${durationStr})`,
          { sticky: true }
        );
        this.osrmRoadLayer.addLayer(roadGeo);

        this.renderRouteDetailCard(r, { loading: false, roadKm, durationStr });
        return;
      }
    } catch (_e) {
      // Sem rodovia contínua
    }

    this.renderRouteDetailCard(r, { loading: false, noRoad: true });
  }

  private renderStateOverviewCard(routes: RotaOD[], nOrigens: number, nPolos: number): void {
    const panel = document.getElementById('mapInspectorPanel');
    if (!panel) return;

    const totalItens = routes.reduce((acc, r) => acc + r.prod + r.proc, 0);
    const distPond =
      totalItens > 0
        ? routes.reduce((acc, r) => acc + r.dist_km * (r.prod + r.proc), 0) / totalItens
        : 0;

    const ufLabel = this.currentUF === 'ALL' ? 'Brasil — Principais Rotas' : `Estado: ${this.currentUF}`;

    const topListHtml = routes
      .slice(0, 6)
      .map(
        (r, i) => `
      <div class="od-mini-route" data-route-idx="${i}" style="padding:10px 12px;border:1px solid var(--border-light);border-radius:8px;background:var(--bg-hover);cursor:pointer;">
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
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--primary);letter-spacing:0.05em;">Deslocamento de Pacientes</div>
        <h4 style="font-size:16px;font-weight:700;margin-top:2px;">${ufLabel}</h4>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
        <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Cidades de Origem</div>
          <div style="font-size:18px;font-weight:700;color:var(--primary);">${fmtInt.format(nOrigens)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Polos de Destino</div>
          <div style="font-size:18px;font-weight:700;color:var(--emerald);">${fmtInt.format(nPolos)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Distância Média</div>
          <div style="font-size:18px;font-weight:700;color:var(--amber);">${fmtDec1.format(distPond)} km</div>
        </div>
        <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Itens nas Rotas</div>
          <div style="font-size:18px;font-weight:700;">${fmtInt.format(totalItens)}</div>
        </div>
      </div>

      <div style="font-size:12px;font-weight:600;color:var(--text-main);margin-bottom:8px;">Principais Rotas (clique para detalhar):</div>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:310px;overflow-y:auto;">
        ${topListHtml || '<div style="font-size:12px;color:var(--text-muted);">Nenhuma rota encontrada para este filtro.</div>'}
      </div>
    `;

    panel.querySelectorAll('.od-mini-route').forEach(el => {
      el.addEventListener('click', () => {
        const idx = Number(el.getAttribute('data-route-idx') || 0);
        const r = routes[idx];
        if (r) {
          void this.renderRouteDetailCardWithOSRM(r);
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

  private renderRouteDetailCard(
    r: RotaOD,
    osrmInfo?: { loading?: boolean; roadKm?: number; durationStr?: string; noRoad?: boolean }
  ): void {
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

    let osrmBoxHtml = '';
    if (osrmInfo?.loading) {
      osrmBoxHtml = `<div style="font-size:12px;padding:9px 12px;border-radius:8px;background:var(--indigo-soft);color:var(--indigo);margin-bottom:12px;">Calculando trajeto rodoviário...</div>`;
    } else if (osrmInfo?.roadKm && osrmInfo?.durationStr) {
      osrmBoxHtml = `
        <div style="font-size:12px;padding:10px 12px;border-radius:8px;background:var(--indigo-soft);color:var(--indigo);margin-bottom:12px;">
          <strong>🛣️ Trajeto por Rodovia:</strong> ${fmtDec1.format(osrmInfo.roadKm)} km (~${osrmInfo.durationStr})
        </div>
      `;
    } else if (osrmInfo?.noRoad) {
      osrmBoxHtml = `
        <div style="font-size:12px;padding:9px 12px;border-radius:8px;background:var(--amber-soft);color:var(--amber);margin-bottom:12px;">
          <strong>⛴️ Trecho Fluvial / Aéreo:</strong> Distância linear de ${fmtDec1.format(r.dist_km)} km.
        </div>
      `;
    }

    panel.innerHTML = `
      <div style="border-bottom:1px solid var(--border-light);padding-bottom:12px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="tag tag-prod">Rota de Atendimento</span>
          <button class="btn" id="btnBackToOverview" style="padding:3px 9px;font-size:11px;">← Voltar</button>
        </div>
        <h4 style="font-size:15px;font-weight:700;margin-top:8px;">
          ${r.n_orig} (${r.uf_orig}) → ${r.n_dest} (${r.uf_dest})
        </h4>
      </div>

      ${osrmBoxHtml}

      <div class="clean-list" style="margin-bottom:14px;">
        <div class="clean-list-item">
          <div>
            <span style="font-size:11px;color:var(--primary);font-weight:700;">● ORIGEM (MORADIA)</span>
            <div><strong>${r.n_orig} (${r.uf_orig})</strong></div>
            <div style="font-size:11.5px;color:var(--text-muted);">PcD (Censo 2022): <strong>${fmtInt.format(r.pcd_o)}</strong></div>
          </div>
        </div>
        <div class="clean-list-item">
          <div>
            <span style="font-size:11px;color:var(--emerald);font-weight:700;">★ DESTINO (POLO SUS)</span>
            <div><strong>${r.n_dest} (${r.uf_dest})</strong></div>
            <div style="font-size:11.5px;color:var(--text-muted);">Distância linear: <strong>${fmtDec1.format(r.dist_km)} km</strong></div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">
        <div style="background:var(--bg-subtle);padding:8px 10px;border-radius:8px;">
          <div style="font-size:10.5px;color:var(--text-muted);">Equipamentos</div>
          <div style="font-size:14px;font-weight:700;">${fmtInt.format(r.prod)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:8px 10px;border-radius:8px;">
          <div style="font-size:10.5px;color:var(--text-muted);">Adaptações</div>
          <div style="font-size:14px;font-weight:700;">${fmtInt.format(r.proc)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:8px 10px;border-radius:8px;">
          <div style="font-size:10.5px;color:var(--text-muted);">Valor SUS</div>
          <div style="font-size:12.5px;font-weight:700;">${fmtBRL.format(r.val)}</div>
        </div>
      </div>

      <div style="font-size:12px;font-weight:600;margin-bottom:6px;">Recursos buscados nesta rota:</div>
      <div>${modsHtml}</div>
    `;

    document.getElementById('btnBackToOverview')?.addEventListener('click', () => {
      this.osrmRoadLayer.clearLayers();
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
        (r, idx) => `
      <div class="orig-dest-card" data-orig-dest-idx="${idx}" style="padding:9px 11px;border:1px solid var(--border-light);border-radius:8px;background:var(--bg-hover);cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;">
          <span>Vai para: <strong style="color:var(--emerald);">${r.n_dest} (${r.uf_dest})</strong></span>
          <span class="tag tag-zero">${fmtDec1.format(r.dist_km)} km</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">
          Equip.: <strong>${fmtInt.format(r.prod)}</strong> • Adaptações: <strong>${fmtInt.format(r.proc)}</strong>
        </div>
      </div>
    `
      )
      .join('');

    panel.innerHTML = `
      <div style="border-bottom:1px solid var(--border-light);padding-bottom:12px;margin-bottom:14px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="tag tag-prod">● Município de Origem</span>
          <button class="btn" id="btnBackToOverview" style="padding:3px 9px;font-size:11px;">← Voltar</button>
        </div>
        <h4 style="font-size:16px;font-weight:700;margin-top:8px;">${orig.nome} (${orig.uf})</h4>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
          PcD (Censo 2022): <strong>${fmtInt.format(orig.pcd)} moradores</strong>
        </div>
      </div>

      <div style="font-size:12.5px;margin-bottom:10px;">
        Destinos procurados pelos moradores (${fmtInt.format(orig.totalSaida)} itens):
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;max-height:340px;overflow-y:auto;">
        ${destsHtml}
      </div>
    `;

    panel.querySelectorAll('.orig-dest-card').forEach(el => {
      el.addEventListener('click', () => {
        const i = Number(el.getAttribute('data-orig-dest-idx') || 0);
        const r = orig.destinos[i];
        if (r) void this.renderRouteDetailCardWithOSRM(r);
      });
    });

    document.getElementById('btnBackToOverview')?.addEventListener('click', () => {
      this.osrmRoadLayer.clearLayers();
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
          <span class="tag tag-ok">★ Polo de Atendimento</span>
          <button class="btn" id="btnResetPoloFilter" style="padding:3px 9px;font-size:11px;">Todos os Polos</button>
        </div>
        <h4 style="font-size:16px;font-weight:700;margin-top:8px;">${polo.nome} (${polo.uf})</h4>
        <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Região: <strong>${polo.rs_nome}</strong></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">
        <div style="background:var(--bg-subtle);padding:9px 11px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Cidades Atendidas</div>
          <div style="font-size:16px;font-weight:700;color:var(--emerald);">+${fmtInt.format(polo.mun_atendidos)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:9px 11px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Raio Médio / Máx.</div>
          <div style="font-size:14px;font-weight:700;color:var(--amber);">${fmtDec1.format(polo.dist_media_km)} / ${fmtDec1.format(polo.dist_max_km)} km</div>
        </div>
        <div style="background:var(--bg-subtle);padding:9px 11px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Moradores Locais</div>
          <div style="font-size:14px;font-weight:700;">${fmtInt.format(polo.prod_local + polo.proc_local)}</div>
        </div>
        <div style="background:var(--bg-subtle);padding:9px 11px;border-radius:8px;">
          <div style="font-size:11px;color:var(--text-muted);">Pacientes de Fora</div>
          <div style="font-size:14px;font-weight:700;color:var(--primary);">${fmtInt.format(polo.prod_ext + polo.proc_ext)}</div>
        </div>
      </div>

      <div style="font-size:12px;font-weight:600;margin-bottom:6px;">Recursos fornecidos neste polo:</div>
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

    document.getElementById('mapDisplayMode')?.addEventListener('change', e => {
      this.displayMode = (e.target as HTMLSelectElement).value as 'routes' | 'heatmap' | 'both';
      this.updateView();
    });

    document.getElementById('mapSelectTileStyle')?.addEventListener('change', e => {
      this.setBaseTileLayer((e.target as HTMLSelectElement).value);
    });

    document.getElementById('btnMapResetBrazil')?.addEventListener('click', () => {
      this.selectState('ALL', true);
      if (this.onStateSelectCallback) {
        this.onStateSelectCallback('ALL');
      }
    });
  }
}
