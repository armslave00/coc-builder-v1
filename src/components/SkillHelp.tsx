import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CircleHelp } from 'lucide-react';
import './guidance.css';

interface SkillHelpProps {
  name: string;
  description: string;
  scenarios: string[];
}

export function SkillHelp({ name, description, scenarios }: SkillHelpProps) {
  const tooltipId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pinned = useRef(false);
  const hovered = useRef(false);
  const tooltipHovered = useRef(false);
  const focused = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 12, top: 12 });

  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const close = () => {
    cancelClose();
    pinned.current = false;
    tooltipHovered.current = false;
    setOpen(false);
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      if (!pinned.current && !hovered.current && !tooltipHovered.current && !focused.current) setOpen(false);
    }, 180);
  };

  useLayoutEffect(() => {
    if (!open || !buttonRef.current || !tooltipRef.current) return;
    const anchor = buttonRef.current.getBoundingClientRect();
    const panel = tooltipRef.current.getBoundingClientRect();
    const margin = 12;
    const below = anchor.bottom + 8;
    const above = anchor.top - panel.height - 8;
    const top = below + panel.height <= window.innerHeight - margin ? below : Math.max(margin, above);
    const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - panel.width - margin));
    setPosition({ left, top });
  }, [open, name, description, scenarios]);

  useEffect(() => {
    if (!open) return;
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !buttonRef.current?.contains(event.target) && !tooltipRef.current?.contains(event.target)) close();
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
      }
    };
    const onScroll = (event: Event) => {
      if (event.target instanceof Node && tooltipRef.current?.contains(event.target)) return;
      close();
    };
    document.addEventListener('pointerdown', onOutside);
    document.addEventListener('keydown', onEscape, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onOutside);
      document.removeEventListener('keydown', onEscape, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  return <>
    <button
      type="button"
      ref={buttonRef}
      className="skill-help-button"
      aria-label={`查看${name}的说明`}
      aria-describedby={open ? tooltipId : undefined}
      aria-expanded={open}
      onPointerEnter={event => {
        if (event.pointerType === 'touch') return;
        hovered.current = true;
        cancelClose();
        setOpen(true);
      }}
      onPointerLeave={event => {
        if (event.pointerType === 'touch') return;
        hovered.current = false;
        scheduleClose();
      }}
      onFocus={() => {
        focused.current = true;
        cancelClose();
        setOpen(true);
      }}
      onBlur={() => {
        focused.current = false;
        scheduleClose();
      }}
      onClick={() => {
        if (pinned.current) close();
        else {
          pinned.current = true;
          cancelClose();
          setOpen(true);
        }
      }}
    >
      <CircleHelp size={14} aria-hidden="true" />
    </button>
    {open && createPortal(<div
      id={tooltipId}
      ref={tooltipRef}
      role="tooltip"
      className="skill-help-tooltip"
      style={position}
      onPointerEnter={() => {
        tooltipHovered.current = true;
        cancelClose();
      }}
      onPointerLeave={() => {
        tooltipHovered.current = false;
        scheduleClose();
      }}
    >
      <strong>{name}</strong>
      <p>{description || '由玩家与守秘人共同确认这项技能的用途。'}</p>
      {scenarios.length > 0 && <div className="skill-help-scenarios">
        <span>适合的场景</span>
        <ul>{scenarios.slice(0, 2).map((scenario, index) => <li key={`${index}-${scenario}`}>{scenario}</li>)}</ul>
      </div>}
    </div>, document.body)}
  </>;
}
