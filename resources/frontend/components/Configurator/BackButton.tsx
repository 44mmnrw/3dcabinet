import React from 'react';
import './BackButton.css';

interface BackButtonProps {
  disabled: boolean;
  onClick: () => void;
  label?: string;
}

const BackButton: React.FC<BackButtonProps> = ({
  disabled,
  onClick,
  label = '← Назад',
}) => {
  return (
    <button
      className={`back-button ${disabled ? 'disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
};

export default BackButton;

