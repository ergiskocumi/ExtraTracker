import { lazy, Suspense } from 'react';
import type { RichTextEditorProps } from './CardEditor/RichTextEditor';

const RichTextEditor = lazy(() =>
  import('./CardEditor/RichTextEditor').then((m) => ({ default: m.RichTextEditor }))
);

export const MarkdownEditor: React.FC<RichTextEditorProps> = (props) => (
  <Suspense
    fallback={
      <div className="min-h-[200px] animate-pulse bg-theme-surface rounded-lg" />
    }
  >
    <RichTextEditor {...props} />
  </Suspense>
);
