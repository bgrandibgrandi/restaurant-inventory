'use client';

import { useState, createContext, useContext, ReactNode } from 'react';

// Context for Accordion state
interface AccordionContextType {
  openSections: string[];
  toggleSection: (id: string) => void;
  allowMultiple: boolean;
}

const AccordionContext = createContext<AccordionContextType | null>(null);

// Accordion container
interface AccordionProps {
  children: ReactNode;
  defaultOpen?: string[];
  allowMultiple?: boolean;
  className?: string;
}

export function Accordion({
  children,
  defaultOpen = [],
  allowMultiple = true,
  className = '',
}: AccordionProps) {
  const [openSections, setOpenSections] = useState<string[]>(defaultOpen);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      if (prev.includes(id)) {
        return prev.filter((sectionId) => sectionId !== id);
      } else {
        return allowMultiple ? [...prev, id] : [id];
      }
    });
  };

  return (
    <AccordionContext.Provider value={{ openSections, toggleSection, allowMultiple }}>
      <div className={`space-y-3 ${className}`}>{children}</div>
    </AccordionContext.Provider>
  );
}

// Accordion section
interface AccordionSectionProps {
  id: string;
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

export function AccordionSection({
  id,
  title,
  icon,
  badge,
  children,
}: AccordionSectionProps) {
  const context = useContext(AccordionContext);

  if (!context) {
    throw new Error('AccordionSection must be used within an Accordion');
  }

  const { openSections, toggleSection } = context;
  const isOpen = openSections.includes(id);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
      {/* Header */}
      <button
        type="button"
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
              {icon}
            </div>
          )}
          <span className="font-semibold text-gray-900">{title}</span>
          {badge}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 pt-2 border-t border-gray-100">{children}</div>
      </div>
    </div>
  );
}

// Simple standalone accordion section (without context)
interface SimpleAccordionProps {
  title: string;
  icon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function SimpleAccordion({
  title,
  icon,
  badge,
  children,
  defaultOpen = false,
  className = '',
}: SimpleAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm ${className}`}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-gray-600">
              {icon}
            </div>
          )}
          <span className="font-semibold text-gray-900">{title}</span>
          {badge}
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-5 pb-5 pt-2 border-t border-gray-100">{children}</div>
      </div>
    </div>
  );
}
