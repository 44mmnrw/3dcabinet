import React from 'react';
import type { Step, Selection } from '@/types/configurator';
import OptionCard from './OptionCard';
import './StepContainer.css';

interface StepContainerProps {
  step: Step;
  isVisible: boolean;
  isActive: boolean;
  selection?: Selection;
  onSelect: (option: any) => void;
}

const StepContainer: React.FC<StepContainerProps> = ({
  step,
  isVisible,
  isActive,
  selection,
  onSelect,
}) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`step-container ${isActive ? 'active' : ''}`}
      style={{
        animation: isActive
          ? 'fadeIn 300ms ease'
          : 'none',
      }}
    >
      <div className="step-header">
        <h2 className="step-title">{step.title}</h2>
        {step.description && (
          <p className="step-description">{step.description}</p>
        )}
      </div>

      <div className="step-options">
        {step.options.map((option) => (
          <OptionCard
            key={option.value}
            option={option}
            isSelected={
              selection?.value === option.value
            }
            onClick={() => onSelect(option)}
          />
        ))}
      </div>
    </div>
  );
};

export default StepContainer;

