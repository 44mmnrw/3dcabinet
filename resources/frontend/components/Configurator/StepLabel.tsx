import React from 'react';
import './StepLabel.css';

interface StepLabelProps {
  current: number;
  total: number;
  isComplete?: boolean;
}

const StepLabel: React.FC<StepLabelProps> = ({
  current,
  total,
  isComplete = false,
}) => {
  return (
    <div className={`step-label ${isComplete ? 'complete' : ''}`}>
      <span className="step-label-text">
        Шаг {current} из {total}
      </span>
      {isComplete && (
        <span className="step-label-check" title="Все шаги завершены">
          ✓
        </span>
      )}
    </div>
  );
};

export default StepLabel;

