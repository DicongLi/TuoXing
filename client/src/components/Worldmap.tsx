import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// ✅ 改进 1: 使用在线 CDN 图片，解决 "Cannot find module ...png" 的报错
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Custom Icons for different types
const getIcon = (type: string) => {
  // ✅ 改进 2: 安全检查，防止 type 为空时崩溃
  const t = (type || '').toLowerCase();

  const colors: Record<string, string> = {
    hq: '#ef4444',          // Red
    headquarters: '#ef4444',
    branch: '#3b82f6',      // Blue (Branch)
    subsidiary: '#10b981',  // Green
    inactive: '#9ca3af',    // Gray
    dissolved: '#9ca3af',
    customer: '#6366f1',    // Indigo (Fallback)
    supplier: '#f59e0b',    // Amber (Fallback)
    both: '#ec4899',        // Pink (Fallback)
  };

  const color = colors[t] || '#10b981'; // 默认绿色

  return L.divIcon({
    className: 'custom-icon',
    html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
    popupAnchor: [0, -6]
  });
};

export interface MapMarker {
  id: number;
  name: string;
  country: string;
  city?: string;
  latitude: number;
  longitude: number;
  // ✅ 改进 3: 放宽类型定义，避免 TS 报错
  type: string;
}

interface WorldMapProps {
  markers: MapMarker[];
  onMarkerClick?: (marker: MapMarker) => void;
  height?: number;
}

function MapUpdater({ markers }: { markers: MapMarker[] }) {
  const map = useMap();

  useEffect(() => {
    if (markers.length > 0) {
      try {
        const group = L.featureGroup(markers.map(m => L.marker([m.latitude, m.longitude])));
        map.fitBounds(group.getBounds(), { padding: [50, 50], maxZoom: 12 });
      } catch (e) {
        console.warn("Map bounds error:", e);
      }
    }
  }, [markers, map]);

  return null;
}

export default function WorldMap({ markers, onMarkerClick, height = 450 }: WorldMapProps) {
  // ✅ 改进 4: 过滤掉无效坐标，防止地图组件报错
  const validMarkers = markers.filter(m =>
    m.latitude != null &&
    m.longitude != null &&
    !isNaN(m.latitude) &&
    !isNaN(m.longitude)
  );

  return (
    <div style={{ height: `${height}px`, width: '100%', borderRadius: '0.5rem', overflow: 'hidden', zIndex: 0 }}>
      <MapContainer
        center={[20, 0]}
        zoom={2}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <MapUpdater markers={validMarkers} />

        {validMarkers.map((marker) => (
          <Marker
            key={marker.id}
            position={[marker.latitude, marker.longitude]}
            icon={getIcon(marker.type)}
            eventHandlers={{
              click: () => onMarkerClick && onMarkerClick(marker),
            }}
          >
            <Popup>
              <div className="text-sm">
                <strong className="block mb-1">{marker.name}</strong>
                <span className="text-xs text-muted-foreground capitalize" style={{
                    color: (() => { const h = getIcon(marker.type).options.html; return typeof h === "string" ? h.match(/background-color: (.*?);/)?.[1] : undefined; })()
                }}>
                    {/* 安全显示类型 */}
                    {(marker.type || 'Unknown').toUpperCase()}
                </span>
                <br />
                <span className="text-xs">{marker.city ? `${marker.city}, ` : ''}{marker.country}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}