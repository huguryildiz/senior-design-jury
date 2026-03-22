// src/shared/Tooltip.jsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * A lightweight, accessible, portal-based tooltip wrapper.
 * Works on hover and focus. Repositions to avoid clipping.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - The element to wrap (trigger).
 * @param {string} props.text - The tooltip content.
 * @param {string} [props.position='top'] - 'top', 'bottom', 'left', 'right'.
 * @param {string} [props.id] - Optional ID for the tooltip element (aria-describedby).
 */
export default function Tooltip({ children, text, position = 'top', id }) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!isVisible || !triggerRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return;
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();

      const padding = 8;
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;

      let computedPosition = position;
      let top = 0;
      let left = 0;

      // Smart collision detection
      if (position === 'top' && triggerRect.top - tooltipRect.height - padding < 0) {
        computedPosition = 'bottom';
      } else if (position === 'bottom' && triggerRect.bottom + tooltipRect.height + padding > windowHeight) {
        computedPosition = 'top';
      } else if (position === 'left' && triggerRect.left - tooltipRect.width - padding < 0) {
        computedPosition = 'right';
      } else if (position === 'right' && triggerRect.right + tooltipRect.width + padding > windowWidth) {
        computedPosition = 'left';
      }

      setActualPosition(computedPosition);

      // Positioning logic using fixed coordinates
      if (computedPosition === 'top') {
        top = triggerRect.top - tooltipRect.height - padding;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      } else if (computedPosition === 'bottom') {
        top = triggerRect.bottom + triggerRect.height + padding;
        left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
      } else if (computedPosition === 'left') {
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.left - tooltipRect.width - padding;
      } else if (computedPosition === 'right') {
        top = triggerRect.top + (triggerRect.height / 2) - (tooltipRect.height / 2);
        left = triggerRect.right + padding;
      }

      // Constrain to viewport horizontally
      if (left < padding) left = padding;
      else if (left + tooltipRect.width + padding > windowWidth) {
        left = windowWidth - tooltipRect.width - padding;
      }

      // Constrain to viewport vertically
      if (top < padding) top = padding;
      else if (top + tooltipRect.height + padding > windowHeight) {
        top = windowHeight - tooltipRect.height - padding;
      }

      setCoords({ top, left });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [isVisible, position]);

  if (!text) return children;

  return (
    <>
      <div 
        className="tooltip-wrapper"
        ref={triggerRef}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && createPortal(
        <span 
          className={`tooltip-text tooltip-${actualPosition} is-visible`} 
          id={id} 
          role="tooltip"
          aria-hidden={!isVisible}
          ref={tooltipRef}
          style={{ 
            position: 'fixed', 
            top: `${coords.top}px`, 
            left: `${coords.left}px`,
            pointerEvents: 'none'
          }}
        >
          {text}
        </span>,
        document.body
      )}
    </>
  );
}
