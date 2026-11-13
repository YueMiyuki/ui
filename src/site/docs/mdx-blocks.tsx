import { SourceBlock } from "@/site/docs/code-block";
import { type CodeLang, highlight, readSource, readThemeTokens } from "@/site/highlight";
import { catalogueCounts, installUrlCommand, REGISTRY_NAMESPACE, REGISTRY_URL_TEMPLATE } from "@/site/registry";

export async function Code({
  code,
  lang = "bash",
  title,
  className = "my-4",
}: {
  code: string;
  lang?: CodeLang;
  title?: string;
  className?: string;
}) {
  return <SourceBlock html={await highlight(code, lang)} title={title} className={className} />;
}

export function RegistryJson() {
  const json = JSON.stringify({ registries: { [REGISTRY_NAMESPACE]: REGISTRY_URL_TEMPLATE } }, null, 2);
  return <Code code={json} lang="json" title="components.json" />;
}

export function RegistryAdd() {
  return <Code code={`npx shadcn@latest registry add ${REGISTRY_NAMESPACE}=${REGISTRY_URL_TEMPLATE}`} />;
}

export function AddByUrl({ slug }: { slug: string }) {
  return <Code code={installUrlCommand(slug)} />;
}

export async function ThemeCss() {
  const tokens = await readThemeTokens();
  return <SourceBlock html={tokens.html} title="globals.css" expandable className="my-4" />;
}

export async function UtilsSource() {
  const utils = await readSource("lib/utils.ts");
  return <SourceBlock html={utils.html} title="lib/utils.ts" className="my-4" />;
}

export function Count({ of }: { of: "components" | "templates" }) {
  return <>{catalogueCounts()[of]}</>;
}
