import React, { Suspense, forwardRef, lazy } from 'react';
import type { PDFReaderRef } from './PDFReader';
import type PDFReaderComponent from './PDFReader';

type PDFReaderProps = React.ComponentPropsWithoutRef<typeof PDFReaderComponent>;

const PDFReaderLazy = lazy(() => import('./PDFReader')) as React.LazyExoticComponent<
    React.ForwardRefExoticComponent<PDFReaderProps & React.RefAttributes<PDFReaderRef>>
>;

const PDFReaderFallback: React.FC<{ className?: string }> = ({ className }) => (
    <div
        className={`flex h-full w-full items-center justify-center bg-theme-elevated text-theme-secondary ${className ?? ''}`.trim()}
        aria-busy="true"
        aria-live="polite"
    >
        <div className="text-xs text-theme-secondary">Caricamento PDF...</div>
    </div>
);

export const PDFReaderLazyWrapper = forwardRef<PDFReaderRef, PDFReaderProps>((props, ref) => (
    <Suspense fallback={<PDFReaderFallback className={props.className} />}>
        <PDFReaderLazy {...props} ref={ref} />
    </Suspense>
));

PDFReaderLazyWrapper.displayName = 'PDFReaderLazyWrapper';

export default PDFReaderLazyWrapper;
