import React, { useEffect, useRef, useState } from 'react';

const GLASS_CARD_SELECTOR = [
  '.tp-stat-card',
  '.tp-card',
  '.tp-card-static',
  '.tp-hero-header',
  '.tp-workflow-bar',
  '.tp-workflow-step',
  '.tp-filter-bar',
  '.tp-feature-card',
  '.tp-benefit-box',
  '.tp-simulation-card',
  '.tp-faq-item',
  '.tp-login-card',
  '.tp-feature-mini-card',
  '.tp-mockup-frame',
  '.tp-review-list-item',
  '.tp-radio-card',
  '.tp-popup-card',
  '.tp-form-modal-card'
].join(', ');

const TILT_CARD_SELECTOR = [
  '.tp-stat-card',
  '.tp-feature-card',
  '.tp-workflow-step',
  '.tp-feature-mini-card'
].join(', ');

export function InteractiveGlassEngine() {
  const [isGlass, setIsGlass] = useState(() => {
    if (typeof document === 'undefined') return false;
    return (
      document.documentElement.getAttribute('data-surface') === 'glass' ||
      localStorage.getItem('tp_surface_style') === 'glass'
    );
  });

  const orbPrimaryRef = useRef(null);
  const orbSecondaryRef = useRef(null);
  const rippleContainerRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    const checkSurface = () => {
      setIsGlass(root.getAttribute('data-surface') === 'glass');
    };
    checkSurface();

    const observer = new MutationObserver(checkSurface);
    observer.observe(root, { attributes: true, attributeFilter: ['data-surface'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isGlass) return;

    let rafId = null;
    let targetX = window.innerWidth * 0.5;
    let targetY = window.innerHeight * 0.35;
    let currentX = targetX;
    let currentY = targetY;
    let secondaryX = targetX;
    let secondaryY = targetY;
    let activeCard = null;

    const animateOrbs = () => {
      currentX += (targetX - currentX) * 0.035;
      currentY += (targetY - currentY) * 0.035;
      secondaryX += (targetX - secondaryX) * 0.018;
      secondaryY += (targetY - secondaryY) * 0.018;

      if (orbPrimaryRef.current) {
        orbPrimaryRef.current.style.transform = `translate3d(${currentX - 310}px, ${currentY - 310}px, 0)`;
      }
      if (orbSecondaryRef.current) {
        orbSecondaryRef.current.style.transform = `translate3d(${secondaryX - 380}px, ${secondaryY - 380}px, 0)`;
      }

      rafId = requestAnimationFrame(animateOrbs);
    };

    rafId = requestAnimationFrame(animateOrbs);

    const resetCard = (card) => {
      if (!card) return;
      card.style.setProperty('--glass-hover', '0');
      card.style.setProperty('--tilt-x', '0deg');
      card.style.setProperty('--tilt-y', '0deg');
    };

    const handlePointerMove = (e) => {
      targetX = e.clientX;
      targetY = e.clientY;

      const card = e.target.closest ? e.target.closest(GLASS_CARD_SELECTOR) : null;
      if (activeCard && activeCard !== card) {
        resetCard(activeCard);
      }
      activeCard = card;

      if (card) {
        const rect = card.getBoundingClientRect();
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        card.style.setProperty('--glass-x', `${relX.toFixed(1)}px`);
        card.style.setProperty('--glass-y', `${relY.toFixed(1)}px`);
        card.style.setProperty('--glass-hover', '1');

        if (card.matches(TILT_CARD_SELECTOR) && rect.width > 0 && rect.height > 0) {
          const normX = (relX / rect.width) - 0.5;
          const normY = (relY / rect.height) - 0.5;
          const maxTilt = rect.width > 360 ? 0.9 : 1.35;
          const tiltX = (-normY * maxTilt).toFixed(2);
          const tiltY = (normX * maxTilt).toFixed(2);
          card.style.setProperty('--tilt-x', `${tiltX}deg`);
          card.style.setProperty('--tilt-y', `${tiltY}deg`);
        }
      }
    };

    const handlePointerDown = (e) => {
      if (!rippleContainerRef.current) return;
      const card = e.target.closest ? e.target.closest(GLASS_CARD_SELECTOR) : null;
      if (!card) return;

      const ripple = document.createElement('span');
      ripple.className = 'tp-glass-click-ripple';
      ripple.style.left = `${e.clientX}px`;
      ripple.style.top = `${e.clientY}px`;
      rippleContainerRef.current.appendChild(ripple);

      setTimeout(() => {
        ripple.remove();
      }, 720);
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (activeCard) resetCard(activeCard);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isGlass]);

  if (!isGlass) return null;

  return (
    <div className="tp-interactive-glass-stage" aria-hidden="true">
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="tp-liquid-glass-refraction" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.015 0.018"
              numOctaves="2"
              seed="7"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="10"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      <div ref={orbPrimaryRef} className="tp-glass-cursor-orb tp-glass-cursor-orb--primary" />
      <div ref={orbSecondaryRef} className="tp-glass-cursor-orb tp-glass-cursor-orb--secondary" />
      <div ref={rippleContainerRef} className="tp-glass-ripple-layer" />
    </div>
  );
}
