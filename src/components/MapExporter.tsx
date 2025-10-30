import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Download, Square, Hand, Trash2, ZoomIn, ZoomOut, Info, Palette, Pentagon } from 'lucide-react';
import { toast } from 'sonner';

interface Bounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface MapStyle {
  name: string;
  url: string;
  attribution: string;
}

const STADIA_API_KEY = (import.meta as any).env?.VITE_STADIA_API_KEY as string | undefined;

const MAP_STYLES: Record<string, MapStyle> = {
  standard: {
    name: 'Estándar',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors'
  },
  humanitarian: {
    name: 'Humanitario (Claro)',
    url: 'https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, Tiles style by Humanitarian OpenStreetMap Team'
  },
  toner: {
    name: 'Blanco y Negro',
    url: STADIA_API_KEY
      ? `https://tiles.stadiamaps.com/tiles/stamen_toner/{z}/{x}/{y}.png?api_key=${STADIA_API_KEY}`
      : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: STADIA_API_KEY
      ? '© Stamen Design, © OpenStreetMap contributors, © Stadia Maps'
      : '© OpenStreetMap contributors, © CARTO'
  },
  watercolor: {
    name: 'Acuarela',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_watercolor/{z}/{x}/{y}.jpg',
    attribution: '© Stamen Design, © OpenStreetMap contributors'
  },
  terrain: {
    name: 'Terreno',
    url: 'https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}.png',
    attribution: '© Stamen Design, © OpenStreetMap contributors'
  },
  cartodb_light: {
    name: 'Claro (CartoDB)',
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CARTO'
  },
  cartodb_dark: {
    name: 'Oscuro (CartoDB)',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CARTO'
  },
  cartodb_voyager: {
    name: 'Voyager (Colores suaves)',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © CARTO'
  }
};

export function MapExporter() {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDrawingPolygon, setIsDrawingPolygon] = useState(false);
  const [selectedBounds, setSelectedBounds] = useState<Bounds | null>(null);
  const [polygonPoints, setPolygonPoints] = useState<Array<[number, number]>>([]);
  const [zoom, setZoom] = useState([15]);
  const [exportZoom, setExportZoom] = useState([18]);
  const [mapStyle, setMapStyle] = useState<string>('standard');
  const [isMapReady, setIsMapReady] = useState(false);
  const selectionRectRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const tempPolygonMarkersRef = useRef<any[]>([]);

  useEffect(() => {
    const loadMap = async () => {
      const L = (await import('leaflet')).default;
      
      // Fix for default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      if (mapContainerRef.current && !mapRef.current) {
        // Center on Zaragoza
        const map = L.map(mapContainerRef.current).setView([41.6488, -0.8891], zoom[0]);

        // Add tile layer based on selected style
        const style = MAP_STYLES[mapStyle];
        tileLayerRef.current = L.tileLayer(style.url, {
          attribution: style.attribution,
          maxZoom: 19,
        }).addTo(map);

        mapRef.current = map;
        setIsMapReady(true);

        // Update zoom state when map zoom changes
        map.on('zoomend', () => {
          setZoom([map.getZoom()]);
        });

        // Warn if toner selected without Stadia key
        if (mapStyle === 'toner' && !STADIA_API_KEY) {
          toast.warning('Stadia API key no configurada. Usando alternativa CARTO para Blanco y Negro.');
        }
      }
    };

    loadMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (mapRef.current && isMapReady) {
      mapRef.current.setZoom(zoom[0]);
    }
  }, [zoom, isMapReady]);

  // Change map style when mapStyle changes
  useEffect(() => {
    const changeMapStyle = async () => {
      if (mapRef.current && tileLayerRef.current && isMapReady) {
        const L = (await import('leaflet')).default;
        
        // Remove old tile layer
        mapRef.current.removeLayer(tileLayerRef.current);
        
        // Add new tile layer
        const style = MAP_STYLES[mapStyle];
        tileLayerRef.current = L.tileLayer(style.url, {
          attribution: style.attribution,
          maxZoom: 19,
        }).addTo(mapRef.current);
        
        toast.success(`Estilo cambiado a: ${style.name}`);

        if (mapStyle === 'toner' && !STADIA_API_KEY) {
          toast.warning('Stadia API key no configurada. Usando alternativa CARTO para Blanco y Negro.');
        }
      }
    };
    
    changeMapStyle();
  }, [mapStyle, isMapReady]);

  const handleZoomIn = () => {
    if (mapRef.current) {
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const startSelection = async () => {
    if (!mapRef.current) return;

    const L = (await import('leaflet')).default;
    setIsSelecting(true);
    
    const map = mapRef.current;
    let startLatLng: any = null;
    
    const onMouseDown = (e: any) => {
      startLatLng = e.latlng;
      
      if (selectionRectRef.current) {
        map.removeLayer(selectionRectRef.current);
      }
      
      selectionRectRef.current = L.rectangle([startLatLng, startLatLng], {
        color: '#3b82f6',
        weight: 2,
        fillOpacity: 0.2,
      }).addTo(map);
    };
    
    const onMouseMove = (e: any) => {
      if (startLatLng && selectionRectRef.current) {
        selectionRectRef.current.setBounds([startLatLng, e.latlng]);
      }
    };
    
    const onMouseUp = (e: any) => {
      if (startLatLng) {
        const bounds = selectionRectRef.current.getBounds();
        setSelectedBounds({
          north: bounds.getNorth(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          west: bounds.getWest(),
        });
        
        toast.success('Área seleccionada correctamente');
      }
      
      map.off('mousedown', onMouseDown);
      map.off('mousemove', onMouseMove);
      map.off('mouseup', onMouseUp);
      setIsSelecting(false);
      map.dragging.enable();
    };
    
    map.dragging.disable();
    map.on('mousedown', onMouseDown);
    map.on('mousemove', onMouseMove);
    map.on('mouseup', onMouseUp);
  };

  const clearSelection = async () => {
    if (selectionRectRef.current && mapRef.current) {
      mapRef.current.removeLayer(selectionRectRef.current);
      selectionRectRef.current = null;
      setSelectedBounds(null);
      toast.info('Selección eliminada');
    }
  };

  const startDrawingPolygon = async () => {
    if (!mapRef.current) return;

    const L = (await import('leaflet')).default;
    setIsDrawingPolygon(true);
    setPolygonPoints([]);
    
    // Clear any existing temporary markers
    tempPolygonMarkersRef.current.forEach(marker => {
      mapRef.current.removeLayer(marker);
    });
    tempPolygonMarkersRef.current = [];
    
    const map = mapRef.current;
    const points: Array<[number, number]> = [];
    
    const onClick = (e: any) => {
      const latlng: [number, number] = [e.latlng.lat, e.latlng.lng];
      points.push(latlng);
      
      // Add a temporary marker
      const marker = L.circleMarker(latlng, {
        radius: 5,
        color: '#ef4444',
        fillColor: '#ef4444',
        fillOpacity: 1,
      }).addTo(map);
      
      tempPolygonMarkersRef.current.push(marker);
      
      // If we have at least 2 points, draw temporary polygon
      if (points.length >= 2) {
        if (polygonRef.current) {
          map.removeLayer(polygonRef.current);
        }
        
        polygonRef.current = L.polygon(points, {
          color: '#ef4444',
          weight: 5,
          fillOpacity: 0,
          fill: false,
        }).addTo(map);
      }
      
      toast.info(`Punto ${points.length} añadido. Clic derecho para finalizar.`);
    };
    
    const onContextMenu = (e: any) => {
      e.originalEvent.preventDefault();
      
      if (points.length < 3) {
        toast.error('Necesitas al menos 3 puntos para crear un polígono');
        return;
      }
      
      // Finalize polygon
      setPolygonPoints([...points]);
      
      // Remove temporary markers
      tempPolygonMarkersRef.current.forEach(marker => {
        map.removeLayer(marker);
      });
      tempPolygonMarkersRef.current = [];
      
      // Draw final polygon
      if (polygonRef.current) {
        map.removeLayer(polygonRef.current);
      }
      
      polygonRef.current = L.polygon(points, {
        color: '#ef4444',
        weight: 5,
        fillOpacity: 0,
        fill: false,
      }).addTo(map);
      
      map.off('click', onClick);
      map.off('contextmenu', onContextMenu);
      setIsDrawingPolygon(false);
      map.dragging.enable();
      
      toast.success('Polígono creado correctamente');
    };
    
    map.dragging.disable();
    map.on('click', onClick);
    map.on('contextmenu', onContextMenu);
  };

  const clearPolygon = async () => {
    if (polygonRef.current && mapRef.current) {
      mapRef.current.removeLayer(polygonRef.current);
      polygonRef.current = null;
      setPolygonPoints([]);
      
      // Clear any temporary markers
      tempPolygonMarkersRef.current.forEach(marker => {
        mapRef.current.removeLayer(marker);
      });
      tempPolygonMarkersRef.current = [];
      
      toast.info('Polígono eliminado');
    }
  };

  const exportToPNG = async () => {
    if (!selectedBounds || !mapRef.current) {
      toast.error('Por favor, selecciona un área primero');
      return;
    }

    try {
      const L = (await import('leaflet')).default;
      const domtoimage = (await import('dom-to-image')).default;
      
      const map = mapRef.current;
      
      // Save current view
      const currentZoom = map.getZoom();
      const currentCenter = map.getCenter();
      
      // Remove selection rectangle
      if (selectionRectRef.current) {
        map.removeLayer(selectionRectRef.current);
      }
      
      toast.info('Calculando mosaicos para el área seleccionada...');
      
      // Calculate the bounds
      const bounds = L.latLngBounds(
        [selectedBounds.south, selectedBounds.west],
        [selectedBounds.north, selectedBounds.east]
      );
      
      // Get map container size
      const containerSize = map.getSize();
      const tileWidth = containerSize.x;
      const tileHeight = containerSize.y;
      
      // Calculate how many tiles we need at the export zoom level
      const zoom = exportZoom[0];
      
      // Get pixel coordinates at the export zoom level
      const pixelBoundsMin = map.project(bounds.getSouthWest(), zoom);
      const pixelBoundsMax = map.project(bounds.getNorthEast(), zoom);
      
      const totalWidth = pixelBoundsMax.x - pixelBoundsMin.x;
      const totalHeight = pixelBoundsMin.y - pixelBoundsMax.y; // Y is inverted
      
      // Calculate number of tiles needed
      const tilesX = Math.ceil(totalWidth / tileWidth);
      const tilesY = Math.ceil(totalHeight / tileHeight);
      const totalTiles = tilesX * tilesY;
      
      toast.info(`Generando ${totalTiles} mosaicos (${tilesX}×${tilesY})...`);
      
      // Create canvas for final image
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(totalWidth);
      canvas.height = Math.round(totalHeight);
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('No se pudo crear el contexto del canvas');
      }
      
      let tilesProcessed = 0;
      
      // Capture each tile
      for (let tileY = 0; tileY < tilesY; tileY++) {
        for (let tileX = 0; tileX < tilesX; tileX++) {
          tilesProcessed++;
          toast.info(`Procesando mosaico ${tilesProcessed} de ${totalTiles}...`);
          
          // Calculate center point for this tile
          const pixelX = pixelBoundsMin.x + (tileX * tileWidth) + (tileWidth / 2);
          const pixelY = pixelBoundsMax.y + (tileY * tileHeight) + (tileHeight / 2);
          
          const tileCenter = map.unproject([pixelX, pixelY], zoom);
          
          // Move map to this position
          map.setView(tileCenter, zoom, { animate: false });
          
          // Wait for tiles to load
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Capture this tile
          const dataUrl = await domtoimage.toPng(mapContainerRef.current!, {
            width: tileWidth,
            height: tileHeight,
            filter: (node: any) => {
              if (node.classList) {
                return !node.classList.contains('leaflet-control-container') &&
                       !node.classList.contains('leaflet-control');
              }
              return true;
            },
          });
          
          // Load image and draw to canvas
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = reject;
            image.src = dataUrl;
          });
          
          // Calculate position in final canvas
          const destX = tileX * tileWidth;
          const destY = tileY * tileHeight;
          
          ctx.drawImage(img, destX, destY);
        }
      }
      
      // Convert canvas to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Error al crear la imagen');
        }
        
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `mapa-zaragoza-${Date.now()}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        toast.success(`PNG exportado correctamente (${Math.round(totalWidth)}×${Math.round(totalHeight)} px)`);
      }, 'image/png');
      
      // Restore original view
      map.setView(currentCenter, currentZoom);
      
      // Restore selection rectangle
      if (selectedBounds) {
        selectionRectRef.current = L.rectangle([
          [selectedBounds.south, selectedBounds.west],
          [selectedBounds.north, selectedBounds.east]
        ], {
          color: '#3b82f6',
          weight: 2,
          fillOpacity: 0.2,
        }).addTo(map);
      }
      
    } catch (error) {
      console.error('Error exporting PNG:', error);
      toast.error('Error al exportar el PNG: ' + (error as Error).message);
      
      // Try to restore view
      if (mapRef.current && selectedBounds) {
        const L = (await import('leaflet')).default;
        const currentCenter = mapRef.current.getCenter();
        const currentZoom = mapRef.current.getZoom();
        mapRef.current.setView(currentCenter, currentZoom);
        
        if (!selectionRectRef.current) {
          selectionRectRef.current = L.rectangle([
            [selectedBounds.south, selectedBounds.west],
            [selectedBounds.north, selectedBounds.east]
          ], {
            color: '#3b82f6',
            weight: 2,
            fillOpacity: 0.2,
          }).addTo(mapRef.current);
        }
      }
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <Card className="w-80 h-full rounded-none border-l-0 border-t-0 border-b-0 flex flex-col">
        <div className="p-6 border-b">
          <h2 className="mb-2">Exportador de Mapas</h2>
          <p className="text-sm text-gray-600">Zaragoza, España</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Instructions */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600 mt-0.5" />
              <p className="text-sm">Cómo usar:</p>
            </div>
            <div className="text-xs text-gray-700 space-y-1.5 ml-6">
              <p>1. Navega por el mapa</p>
              <p>2. (Opcional) Dibuja un polígono</p>
              <p>3. Haz clic en "Seleccionar Área"</p>
              <p>4. Arrastra sobre el mapa para seleccionar</p>
              <p>5. Ajusta el zoom de exportación</p>
              <p>6. Haz clic en "Exportar a PNG"</p>
            </div>
          </div>

          {/* Map Style Selection */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Estilo del Mapa
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(MAP_STYLES).map(([key, style]) => (
                <Button
                  key={key}
                  onClick={() => setMapStyle(key)}
                  variant={mapStyle === key ? "default" : "outline"}
                  size="sm"
                  className="text-xs h-auto py-2 px-2"
                >
                  {style.name}
                </Button>
              ))}
            </div>
            <div className="text-xs text-gray-600">
              <p>Selecciona el estilo visual del mapa</p>
            </div>
          </div>

          {/* Zoom Navigation */}
          <div className="space-y-3">
            <Label>Zoom de Navegación: {zoom[0]}</Label>
            <div className="flex gap-2">
              <Button
                onClick={handleZoomOut}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <ZoomOut className="w-4 h-4 mr-1" />
                -
              </Button>
              <Button
                onClick={handleZoomIn}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <ZoomIn className="w-4 h-4 mr-1" />
                +
              </Button>
            </div>
            <Slider
              value={zoom}
              onValueChange={setZoom}
              min={10}
              max={19}
              step={1}
              className="w-full"
            />
          </div>

          {/* Selection Controls */}
          <div className="space-y-3">
            <Label>Control de Selección</Label>
            <div className="flex gap-2">
              <Button
                onClick={startSelection}
                disabled={isSelecting}
                variant={isSelecting ? "default" : "outline"}
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-2" />
                {isSelecting ? 'Seleccionando...' : 'Seleccionar Área'}
              </Button>
              <Button
                onClick={clearSelection}
                disabled={!selectedBounds}
                variant="outline"
                size="icon"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {selectedBounds && (
              <div className="p-2 bg-green-50 rounded border border-green-200 text-xs">
                <p className="text-green-800">✓ Área seleccionada</p>
              </div>
            )}
          </div>

          {/* Polygon Controls */}
          <div className="space-y-3">
            <Label>Dibujar Polígono</Label>
            <div className="flex gap-2">
              <Button
                onClick={startDrawingPolygon}
                disabled={isDrawingPolygon}
                variant={isDrawingPolygon ? "default" : "outline"}
                className="flex-1"
              >
                <Pentagon className="w-4 h-4 mr-2" />
                {isDrawingPolygon ? 'Dibujando...' : 'Dibujar Polígono'}
              </Button>
              <Button
                onClick={clearPolygon}
                disabled={polygonPoints.length === 0}
                variant="outline"
                size="icon"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            {isDrawingPolygon && (
              <div className="p-2 bg-blue-50 rounded border border-blue-200 text-xs">
                <p className="text-blue-800">Clic izquierdo: añadir puntos</p>
                <p className="text-blue-800">Clic derecho: finalizar</p>
              </div>
            )}
            {polygonPoints.length > 0 && !isDrawingPolygon && (
              <div className="p-2 bg-red-50 rounded border border-red-200 text-xs">
                <p className="text-red-800">✓ Polígono creado ({polygonPoints.length} puntos)</p>
              </div>
            )}
          </div>

          {/* Export Zoom Control */}
          <div className="space-y-3">
            <Label>Zoom de Exportación: {exportZoom[0]}</Label>
            <Slider
              value={exportZoom}
              onValueChange={setExportZoom}
              min={15}
              max={19}
              step={1}
              className="w-full"
            />
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Nivel 15-16: Calles principales</p>
              <p>• Nivel 17: Mayoría de calles</p>
              <p>• Nivel 18-19: TODAS las calles</p>
            </div>
          </div>

          {/* Export Preview */}
          {selectedBounds && (
            <div className="p-4 bg-gray-50 rounded-lg border">
              <p className="text-sm mb-3">📋 Configuración:</p>
              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Zoom:</span>
                  <span>Nivel {exportZoom[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Detalle:</span>
                  <span className="font-medium">
                    {exportZoom[0] >= 18 ? '⭐ Máximo' : exportZoom[0] >= 17 ? '✓ Alto' : '○ Medio'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Calles:</span>
                  <span>
                    {exportZoom[0] >= 18 ? 'Todas' : exportZoom[0] >= 17 ? 'Mayoría' : 'Principales'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export Button */}
        <div className="p-6 border-t space-y-3">
          <Button
            onClick={exportToPNG}
            disabled={!selectedBounds}
            className="w-full"
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            Exportar a PNG
          </Button>
          <p className="text-xs text-gray-500 text-center">
            Se generará una imagen PNG de alta calidad con todos los nombres de calles del área seleccionada
          </p>
        </div>
      </Card>

      {/* Map Container */}
      <div className="flex-1 relative bg-gray-200">
        <div 
          ref={mapContainerRef} 
          className="absolute inset-0"
        />
        
        {/* Map overlay instruction */}
        {!selectedBounds && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-lg shadow-lg border pointer-events-none z-[1000]">
            <p className="text-sm text-gray-700">
              👆 Usa el panel lateral para seleccionar un área del mapa
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
