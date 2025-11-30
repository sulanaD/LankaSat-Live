import { LAYER_CONFIG, LAYER_CATEGORIES } from '../services/layers';

function LayerSelector({ layers, selectedLayer, onLayerChange }) {
  // Group layers by category
  const groupedLayers = Object.values(LAYER_CONFIG).reduce((acc, layer) => {
    const category = layer.category || 'other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(layer);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <span>Layers</span>
      </h3>

      {Object.entries(groupedLayers).map(([categoryId, categoryLayers]) => {
        const category = LAYER_CATEGORIES[categoryId] || { name: categoryId, icon: '📦' };
        
        return (
          <div key={categoryId} className="space-y-2">
            {/* Category header */}
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>{category.icon}</span>
              <span>{category.name}</span>
            </div>

            {/* Layer buttons */}
            <div className="space-y-1">
              {categoryLayers.map((layer) => (
                <button
                  key={layer.id}
                  onClick={() => onLayerChange(layer.id)}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg transition-all duration-200
                    flex items-center justify-between group
                    ${selectedLayer === layer.id
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
                    }
                  `}
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {layer.name}
                    </div>
                    <div className={`text-xs truncate ${
                      selectedLayer === layer.id ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {layer.description}
                    </div>
                  </div>
                  
                  {/* Selected indicator */}
                  {selectedLayer === layer.id && (
                    <svg className="w-5 h-5 ml-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Layer info */}
      <div className="mt-4 p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400">
        <div className="flex items-start gap-2">
          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>
            <strong>Tip:</strong> Sentinel-1 radar works through clouds. Use it when Sentinel-2 optical imagery has cloud cover.
          </p>
        </div>
      </div>
    </div>
  );
}

export default LayerSelector;
