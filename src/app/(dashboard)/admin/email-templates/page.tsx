import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Topbar } from "@/components/shell/topbar";
import { EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth/session";
import { resolveMemberNames } from "@/lib/data/leads";
import { createAdminClient } from "@/lib/supabase/admin";
import { TemplateEditor, type TemplateRow } from "./template-editor";
import { TemplateSearch } from "./template-search";

export const metadata: Metadata = { title: "Email templates · Khana Banao" };

export default async function EmailTemplatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [profile, raw] = await Promise.all([requireAdmin(), searchParams]);

  const rawQuery = Array.isArray(raw.q) ? raw.q[0] : raw.q;
  const query = rawQuery?.trim().toLowerCase() ?? "";

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("email_templates")
    .select(
      "id, template_key, name, subject, body_html, is_active, updated_at, updated_by",
    )
    .order("name");

  const names = await resolveMemberNames(
    (data ?? []).map((template) => template.updated_by),
  );

  // Filtered here rather than in SQL: fifteen rows, and matching the body too
  // means "which template mentions the payment link?" actually works.
  const templates: TemplateRow[] = (data ?? [])
    .filter(
      (template) =>
        !query ||
        template.name.toLowerCase().includes(query) ||
        template.template_key.toLowerCase().includes(query) ||
        template.subject.toLowerCase().includes(query) ||
        template.body_html.toLowerCase().includes(query),
    )
    .map((template) => ({
      id: template.id,
      template_key: template.template_key,
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
      is_active: template.is_active,
      updated_at: template.updated_at,
      updatedByName: template.updated_by
        ? (names.get(template.updated_by) ?? null)
        : null,
    }));

  return (
    <>
      <Topbar profile={profile} crumbs={[{ label: "Email templates" }]} />

      <main className="min-w-0 flex-1 px-4 py-6 md:px-6">
        <PageHeader
          title="Email templates"
          description={`${data?.length ?? 0} transactional templates. Edits take effect immediately — preview or send a test first.`}
        />

        <TemplateSearch />

        <div className="mt-5 space-y-4">
          {templates.length === 0 ? (
            <EmptyState
              title="No templates match that search"
              body="Try a different word, or clear the search to see all fifteen."
            />
          ) : (
            templates.map((template) => (
              <TemplateEditor key={template.id} template={template} />
            ))
          )}
        </div>
      </main>
    </>
  );
}
