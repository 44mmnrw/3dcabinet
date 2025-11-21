import React from 'react';
import type { Conflict } from '@/types/configurator';
import './ConflictResolver.css';

interface ConflictResolverProps {
  conflict: Conflict;
  onResolve: (resolutionId: string) => void;
}

const ConflictResolver: React.FC<ConflictResolverProps> = ({
  conflict,
  onResolve,
}) => {
  return (
    <div className="conflict-resolver">
      <div className="conflict-message-header">
        <div className="conflict-icon-large">
          {conflict.severity === 'error' ? '❌' : '⚠️'}
        </div>
        <h4 className="conflict-title">Конфигурация не совместима</h4>
      </div>
      <p className="conflict-message-text">{conflict.message}</p>
      {conflict.resolution && conflict.resolution.type === 'branch' && (
        <div className="conflict-resolution-options">
          <p className="resolution-title">Варианты разрешения:</p>
          {conflict.resolution.options?.map((option) => (
            <button
              key={option.id}
              className="resolution-option"
              onClick={() => onResolve(option.id)}
            >
              <div className="resolution-option-label">{option.label}</div>
              {option.description && (
                <div className="resolution-option-description">
                  {option.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ConflictResolver;

