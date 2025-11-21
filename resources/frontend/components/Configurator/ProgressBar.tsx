import React from 'react';
import './ProgressBar.css';

interface ProgressBarProps {
  progress: number; // 0-100
  currentStep: number;
  totalSteps: number;
  showLabel?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  currentStep,
  totalSteps,
  showLabel = true,
}) => {
  return (
    <div className="progress-bar-container">
      {showLabel && (
        <div className="progress-bar-label">
          Прогресс: {Math.round(progress)}%
        </div>
      )}
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
            transition: 'width 300ms ease',
          }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;

