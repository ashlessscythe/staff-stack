"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type ApiKeyFormState, createApiKeyAction } from "@/server/actions/api-keys";
import { useActionState } from "react";

const initial: ApiKeyFormState = {};

export function CreateApiKeyForm({ tenantSlug }: { tenantSlug: string }) {
  const [state, action] = useActionState(createApiKeyAction, initial);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create API key</CardTitle>
        <CardDescription>
          Premium: tenant must have `apiKeys` in features (see neon-cyber demo).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={action} className="space-y-4">
          <input type="hidden" name="tenantSlug" value={tenantSlug} />
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="CI bot" />
          </div>
          <Button type="submit">Generate</Button>
        </form>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state.token && (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-900 dark:bg-amber-950">
            <p className="font-medium text-amber-900 dark:text-amber-100">Copy this token now:</p>
            <code className="mt-2 block break-all text-xs">{state.token}</code>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
