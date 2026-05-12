"use server";

import crypto from "node:crypto";

import { revalidatePath } from "next/cache";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/server/audit";
import { requireTenantShell } from "@/server/tenant-context";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = new Set(["image/png", "image/jpeg", "application/pdf"]);

export async function uploadAttachmentAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const shell = await requireTenantShell(tenantSlug);

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Missing file");
  if (file.size > MAX_BYTES) throw new Error("File too large");
  if (!ALLOWED.has(file.type)) throw new Error("Unsupported type");

  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");

  await prisma.fileObject.create({
    data: {
      tenantId: shell.tenant.id,
      ownerUserId: session.user.id,
      name: file.name.slice(0, 200),
      mimeType: file.type,
      byteSize: buf.length,
      data: buf,
      sha256,
    },
  });

  await writeAuditLog({
    tenantId: shell.tenant.id,
    actorUserId: session.user.id,
    action: "file.upload",
    entityType: "FileObject",
    metadata: { name: file.name, sha256 },
  });

  revalidatePath(`/t/${tenantSlug}/files`);
}
