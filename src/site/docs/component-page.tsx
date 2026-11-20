import { Heading } from "fumadocs-ui/components/heading";
import { Step, Steps } from "fumadocs-ui/components/steps";
import { type TypeNode, TypeTable } from "fumadocs-ui/components/type-table";
import { DocsBody, DocsPage } from "fumadocs-ui/layouts/notebook/page";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { ComponentPropsDoc, RegistryItem } from "@/registry/schema";
import { DemoBlock } from "@/site/demo-block";
import { SourceBlock } from "@/site/docs/code-block";
import { PageDescription, PageTitle, pageFooterClass } from "@/site/docs/page-parts";
import type { RegistryPageData } from "@/site/docs/registry-source";
import { Tab, Tabs } from "@/site/docs/tabs";
import { docsHref, docsPath, GITHUB_URL, headingId } from "@/site/docs/urls";
import { highlight, readSource } from "@/site/highlight";
import type { Locale } from "@/site/i18n/config";
import { type Dictionary, dictionaries } from "@/site/i18n/dictionaries";
import { format } from "@/site/i18n/format";
import { localizeItem } from "@/site/i18n/items";
import { getItem, installCommand, installUrlCommand, REGISTRY_NAMESPACE } from "@/site/registry";
import { DocsFooter } from "@/site/site-footer";

type Text = Dictionary["component"];

function C({ children }: { children: ReactNode }) {
  return <code>{children}</code>;
}

async function Command({ code, className }: { code: string; className?: string }) {
  return <SourceBlock html={await highlight(code, "bash")} className={className} />;
}

async function Manual({ item, locale, t }: { item: RegistryItem; locale: Locale; t: Dictionary }) {
  const helpers = item.libs.filter((lib) => lib !== "lib/utils.ts");
  const [files, libs] = await Promise.all([
    Promise.all(item.files.map((file) => readSource(file))),
    Promise.all(helpers.map((lib) => readSource(lib))),
  ]);
  const add = [
    item.dependencies.length > 0 ? `pnpm add ${item.dependencies.join(" ")}` : null,
    item.devDependencies.length > 0 ? `pnpm add -D ${item.devDependencies.join(" ")}` : null,
  ]
    .filter(Boolean)
    .join("\n");
  const required = item.registryDependencies.map((slug) => getItem(slug)).filter((dep) => dep != null);
  const usesUtils = item.libs.includes("lib/utils.ts");

  return (
    <Steps>
      {add ? (
        <Step>
          <h3>{t.component.dependencies}</h3>
          <Command code={add} className="my-4" />
        </Step>
      ) : null}
      {required.length > 0 ? (
        <Step>
          <h3>{t.component.uses}</h3>
          <p>
            {required.map((dep, i) => (
              <span key={dep.slug}>
                {i > 0 ? t.common.listSeparator : null}
                <Link href={docsHref(dep, locale)}>{localizeItem(dep, locale).name}</Link>
              </span>
            ))}
          </p>
        </Step>
      ) : null}
      {libs.length > 0 ? (
        <Step>
          <h3>{t.component.helpers}</h3>
          <div className="mt-4 space-y-4">
            {libs.map((file) => (
              <SourceBlock key={file.path} html={file.html} title={file.path} expandable />
            ))}
          </div>
        </Step>
      ) : null}
      <Step>
        <h3>{t.component.source}</h3>
        {usesUtils ? (
          <p>
            {format(t.component.usesUtils, {
              cn: <C>cn()</C>,
              link: <Link href={docsPath(locale, "/installation#manual")}>{t.component.installation}</Link>,
            })}
          </p>
        ) : null}
        <div className="mt-4 space-y-4">
          {files.map((file) => (
            <SourceBlock key={file.path} html={file.html} title={file.path} expandable />
          ))}
        </div>
      </Step>
    </Steps>
  );
}

async function SuspenseNote({ item, t }: { item: RegistryItem; t: Text }) {
  const group = item.props[0];
  const english = getItem(item.slug)?.name ?? item.name;
  const component = group?.component ?? english.replace(/[^A-Za-z0-9]/g, "");
  const labelled = group?.props.some((prop) => prop.name === "label") ?? false;
  const noun = english.split(" ")[0];
  const code = [
    `import { Suspense } from "react";`,
    "",
    `<Suspense fallback={<div className="${labelled ? "h-16" : "h-72"}" />}>`,
    `  <${component} ${labelled ? "label" : "aria-label"}="${noun}" />`,
    "</Suspense>",
  ].join("\n");

  return (
    <>
      <Heading as="h3" id="install-nextjs">
        {t.nextApp}
      </Heading>
      <p>{format(t.suspense, { name: item.name, suspense: <C>Suspense</C> })}</p>
      <SourceBlock html={await highlight(code, "tsx")} />
    </>
  );
}

const importsArt = /^import\s[^;]*["']@\/registry\/lib\/art["']/m;
const importsData = /^import\s[^;]*["']@\/registry\/lib\/data["']/m;

function SiteFile({ name }: { name: "art.ts" | "data.ts" }) {
  return (
    <a
      href={`${GITHUB_URL}/blob/main/src/registry/lib/${name}`}
      target="_blank"
      rel="noreferrer"
      className="font-mono font-medium text-brand-strong underline decoration-brand-strong decoration-[1.5px] underline-offset-[3.5px] transition-opacity duration-200 hover:opacity-80"
    >
      {name}
    </a>
  );
}

function SiteFilesNote({ code, dataNeedsArt, t }: { code: string; dataNeedsArt: boolean; t: Text }) {
  const art = importsArt.test(code);
  const data = importsData.test(code);
  if (!art && !data) return null;
  const template = art && data ? t.artAndData : art ? t.art : dataNeedsArt ? t.dataWithArt : t.data;
  return (
    <p className="mb-3 text-[13px] leading-5 text-muted-foreground">
      {format(template, { art: <SiteFile name="art.ts" />, data: <SiteFile name="data.ts" /> })}
    </p>
  );
}

function typeTable(group: ComponentPropsDoc): Record<string, TypeNode> {
  return Object.fromEntries(
    group.props.map((prop) => [
      prop.name,
      {
        type: <code className="font-mono text-[13px]">{prop.type}</code>,
        description: prop.description,
        default: prop.default ? <code>{prop.default}</code> : undefined,
        required: true,
      },
    ]),
  );
}

export async function ComponentPage({ data, locale }: { data: RegistryPageData; locale: Locale }) {
  const source = data.slug ? getItem(data.slug) : undefined;
  if (!source) notFound();
  const item = localizeItem(source, locale);
  const t = dictionaries[locale];

  const [demoSources, dataSource] = await Promise.all([
    Promise.all(item.demos.map((demo) => readSource(demo.file))),
    readSource("registry/lib/data.ts"),
  ]);
  const dataNeedsArt = importsArt.test(dataSource.code);
  const several = item.demos.length > 1;

  return (
    <DocsPage
      toc={data.toc}
      breadcrumb={{ includeRoot: true, includeSeparator: true }}
      footer={{ className: pageFooterClass, children: <DocsFooter /> }}
    >
      <PageTitle>{item.name}</PageTitle>
      <PageDescription>{item.description}</PageDescription>
      <DocsBody>
        {item.demos.map((demo, i) => (
          <div key={demo.name} className={several ? undefined : "mt-2"}>
            {several ? (
              <Heading as="h2" id={headingId("demo", demo.name)}>
                {demo.title}
              </Heading>
            ) : null}
            <DemoBlock
              slug={item.slug}
              name={item.name}
              demo={demo.name}
              title={demo.title}
              showTitle={false}
              preview={item.preview}
              code={
                <>
                  <SiteFilesNote code={demoSources[i].code} dataNeedsArt={dataNeedsArt} t={t.component} />
                  <SourceBlock
                    html={demoSources[i].html}
                    title={demoSources[i].path.split("/").pop()}
                    maxHeight={Math.max(item.preview.height, 480)}
                  />
                </>
              }
            />
          </div>
        ))}

        {item.files.length > 0 ? (
          <>
            <Heading as="h2" id="install">
              {t.component.install}
            </Heading>
            <Tabs items={[t.component.cli, t.component.url, t.component.manual]}>
              <Tab value={t.component.cli}>
                <Command code={installCommand(item.slug)} />
                <p>
                  {format(t.component.needsRegistry, {
                    registry: <C>{REGISTRY_NAMESPACE}</C>,
                    file: <C>components.json</C>,
                    link: <Link href={docsPath(locale, "/shadcn-cli")}>{t.component.usingCli}</Link>,
                  })}
                </p>
              </Tab>
              <Tab value={t.component.url}>
                <Command code={installUrlCommand(item.slug)} />
                <p>{t.component.withoutRegistry}</p>
              </Tab>
              <Tab value={t.component.manual}>
                <Manual item={item} locale={locale} t={t} />
              </Tab>
            </Tabs>
            {item.suspense ? <SuspenseNote item={item} t={t.component} /> : null}
          </>
        ) : null}

        {item.props.length > 0 ? (
          <>
            <Heading as="h2" id="props">
              {t.component.props}
            </Heading>
            {item.props.map((group) => {
              const id = headingId("props", group.component);
              return (
                <section key={group.component}>
                  <Heading as="h3" id={id} className="font-mono text-base font-medium">
                    {group.component}
                  </Heading>
                  <TypeTable id={`${id}-prop`} type={typeTable(group)} />
                </section>
              );
            })}
          </>
        ) : null}
      </DocsBody>
    </DocsPage>
  );
}
