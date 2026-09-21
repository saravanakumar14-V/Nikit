import React, { useState, useRef, useEffect, forwardRef } from 'react';
import { Size } from '@nikit/types';
import { ChevronDown, Check, Search } from 'lucide-react';
import { useClickOutside } from '../../hooks/useClickOutside';
import { useEscapeKey } from '../../hooks/useEscapeKey';
import styles from './Select.module.css';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string | boolean;
  helperText?: string;
  size?: Size;
  searchable?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  className?: string;
}

export const Select = forwardRef<HTMLDivElement, SelectProps>(
  (
    {
      options,
      value: controlledValue,
      defaultValue,
      onChange,
      placeholder = 'Select option...',
      label,
      error,
      helperText,
      size = 'md',
      searchable = false,
      disabled = false,
      fullWidth = false,
      className,
    },
    forwardedRef
  ) => {
    const isControlled = controlledValue !== undefined;
    const [internalValue, setInternalValue] = useState<string>(defaultValue || '');
    const selectedValue = isControlled ? controlledValue : internalValue;

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);

    const containerRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    const selectedOption = options.find((opt) => opt.value === selectedValue);

    const filteredOptions = searchable
      ? options.filter((opt) =>
          opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
      : options;

    useClickOutside(containerRef, () => setIsOpen(false), isOpen);
    useEscapeKey(() => setIsOpen(false), isOpen);

    useEffect(() => {
      if (isOpen && searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
      if (!isOpen) {
        setSearchQuery('');
      }
    }, [isOpen, searchable]);

    const handleSelect = (val: string) => {
      if (!isControlled) {
        setInternalValue(val);
      }
      onChange?.(val);
      setIsOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (disabled) return;

      if (!isOpen) {
        if (e.key === 'Enter' || e.key === 'ArrowDown' || e.key === ' ') {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev + 1) % filteredOptions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev - 1 + filteredOptions.length) % filteredOptions.length);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const option = filteredOptions[highlightedIndex];
        if (option && !option.disabled) {
          handleSelect(option.value);
        }
      }
    };

    const hasError = Boolean(error);

    return (
      <div
        ref={(node) => {
          containerRef.current = node;
          if (typeof forwardedRef === 'function') forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        className={`${styles.container} ${fullWidth ? styles.fullWidth : ''} ${className || ''}`}
        onKeyDown={handleKeyDown}
      >
        {label && <label className={styles.label}>{label}</label>}

        <button
          type="button"
          className={`${styles.trigger} ${styles[size]} ${isOpen ? styles.open : ''} ${
            hasError ? styles.hasError : ''
          }`}
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <div className={styles.triggerContent}>
            {selectedOption?.icon && <span className={styles.optionIcon}>{selectedOption.icon}</span>}
            <span className={selectedOption ? styles.valueText : styles.placeholderText}>
              {selectedOption ? selectedOption.label : placeholder}
            </span>
          </div>
          <ChevronDown
            size={16}
            className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          />
        </button>

        {isOpen && (
          <div className={styles.dropdown} role="listbox">
            {searchable && (
              <div className={styles.searchBox}>
                <Search size={14} className={styles.searchIcon} />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder="Search options..."
                  className={styles.searchInput}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            )}

            <div className={styles.optionsList}>
              {filteredOptions.length === 0 ? (
                <div className={styles.emptyOption}>No options found</div>
              ) : (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === selectedValue;
                  const isHighlighted = idx === highlightedIndex;

                  return (
                    <div
                      key={opt.value}
                      className={`${styles.option} ${isSelected ? styles.selected : ''} ${
                        isHighlighted ? styles.highlighted : ''
                      } ${opt.disabled ? styles.optionDisabled : ''}`}
                      onClick={() => !opt.disabled && handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className={styles.optionMain}>
                        {opt.icon && <span className={styles.optionIcon}>{opt.icon}</span>}
                        <div className={styles.optionTextContainer}>
                          <span className={styles.optionLabel}>{opt.label}</span>
                          {opt.description && (
                            <span className={styles.optionDescription}>{opt.description}</span>
                          )}
                        </div>
                      </div>
                      {isSelected && <Check size={14} className={styles.checkIcon} />}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {hasError && typeof error === 'string' && (
          <div className={styles.errorText} role="alert">
            {error}
          </div>
        )}
        {!hasError && helperText && <div className={styles.helperText}>{helperText}</div>}
      </div>
    );
  }
);

Select.displayName = 'Select';
