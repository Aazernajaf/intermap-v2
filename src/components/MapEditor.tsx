import { useEffect, useRef, useState, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import { Feature, EditorMode } from '../types';
import { ShopLabel } from './ShopLabel';

interface MapEditorProps {
  mode: EditorMode;
  mapStyle: 'real' | 'vectorial' | 'satellite';
  is3D: boolean;
  features: Feature[];
  currentPolygon: number[][];
  addPointToCurrentPolygon: (point: [number, number]) => void;
  addPointFeature: (point: [number, number]) => void;
  selectedFeatureId: string | null;
  setSelectedFeatureId: (id: string | null) => void;
  editingVertices: boolean;
  setEditingVertices: (v: boolean) => void;
  updateFeatureCoordinates: (id: string, coords: number[][]) => void;
  navId: string | null;
  selectedFloor: number;
  showRows: boolean;
}

export const MapEditor: React.FC<MapEditorProps> = ({
  mode, mapStyle, is3D, features, currentPolygon,
  addPointToCurrentPolygon, addPointFeature,
  selectedFeatureId, setSelectedFeatureId,
  editingVertices, setEditingVertices, updateFeatureCoordinates,
  navId, selectedFloor, showRows
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const deckRef = useRef<any>(null);
  const [viewState, setViewState] = useState({
    longitude: 49.7668731,
    latitude: 40.321267,
    zoom: 14.29,
    pitch: 45,
    bearing: 0,
    width: 0,
    height: 0
  });
  
  const [draggedVertexIndex, setDraggedVertexIndex] = useState<number | null>(null);
  const [snapPoint, setSnapPoint] = useState<[number, number] | null>(null);


  const deckGlobal = (window as any).deck;
  const { theme } = useTheme();

  // Contextual View State
  const navItem = useMemo(() => features.find(f => f.id === navId), [features, navId]);
  const isInternalView = !!navId;

  const modeRef = useRef(mode);
  const editingVerticesRef = useRef(editingVertices);
  const selectedFeatureIdRef = useRef(selectedFeatureId);
  const featuresRef = useRef(features);
  const updateCoordsRef = useRef(updateFeatureCoordinates);
  const draggedVertexRef = useRef(draggedVertexIndex);

  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { editingVerticesRef.current = editingVertices; }, [editingVertices]);
  useEffect(() => { selectedFeatureIdRef.current = selectedFeatureId; }, [selectedFeatureId]);
  useEffect(() => { featuresRef.current = features; }, [features]);
  useEffect(() => { updateCoordsRef.current = updateFeatureCoordinates; }, [updateFeatureCoordinates]);
  useEffect(() => { draggedVertexRef.current = draggedVertexIndex; }, [draggedVertexIndex]);

  useEffect(() => {
    if (!containerRef.current || !deckGlobal) return;
    const { Deck } = deckGlobal;

    deckRef.current = new Deck({
      parent: containerRef.current,
      initialViewState: viewState,
      controller: true,
      onViewStateChange: ({ viewState: next }: any) => {
        if (draggedVertexRef.current !== null) return; 
        setViewState(next);
      },
      getCursor: (info: any) => {
        if (info.pickingInfo?.object?.isVertex) return 'grabbing';
        if (info.pickingInfo?.object?.isMidpoint) return 'copy';
        if (info.isDragging) return 'grabbing';
        return 'grab';
      },
      
      onDragStart: (info: any) => {
        if (editingVerticesRef.current) {
          if (info.object?.isVertex) {
            setDraggedVertexIndex(info.object.vertexIndex);
            if (deckRef.current) deckRef.current.setProps({ controller: { dragPan: false } });
          } else if (info.object?.isMidpoint) {
            const selFeatId = selectedFeatureIdRef.current;
            if (selFeatId) {
              const feat = featuresRef.current.find(f => f.id === selFeatId);
              if (feat && feat.type === 'Polygon') {
                const coords = [...(feat.coordinates as number[][])];
                const insertIdx = info.object.index + 1;
                coords.splice(insertIdx, 0, info.coordinate);
                if (insertIdx === 0 || insertIdx === coords.length - 1) coords[coords.length - 1] = coords[0];
                updateCoordsRef.current(selFeatId, coords);
                setDraggedVertexIndex(insertIdx);
                if (deckRef.current) deckRef.current.setProps({ controller: { dragPan: false } });
              }
            }
          }
        }
      },
      onDrag: (info: any) => {
        const vIdx = draggedVertexRef.current;
        const selFeatId = selectedFeatureIdRef.current;
        if (vIdx !== null && selFeatId && info.coordinate) {
          const feat = featuresRef.current.find(f => f.id === selFeatId);
          if (feat && feat.type === 'Polygon') {
            const coords = [...(feat.coordinates as number[][])];
            coords[vIdx] = [info.coordinate[0], info.coordinate[1]];
            if (vIdx === 0) coords[coords.length - 1] = coords[0];
            updateCoordsRef.current(selFeatId, coords);
          }
        }
      },
      onDragEnd: () => {
        setDraggedVertexIndex(null);
        if (deckRef.current) deckRef.current.setProps({ controller: { dragPan: true } });
      },
      
      onHover: (info: any) => {
        if (modeRef.current === 'drawPolygon' && info.coordinate) {
          const currentPoint: [number, number] = [info.coordinate[0], info.coordinate[1]];
          const snapped = getNearestSnappableVertex(currentPoint, featuresRef.current);
          setSnapPoint(snapped);
        } else if (snapPoint) {
          setSnapPoint(null);
        }
      },

      onClick: (info: any) => {
        const isEditingVerts = editingVerticesRef.current;
        if (isEditingVerts) return;
        if (!info.coordinate) return;

        if (modeRef.current === 'drawPolygon' || modeRef.current === 'drawPath') {
          const currentPoint: [number, number] = [info.coordinate[0], info.coordinate[1]];
          const snapped = getNearestSnappableVertex(currentPoint, featuresRef.current);
          const finalPoint = snapped || currentPoint;
          addPointToCurrentPolygon(finalPoint);
        } else if (modeRef.current === 'drawPoint') {
          addPointFeature([info.coordinate[0], info.coordinate[1]]);
        } else if (modeRef.current === 'view' && !info.object) {
          setSelectedFeatureId(null);
          setEditingVertices(false);
        }
      },
      
      onContextMenu: (info: any) => {
        if (editingVerticesRef.current && info.object?.isVertex) {
          const selFeatId = selectedFeatureIdRef.current;
          if (selFeatId) {
            const feat = featuresRef.current.find(f => f.id === selFeatId);
            if (feat && feat.type === 'Polygon' && feat.coordinates.length > 4) {
              const coords = [...(feat.coordinates as number[][])];
              coords.splice(info.object.vertexIndex, 1);
              coords[coords.length - 1] = coords[0];
              updateCoordsRef.current(selFeatId, coords);
            }
          }
        }
      },
      layers: []
    });

    const updateSize = () => {
      if (containerRef.current) {
        const { offsetWidth, offsetHeight } = containerRef.current;
        setViewState(prev => ({ ...prev, width: offsetWidth, height: offsetHeight }));
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();

    return () => {
      window.removeEventListener('resize', updateSize);
      deckRef.current?.finalize();
      deckRef.current = null;
    };
  }, []);

  const getNearestSnappableVertex = (point: [number, number], features: Feature[], threshold: number = 0.0001) => {
    let nearest: [number, number] | null = null;
    let minDistance = threshold;
    features.forEach(f => {
      if (f.type === 'Polygon') {
        const coords = f.coordinates as number[][];
        coords.forEach(c => {
          const dist = Math.sqrt(Math.pow(point[0] - c[0], 2) + Math.pow(point[1] - c[1], 2));
          if (dist < minDistance) { minDistance = dist; nearest = [c[0], c[1]]; }
        });
      }
    });
    return nearest;
  };

  useEffect(() => {
    const { FlyToInterpolator } = deckGlobal || {};
    setViewState(prev => ({
      ...prev,
      pitch: is3D ? (isInternalView ? 60 : 45) : 0,
      transitionDuration: 800,
      transitionInterpolator: FlyToInterpolator ? new FlyToInterpolator() : undefined
    }));
  }, [is3D, isInternalView]);

  useEffect(() => {
    if (!selectedFeatureId || !deckRef.current || !deckGlobal) return;
    const feature = features.find(f => f.id === selectedFeatureId);
    if (!feature || feature.type !== 'Polygon') return;

    const { FlyToInterpolator, WebMercatorViewport } = deckGlobal;
    const coords = feature.coordinates as number[][];
    if (!coords || coords.length === 0) return;
    const validCoords = coords.filter(c => !isNaN(c[0]) && !isNaN(c[1]));
    if (validCoords.length === 0) return;

    if (draggedVertexIndex === null) {
      const lngs = validCoords.map(c => c[0]);
      const lats = validCoords.map(c => c[1]);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);

      if (maxLng - minLng < 0.00001 && maxLat - minLat < 0.00001) {
        setViewState(prev => ({ ...prev, longitude: minLng, latitude: minLat, zoom: 20, transitionDuration: 1000, transitionInterpolator: new FlyToInterpolator() }));
        return;
      }

      try {
        const viewport = new WebMercatorViewport(viewState);
        const { longitude, latitude, zoom } = viewport.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 100 });
        setViewState(prev => ({ ...prev, longitude, latitude, zoom: Math.min(zoom, isInternalView ? 21 : 18.5), pitch: isInternalView ? 60 : 45, transitionDuration: 1500, transitionInterpolator: new FlyToInterpolator() }));
      } catch (e) { console.warn(e); }
    }
  }, [selectedFeatureId]);

  // Visual Layers
  useEffect(() => {
    if (!deckRef.current || !deckGlobal) return;
    const { PolygonLayer, ScatterplotLayer, BitmapLayer, TileLayer, PathLayer, ScenegraphLayer } = deckGlobal;

    let tileUrl: string;
    if (mapStyle === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    } else if (theme === 'dark') {
      // Dark mode: use CartoDB Dark Matter for all non-satellite styles
      tileUrl = 'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    } else if (mapStyle === 'vectorial') {
      tileUrl = 'https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    } else {
      tileUrl = 'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }

    const selectedFeature = features.find(f => f.id === selectedFeatureId);
    const vertexHandles: any[] = [];
    const midpointHandles: any[] = [];
    if (editingVertices && selectedFeature?.type === 'Polygon') {
      const coords = selectedFeature.coordinates as number[][];
      const floor = selectedFeature.properties.floor || 1;
      const baseH = (floor - 1) * 4;
      const h = baseH + (selectedFeature.properties.height || 4) + 0.5;
      coords.slice(0, -1).forEach((c, i) => {
        vertexHandles.push({ position: [c[0], c[1], h], isVertex: true, vertexIndex: i, isSelected: i === draggedVertexIndex });
        const next = coords[i + 1];
        if (next) midpointHandles.push({ position: [(c[0] + next[0]) / 2, (c[1] + next[1]) / 2, h], isMidpoint: true, index: i });
      });
    }

    const visibleFeatures = isInternalView 
      ? features.filter(f => {
          if (f.id === navId) return true;
          if (f.properties.parentId !== navId) return false;
          
          if (navItem?.category === 'Sıra') {
            return f.category === 'Korpus';
          }
          if (navItem?.category === 'Korpus') {
            return f.category === 'Mağaza' && (f.properties.floor || 1) === selectedFloor;
          }
          return false;
        })
      : features.filter(f => {
          if (f.category === 'Korpus') return true;
          if (f.category === 'Sıra') return showRows;
          return false;
        });

    const layers = [
      new TileLayer({
        id: 'base-map', data: tileUrl, minZoom: 0, maxZoom: 19, opacity: isInternalView ? 0.2 : 1,
        renderSubLayers: (props: any) => {
          const { bbox: { west, south, east, north } } = props.tile;
          return new BitmapLayer(props, { data: null, image: props.data, bounds: [west, south, east, north] });
        }
      }),
      isInternalView && new PolygonLayer({
        id: 'internal-bg', data: [ { polygon: [[-180, -90], [180, -90], [180, 90], [-180, 90]] } ], getPolygon: (_: any) => _.polygon, pickable: false, 
        parameters: { 
          depthTest: false,
          depthWrite: false
        },
        getFillColor: () => {
          const hex = navItem?.properties.floorColors?.[selectedFloor] || '#f0f2f5';
          const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
          return [r, g, b, 200];
        },
        updateTriggers: { getFillColor: [navItem, selectedFloor] }
      }),
      new PolygonLayer({
        id: 'polygon-layer', data: visibleFeatures.filter(f => f.type === 'Polygon'), pickable: mode === 'view' && !editingVertices, stroked: true, filled: true, extruded: is3D, wireframe: true, lineWidthMinPixels: 1,
        getPolygon: (d: Feature) => d.coordinates as number[][],
        getElevation: (d: Feature) => (isInternalView && d.id === navId) ? 0.05 : (d.properties.height || 4),
        getBaseHeight: (d: Feature) => (d.category === 'Mağaza') ? ((d.properties.floor || 1) - 1) * 4 : 0,
        getFillColor: (d: Feature) => {
          if (d.category === 'Sıra') return d.properties.fillColor ? [...d.properties.fillColor, 30] : [59, 130, 246, 30]; 
          if (isInternalView && d.id === navId) return [255, 255, 255, 255];
          const isSelected = selectedFeatureId === d.id;
          const isCurrentFloor = !isInternalView || (d.properties.floor || 1) === selectedFloor;
          const alpha = isCurrentFloor ? 180 : 40;
          return isSelected ? [255, 255, 255, 200] : [...(d.properties.fillColor || d.properties.color || [200, 200, 200]), alpha];
        },
        getLineColor: (d: Feature) => {
          if (d.properties.strokeColor) return [...d.properties.strokeColor, 255];
          if (d.category === 'Sıra') return [59, 130, 246, 255];
          if (isInternalView && d.id === navId) return [59, 130, 246, 255];
          return selectedFeatureId === d.id ? [255, 255, 255, 255] : [0, 0, 0, 30];
        },
        getLineWidth: (d: Feature) => d.properties.strokeWidth || (d.category === 'Sıra' ? 3 : 1),
        onClick: (info: any) => { if (info.object && !editingVertices) setSelectedFeatureId(info.object.id); },
        parameters: { 
          depthTest: true, 
          polygonOffsetFill: true, 
          depthBias: 100, // Increase bias to avoid z-fighting with map tiles
          polygonOffset: [-2, -2] // Pull geometry forward
        },
        updateTriggers: { getFillColor: [selectedFeatureId, isInternalView, navId, selectedFloor], getLineColor: [selectedFeatureId, editingVertices, isInternalView], getElevation: [is3D, isInternalView], getBaseHeight: [selectedFloor] }
      }),
      new PathLayer({
        id: 'path-layer', 
        data: features.filter(f => f.type === 'Path'), 
        pickable: true, 
        widthMinPixels: 2, 
        getPath: (d: Feature) => d.coordinates as number[][], 
        getColor: (d: Feature) => d.properties.strokeColor || [100, 100, 100], 
        getWidth: (d: Feature) => d.properties.strokeWidth || 5,
        onClick: (info: any) => { if (info.object) setSelectedFeatureId(info.object.id); }
      }),
      vertexHandles.length > 0 && new ScatterplotLayer({ id: 'vertex-handles', data: vertexHandles, pickable: true, getPosition: (d: any) => d.position, getFillColor: (d: any) => d.isSelected ? [255, 100, 0, 255] : [59, 130, 246, 255], getLineColor: [255, 255, 255], lineWidthMinPixels: 2, stroked: true, getRadius: 10, radiusUnits: 'pixels', updateTriggers: { getFillColor: [draggedVertexIndex] } }),
      midpointHandles.length > 0 && new ScatterplotLayer({ id: 'midpoint-handles', data: midpointHandles, pickable: true, getPosition: (d: any) => d.position, getFillColor: [255, 255, 255, 150], getLineColor: [59, 130, 246], lineWidthMinPixels: 1, stroked: true, getRadius: 6, radiusUnits: 'pixels' }),
      (mode === 'drawPolygon' || mode === 'drawPath') && currentPolygon.length > 0 && new PathLayer({ id: 'preview-path', data: [{ path: (mode === 'drawPolygon' && currentPolygon.length > 2) ? [...currentPolygon, currentPolygon[0]] : currentPolygon }], getPath: (_: any) => _.path, getColor: [59, 130, 246, 150], getWidth: 2, widthMinPixels: 2, dashArray: [4, 4] }),
      mode === 'drawPolygon' && currentPolygon.length >= 3 && new PolygonLayer({ id: 'preview-fill', data: [{ coordinates: [...currentPolygon, currentPolygon[0]] }], getPolygon: (_: any) => _.coordinates, getFillColor: [59, 130, 246, 50], stroked: false, filled: true }),
      (mode === 'drawPolygon' || mode === 'drawPath') && currentPolygon.length > 0 && new ScatterplotLayer({ id: 'preview-points', data: currentPolygon, getPosition: (d: any) => d, getFillColor: [59, 130, 246], getRadius: 3, radiusMinPixels: 5 }),
      (mode === 'drawPolygon' || mode === 'drawPath') && snapPoint && new ScatterplotLayer({ id: 'snap-indicator', data: [{ position: snapPoint }], getPosition: (d: any) => d.position, getFillColor: [59, 130, 246, 200], getRadius: 8, radiusUnits: 'pixels', stroked: true, getLineColor: [255, 255, 255, 255], lineWidthMinPixels: 2 }),
      ...(['Tree', 'Car', 'Person'].map(mType => {
        const data = features.filter(f => f.type === 'Point' && (f.properties.modelType === mType || (!f.properties.modelType && mType === 'Tree')));
        if (data.length === 0) return null;
        
        let scenegraphUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SimpleInstancing/glTF/SimpleInstancing.gltf';
        let scale: [number, number, number] = [1, 1, 1];
        
        if (mType === 'Car') {
          scenegraphUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/CesiumMilkTruck/glTF-Embedded/CesiumMilkTruck.gltf';
          scale = [1, 1, 1];
        } else if (mType === 'Person') {
          scenegraphUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoxInterleaved/glTF/BoxInterleaved.gltf';
          scale = [0.5, 0.5, 0.5];
        }

        return new ScenegraphLayer({
          id: `decorations-${mType}`,
          data,
          scenegraph: scenegraphUrl,
          getPosition: (d: any) => [d.coordinates[0], d.coordinates[1], (d.properties.baseHeight || 0)],
          getOrientation: (d: any) => [0, -(d.properties.rotation || 0), 0],
          getScale: scale,
          sizeScale: 1,
          pickable: true,
          onClick: (info: any) => { if (info.object) setSelectedFeatureId(info.object.id); },
          updateTriggers: {
            getPosition: [features],
            getOrientation: [features]
          }
        });
      })).filter(Boolean)
    ].filter(Boolean);

    if (deckRef.current) deckRef.current.setProps({ layers, viewState });
  }, [features, mapStyle, is3D, mode, currentPolygon, selectedFeatureId, viewState, deckGlobal, editingVertices, draggedVertexIndex, navId, isInternalView, selectedFloor, theme]);

  // Labels Projection (Rich HTML Overlay)
  const labels = useMemo(() => {
    if (!deckGlobal || !viewState.width || viewState.zoom < 16.5) return [];
    const { WebMercatorViewport } = deckGlobal;
    const viewport = new WebMercatorViewport(viewState);
    
    return features
      .filter(f => f.id === selectedFeatureId && f.category === 'Mağaza')
      .filter(f => {
        if (!isInternalView) return true;
        return f.properties.parentId === navId && (f.properties.floor || 1) === selectedFloor;
      })
      .map(f => {
        const c = f.coordinates as number[][];
        if (!c || c.length === 0) return null;
        const floor = f.properties.floor || 1;
        const baseH = (floor - 1) * 4;
        const h = baseH + (f.properties.height || 4);
        const centerLng = c.reduce((a, p) => a + p[0], 0) / c.length;
        const centerLat = c.reduce((a, p) => a + p[1], 0) / c.length;
        const [x, y] = viewport.project([centerLng, centerLat, h]);
        
        // Hide if outside viewport
        if (x < 0 || x > viewState.width || y < 0 || y > viewState.height) return null;
        
        return (
          <ShopLabel 
            key={f.id} feature={f} x={x} y={y} zoom={viewState.zoom} 
            isSelected={selectedFeatureId === f.id} 
          />
        );
      }).filter(Boolean);
  }, [features, viewState, selectedFeatureId, navId, isInternalView, selectedFloor, deckGlobal]);

  return (
    <div ref={containerRef} className="relative w-full h-full" onContextMenu={(e) => e.preventDefault()}>
      {labels}
    </div>
  );
};
