import React, { useState } from 'react';
import { IPluginStatus } from '../../shared/types';
import { postMessage } from '../lib/vscodeApi';

function Toggle({
  checked, onChange, disabled, size = 'md',
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}): React.ReactElement {
  const track = size === 'sm' ? 'w-7 h-[16px]' : 'w-8 h-[18px]';
  const knob = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const translate = size === 'sm'
    ? (checked ? 'translate-x-[13px]' : 'translate-x-[2px]')
    : (checked ? 'translate-x-[15px]' : 'translate-x-[2px]');

  return (
    <button
      onClick={() => !disabled && onChange(!checked)}
      className={`relative ${track} rounded-full transition-colors flex-shrink-0 ${
        disabled ? 'opacity-40 cursor-not-allowed' :
        checked ? 'bg-blue-500' : 'bg-zinc-600'
      }`}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
    >
      <span className={`absolute top-[2px] ${knob} rounded-full bg-white shadow-sm transition-transform ${translate}`} />
    </button>
  );
}

interface PluginsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  plugins: IPluginStatus[];
}

export default function PluginsPanel({ isOpen, onClose, plugins }: PluginsPanelProps): React.ReactElement | null {
  const [expandedPlugins, setExpandedPlugins] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const toggleExpanded = (pluginId: string) => {
    setExpandedPlugins(prev => {
      const next = new Set(prev);
      if (next.has(pluginId)) next.delete(pluginId);
      else next.add(pluginId);
      return next;
    });
  };

  const handleTogglePlugin = (pluginId: string, enabled: boolean) => {
    postMessage({ type: 'TOGGLE_PLUGIN', payload: { pluginId, enabled } });
  };

  const handleToggleRule = (qualifiedId: string, enabled: boolean) => {
    postMessage({ type: 'TOGGLE_RULE', payload: { qualifiedId, enabled } });
  };

  // Status badge color
  const statusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500';
      case 'installed': return 'bg-amber-500';
      default: return 'bg-zinc-500';
    }
  };

  return (
    <div className="bg-zinc-800/95 backdrop-blur-sm rounded-lg border border-zinc-700 w-72 shadow-lg max-h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 flex-shrink-0">
        <span className="text-sm font-medium text-zinc-200">Plugins</span>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-200 p-1"
          title="Close"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Scrollable plugin list */}
      <div className="overflow-y-auto flex-1 px-3 pb-3">
        {plugins.length === 0 ? (
          <p className="text-xs text-zinc-500 py-3 text-center">No plugins registered.</p>
        ) : (
          plugins.map(plugin => {
            const isExpanded = expandedPlugins.has(plugin.id);
            const isInactive = plugin.status === 'inactive';

            return (
              <div
                key={plugin.id}
                className={`border-b border-zinc-700/50 last:border-b-0 ${isInactive ? 'opacity-50' : ''}`}
              >
                {/* Plugin header */}
                <div className="flex items-center gap-2 py-2.5">
                  {/* Expand/collapse chevron */}
                  <button
                    onClick={() => toggleExpanded(plugin.id)}
                    className="text-zinc-400 hover:text-zinc-200 p-0.5 flex-shrink-0"
                  >
                    <svg
                      className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>

                  {/* Plugin toggle */}
                  <Toggle
                    checked={plugin.enabled}
                    onChange={(val) => handleTogglePlugin(plugin.id, val)}
                    disabled={isInactive}
                    size="md"
                  />

                  {/* Plugin name */}
                  <span className="text-xs text-zinc-200 flex-1 truncate">{plugin.name}</span>

                  {/* Status badge */}
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusColor(plugin.status)}`} title={plugin.status} />

                  {/* Connection count */}
                  <span className="text-xs text-zinc-500 flex-shrink-0 tabular-nums">{plugin.connectionCount}</span>
                </div>

                {/* Expanded rules */}
                {isExpanded && plugin.rules.length > 0 && (
                  <div className="ml-5 mb-2 space-y-1.5">
                    {plugin.rules.map(rule => (
                      <div key={rule.qualifiedId} className="flex items-start gap-2">
                        {/* Rule toggle - aligned to first line */}
                        <div className="flex-shrink-0 pt-0.5">
                          <Toggle
                            checked={rule.enabled}
                            onChange={(val) => handleToggleRule(rule.qualifiedId, val)}
                            disabled={!plugin.enabled}
                            size="sm"
                          />
                        </div>

                        {/* Rule name + description */}
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-xs block truncate ${!plugin.enabled ? 'text-zinc-600' : 'text-zinc-300'}`}
                          >
                            {rule.name}
                          </span>
                          {rule.description && (
                            <span className="text-[10px] text-zinc-500 block truncate">
                              {rule.description}
                            </span>
                          )}
                        </div>

                        {/* Rule connection count */}
                        <span className={`text-xs flex-shrink-0 tabular-nums ${!plugin.enabled ? 'text-zinc-600' : 'text-zinc-500'}`}>
                          {rule.connectionCount}
                        </span>
                      </div>
                    ))}

                    {/* Supported extensions */}
                    {plugin.supportedExtensions.length > 0 && (
                      <div className="pt-1 text-[10px] text-zinc-500">
                        Extensions: {plugin.supportedExtensions.map(ext => `.${ext}`).join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Expanded but no rules */}
                {isExpanded && plugin.rules.length === 0 && (
                  <div className="ml-5 mb-2">
                    <p className="text-xs text-zinc-500">No rules declared.</p>
                    {/* Supported extensions */}
                    {plugin.supportedExtensions.length > 0 && (
                      <div className="pt-1 text-[10px] text-zinc-500">
                        Extensions: {plugin.supportedExtensions.map(ext => `.${ext}`).join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
