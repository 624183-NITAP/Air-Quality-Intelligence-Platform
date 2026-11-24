import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, renderHook, act } from '@testing-library/react';
import { useFocusTrap } from '../src/hooks/useFocusTrap';
import { useDebounce } from '../src/hooks/useDebounce';

interface TestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TestModal: React.FC<TestModalProps> = ({ isOpen, onClose }) => {
  const containerRef = useFocusTrap({ isOpen, onClose });

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-heading"
      tabIndex={-1}
    >
      <h2 id="modal-heading">Accessible Test Dialog</h2>
      <button data-testid="btn-first">First Button</button>
      <input data-testid="input-field" placeholder="Enter text" />
      <button data-testid="btn-last" onClick={onClose}>Last Button</button>
    </div>
  );
};

const ParentWrapper: React.FC = () => {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button data-testid="trigger-btn" onClick={() => setOpen(true)}>
        Open Modal
      </button>
      <TestModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};

describe('Accessibility & Focus Management (useFocusTrap)', () => {
  it('automatically shifts focus to the first focusable element upon opening', () => {
    render(<ParentWrapper />);
    const trigger = screen.getByTestId('trigger-btn');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);

    fireEvent.click(trigger);

    const firstBtn = screen.getByTestId('btn-first');
    expect(document.activeElement).toBe(firstBtn);
  });

  it('invokes onClose when the Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(<TestModal isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('cycles focus back to the first element when pressing Tab on the last element', () => {
    render(<TestModal isOpen={true} onClose={vi.fn()} />);

    const firstBtn = screen.getByTestId('btn-first');
    const lastBtn = screen.getByTestId('btn-last');

    // Simulate focus on the last element
    lastBtn.focus();
    expect(document.activeElement).toBe(lastBtn);

    // Press Tab
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(document.activeElement).toBe(firstBtn);
  });

  it('cycles focus back to the last element when pressing Shift+Tab on the first element', () => {
    render(<TestModal isOpen={true} onClose={vi.fn()} />);

    const firstBtn = screen.getByTestId('btn-first');
    const lastBtn = screen.getByTestId('btn-last');

    firstBtn.focus();
    expect(document.activeElement).toBe(firstBtn);

    // Press Shift+Tab
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(lastBtn);
  });

  it('restores focus to the triggering element when modal closes', () => {
    render(<ParentWrapper />);
    const trigger = screen.getByTestId('trigger-btn');
    trigger.focus();
    fireEvent.click(trigger);

    const lastBtn = screen.getByTestId('btn-last');
    fireEvent.click(lastBtn); // Triggers onClose, setting open to false

    // Focus restored to trigger
    expect(document.activeElement).toBe(trigger);
  });
});

describe('Custom Hook: useDebounce', () => {
  it('delays updating the value until delay period has elapsed', () => {
    vi.useFakeTimers();

    const { result, rerender } = renderHook(
      ({ val, delay }: { val: string; delay: number }) => useDebounce(val, delay),
      { initialProps: { val: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    // Update props
    rerender({ val: 'updated', delay: 300 });

    // Should still be initial before timer advances
    expect(result.current).toBe('initial');

    // Fast-forward time
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current).toBe('updated');

    vi.useRealTimers();
  });
});
