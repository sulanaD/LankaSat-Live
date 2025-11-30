function Legend({ layerConfig }) {
  if (!layerConfig || !layerConfig.legend) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span>Legend</span>
      </h3>

      <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
        {/* Layer name */}
        <div className="text-sm font-medium text-white border-b border-gray-700 pb-2 mb-2">
          {layerConfig.name}
        </div>

        {/* Legend items */}
        <div className="space-y-2">
          {layerConfig.legend.map((item, index) => (
            <div key={index} className="flex items-center gap-3">
              <div 
                className="w-5 h-5 rounded border border-gray-600 flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-gray-300">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Description */}
        {layerConfig.description && (
          <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-700">
            {layerConfig.description}
          </div>
        )}
      </div>
    </div>
  );
}

export default Legend;
