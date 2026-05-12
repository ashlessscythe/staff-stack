import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { prisma } from "@/lib/db";
import { uploadAttachmentAction } from "@/server/actions/files";
import { requireTenantShell } from "@/server/tenant-context";

export default async function FilesPage({ params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const shell = await requireTenantShell(tenantSlug);

  const files = await prisma.fileObject.findMany({
    where: { tenantId: shell.tenant.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      mimeType: true,
      byteSize: true,
      sha256: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Attachments</h1>
        <p className="text-sm text-zinc-500">
          MVP blob storage in Postgres (max 5MB). PNG, JPEG, PDF.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload</CardTitle>
          <CardDescription>Stored with SHA-256 metadata for integrity.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadAttachmentAction} className="space-y-4">
            <input type="hidden" name="tenantSlug" value={tenantSlug} />
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <input
                id="file"
                name="file"
                type="file"
                accept="image/png,image/jpeg,application/pdf"
                required
              />
            </div>
            <Button type="submit">Upload</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            {files.map((f) => (
              <li key={f.id} className="font-mono text-xs">
                {f.name} · {f.byteSize}b · {f.sha256.slice(0, 12)}…
              </li>
            ))}
            {files.length === 0 && <p className="text-zinc-500">No files yet.</p>}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
