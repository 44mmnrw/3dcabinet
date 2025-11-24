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
  route: _route, // _route зарезервировано для будущей навигации, сейчас не используется
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

