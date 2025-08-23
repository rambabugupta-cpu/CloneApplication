import { useEffect, useRef } from 'react';

/**
 * Hook to set CSS custom properties for chart colors
 * This replaces inline styles with CSS custom properties for better maintainability
 */
export function useChartColors(colors: Record<string, string>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Set CSS custom properties on the element
    Object.entries(colors).forEach(([property, value]) => {
      if (value) {
        ref.current?.style.setProperty(`--${property}`, value);
      }
    });

    // Cleanup function to remove properties when component unmounts
    return () => {
      if (ref.current) {
        Object.keys(colors).forEach((property) => {
          ref.current?.style.removeProperty(`--${property}`);
        });
      }
    };
  }, [colors]);

  return ref;
}
