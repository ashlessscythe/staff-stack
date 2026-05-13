import { describe, expect, it } from "vitest";

import {
  renderRegistrationPendingEmailHtml,
  renderWorkspaceAccessApprovedEmailHtml,
} from "./templates";

describe("email templates", () => {
  it("escapes HTML in registration name", () => {
    const html = renderRegistrationPendingEmailHtml({
      email: "safe@example.com",
      name: '<img src=x onerror="alert(1)">',
    });
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("escapes tenant and role copy in workspace approved template", () => {
    const html = renderWorkspaceAccessApprovedEmailHtml({
      tenantName: "Evil <script>",
      tenantSlug: "nice-slug",
      role: "EMPLOYEE",
      recipientName: null,
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("/t/nice-slug/dashboard");
  });
});
