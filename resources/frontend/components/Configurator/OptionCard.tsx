import React from 'react';
import type { StepOption } from '@/types/configurator';
import './OptionCard.css';

interface OptionCardProps {
  option: StepOption;
  isSelected: boolean;
  onClick: () => void;
}

const OptionCard: React.FC<OptionCardProps> = ({
  option,
  isSelected,
  onClick,
}) => {
  return (
    <div
      className={`option-card ${isSelected ? 'active' : ''}`}
      onClick={onClick}
    >
      <div className="option-card-content">
        {/* Иконка */}
        <div className="option-icon">
          {option.icon && (
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Заглушка для иконки, будет заменена на реальную SVG */}
              <rect
                width="24"
                height="24"
                rx="4"
                fill={isSelected ? 'var(--color-white)' : 'var(--color-blue)'}
              />
            </svg>
          )}
        </div>

        {/* Текст */}
        <div className="option-text">
          <div className="option-label">{option.label}</div>
          {option.description && (
            <div className="option-description">{option.description}</div>
          )}
        </div>

        {/* Индикатор выбора */}
        <div className="option-check">
          {isSelected && (
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                fill="var(--color-blue)"
                stroke="var(--color-blue-dark)"
                strokeWidth="2"
              />
              <path
                d="M8 12L11 15L16 9"
                stroke="var(--color-white)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default OptionCard;

