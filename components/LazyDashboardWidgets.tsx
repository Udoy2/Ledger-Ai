'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';

const RagChat = lazy(() => import('./RagChat').then((m) => ({ default: m.RagChat })));
const FaqSetupPanel = lazy(() => import('./FaqSetupPanel').then((m) => ({ default: m.FaqSetupPanel })));

function WidgetSkeleton({ label }: { label: string }) {
  return (
    <div className="surface-inset p-5 text-xs text-ink-soft">
      {label}
    </div>
  );
}

export function LazyDashboardWidgets({ docsCount }: { docsCount: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (active) return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setActive(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.disconnect();
        }
      },
      { rootMargin: '600px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  return (
    <div ref={ref} className="space-y-6">
      {active ? (
        <Suspense fallback={<WidgetSkeleton label="Loading analyst tools..." />}>
          <RagChat />
          <FaqSetupPanel docsCount={docsCount} />
        </Suspense>
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="surface-inset w-full p-5 text-left text-xs font-semibold"
          style={{ color: 'var(--text-secondary)' }}
        >
          Load analyst chat and FAQ setup
        </button>
      )}
    </div>
  );
}
