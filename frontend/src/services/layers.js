/**
 * Layer configuration and legends for LankaSat Live
 */

export const LAYER_CONFIG = {
  S1_VV: {
    id: 'S1_VV',
    name: 'Sentinel-1 VV',
    description: 'Radar VV polarization',
    category: 'radar',
    legend: [
      { color: '#000000', label: 'Low backscatter' },
      { color: '#666666', label: 'Medium backscatter' },
      { color: '#ffffff', label: 'High backscatter' }
    ]
  },
  S1_VH: {
    id: 'S1_VH',
    name: 'Sentinel-1 VH',
    description: 'Radar VH polarization',
    category: 'radar',
    legend: [
      { color: '#000000', label: 'Low backscatter' },
      { color: '#666666', label: 'Medium backscatter' },
      { color: '#ffffff', label: 'High backscatter' }
    ]
  },
  S1_FLOOD: {
    id: 'S1_FLOOD',
    name: 'Flood Detection',
    description: 'Enhanced VV+VH for flood visualization',
    category: 'radar',
    legend: [
      { color: '#000066', label: 'Potential water/flood' },
      { color: '#663300', label: 'Land' },
      { color: '#999999', label: 'Urban/structures' }
    ]
  },
  S2_TRUE_COLOR: {
    id: 'S2_TRUE_COLOR',
    name: 'True Color',
    description: 'Natural color RGB - Shows actual appearance',
    category: 'optical',
    legend: [
      { color: '#228B22', label: 'Healthy vegetation' },
      { color: '#8B4513', label: 'Muddy/sediment water' },
      { color: '#CD853F', label: 'Flooded areas (brown)' },
      { color: '#4682B4', label: 'Clear water' },
      { color: '#D2B48C', label: 'Wet soil / saturated' },
      { color: '#808080', label: 'Urban / built-up' },
      { color: '#FFFFFF', label: 'Clouds' }
    ]
  },
  S2_FALSE_COLOR: {
    id: 'S2_FALSE_COLOR',
    name: 'False Color',
    description: 'Vegetation highlighting',
    category: 'optical',
    legend: [
      { color: '#ff0000', label: 'Healthy vegetation' },
      { color: '#00ff00', label: 'Stressed vegetation' },
      { color: '#0000ff', label: 'Water' }
    ]
  },
  S2_NDVI: {
    id: 'S2_NDVI',
    name: 'NDVI',
    description: 'Vegetation index',
    category: 'index',
    legend: [
      { color: '#cc3333', label: 'No vegetation (< 0)' },
      { color: '#e6cc66', label: 'Sparse (0-0.2)' },
      { color: '#cce666', label: 'Light (0.2-0.4)' },
      { color: '#66cc33', label: 'Moderate (0.4-0.6)' },
      { color: '#1a8033', label: 'Dense (> 0.6)' }
    ]
  },
  S2_NDWI: {
    id: 'S2_NDWI',
    name: 'NDWI',
    description: 'Water detection index',
    category: 'index',
    legend: [
      { color: '#1a4de6', label: 'Water (> 0.3)' },
      { color: '#4d80e6', label: 'Wet (0.1-0.3)' },
      { color: '#8099b3', label: 'Moist (0-0.1)' },
      { color: '#998066', label: 'Dry (< 0)' }
    ]
  }
};

export const LAYER_CATEGORIES = {
  radar: {
    name: 'Sentinel-1 Radar',
    icon: '📡',
    description: 'SAR imagery, works through clouds'
  },
  optical: {
    name: 'Sentinel-2 Optical',
    icon: '🛰️',
    description: 'Multispectral imagery'
  },
  index: {
    name: 'Derived Indices',
    icon: '📊',
    description: 'Calculated from spectral bands'
  }
};

export const SRI_LANKA_CONFIG = {
  center: [7.8731, 80.7718],
  bounds: {
    north: 10.1,
    south: 5.9,
    east: 82.2,
    west: 79.4
  },
  defaultZoom: 7,
  minZoom: 7,
  maxZoom: 15
};

export default {
  LAYER_CONFIG,
  LAYER_CATEGORIES,
  SRI_LANKA_CONFIG
};
