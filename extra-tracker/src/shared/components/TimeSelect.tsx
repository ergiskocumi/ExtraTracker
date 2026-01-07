import { useState, useRef, useEffect } from "react";
import { ChevronDownIcon } from "./icons";

interface TimeSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const TimeSelect = ({
  value,
  onChange,
  options,
  placeholder = "-- : --",
  required = false,
  className = "",
}: TimeSelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  // Chiudi dropdown quando si clicca fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll all'elemento selezionato quando si apre
  useEffect(() => {
    if (isOpen && selectedRef.current && dropdownRef.current) {
      const dropdown = dropdownRef.current;
      const selected = selectedRef.current;
      
      // Centra l'elemento selezionato nel dropdown
      const scrollTop = selected.offsetTop - dropdown.offsetHeight / 2 + selected.offsetHeight / 2;
      dropdown.scrollTop = Math.max(0, scrollTop);
    }
  }, [isOpen]);

  const handleSelect = (time: string) => {
    onChange(time);
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(!isOpen);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Campo di input (trigger) */}
      <div
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-required={required}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        className={`
          w-full px-4 py-3 
          bg-white/[0.05] border border-white/[0.1] rounded-xl 
          text-white cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500/50
          transition-all duration-200
          hover:border-white/20 hover:bg-white/[0.07]
          flex items-center justify-between
          ${isOpen ? 'ring-2 ring-primary-500/30 border-primary-500/50' : ''}
        `}
      >
        <span className={value ? "text-white" : "text-white/40"}>
          {value || placeholder}
        </span>
        <ChevronDownIcon 
          size={18} 
          className={`text-primary-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          role="listbox"
          className="
            absolute z-50 w-full mt-2
            max-h-64 overflow-y-auto
            bg-gradient-to-b from-[#0f0f22] via-[#1a1a2e] to-[#16162a]
            border border-white/[0.1] rounded-xl
            shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5),0_0_40px_rgba(124,58,237,0.15)]
            scrollbar-thin
            py-2
            animate-dropdown
          "
          style={{
            bottom: '100%',
            marginBottom: '8px',
          }}
        >
          {options.map((time) => (
            <div
              key={time}
              ref={time === value ? selectedRef : null}
              role="option"
              aria-selected={time === value}
              onClick={() => handleSelect(time)}
              className={`
                px-4 py-2.5 cursor-pointer
                text-sm font-medium
                transition-all duration-150
                ${time === value
                  ? 'bg-gradient-to-r from-primary-600 to-primary-500 text-white shadow-[0_0_15px_rgba(124,58,237,0.5)]'
                  : 'text-white/80 hover:bg-primary-500/20 hover:text-white'
                }
              `}
            >
              {time}
            </div>
          ))}
        </div>
      )}

      {/* Input nascosto per form validation */}
      <input
        type="hidden"
        value={value}
        required={required}
      />
    </div>
  );
};
