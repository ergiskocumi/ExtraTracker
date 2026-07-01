import { lazy, Suspense } from 'react';
import type { FullscreenEditModalProps } from './CardEditor/FullscreenEditModal';

const FullscreenEditModalInner = lazy(() =>
  import('./CardEditor/FullscreenEditModal').then((m) => ({
    default: m.FullscreenEditModal,
  }))
);

export const FullscreenEditModal: React.FC<FullscreenEditModalProps> = (props) => (
  <Suspense
    fallback={
      <div className="min-h-[200px] animate-pulse bg-theme-surface rounded-lg" />
    }
  >
    <FullscreenEditModalInner {...props} />
  </Suspense>
);
