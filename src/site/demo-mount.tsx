"use client";

import {
  Component,
  type ComponentType,
  lazy,
  type ReactNode,
  Suspense,
  useEffect,
  useEffectEvent,
  useSyncExternalStore,
} from "react";
import { demoLoaders } from "@/registry/__generated__/demos";
import "@/site/art-files";
import { useDictionary } from "@/site/i18n/context";

const lazyDemos: Record<string, ComponentType> = Object.fromEntries(
  Object.entries(demoLoaders).map(([key, load]) => [key, lazy(load)]),
);

const preloaded = new Set<string>();

export function preloadDemo(id: string) {
  const load = demoLoaders[id];
  if (!load || preloaded.has(id)) return;
  preloaded.add(id);
  load().catch(() => preloaded.delete(id));
}

function MissingDemo({ id }: { id: string }): ReactNode {
  throw new Error(`There is no demo "${id}". Run pnpm registry, or check the slug and demo name.`);
}

const subscribe = () => () => {};
function useHydrated() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

class DemoBoundary extends Component<{ failed: string; children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };

  static getDerivedStateFromError(error: unknown) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error == null) return this.props.children;
    const message = error instanceof Error ? error.message : String(error);
    return (
      <div role="alert" className="m-auto max-w-md p-6 text-center text-[13px] text-muted-foreground">
        <p className="font-medium text-foreground">{this.props.failed}</p>
        <p className="mt-1.5 font-mono text-xs break-words">{message}</p>
      </div>
    );
  }
}

function Ready({ onReady }: { onReady?: () => void }) {
  const ready = useEffectEvent(() => onReady?.());
  useEffect(() => ready(), []);
  return <span hidden data-demo-ready="" />;
}

export function DemoMount({
  slug,
  demo,
  fallback = null,
  onReady,
}: {
  slug: string;
  demo: string;
  fallback?: ReactNode;
  onReady?: () => void;
}) {
  const hydrated = useHydrated();
  const failed = useDictionary().demo.failed;
  if (!hydrated) return fallback;
  const id = `${slug}/${demo}`;
  const Demo = lazyDemos[id];
  return (
    <DemoBoundary failed={failed}>
      <Suspense fallback={fallback}>
        {Demo ? <Demo /> : <MissingDemo id={id} />}
        <Ready onReady={onReady} />
      </Suspense>
    </DemoBoundary>
  );
}
