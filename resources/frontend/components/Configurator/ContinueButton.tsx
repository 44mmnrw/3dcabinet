import React from 'react';
import './ContinueButton.css';

interface ContinueButtonProps {
  disabled: boolean;
  onClick: () => void;
  route: string;
  label?: string;
}

const ContinueButton: React.FC<ContinueButtonProps> = ({
  disabled,
  onClick,
  route,
  label = 'Продолжить →',
}) => {
  return (
    <button
      className={`continue-button ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

export default ContinueButton;

