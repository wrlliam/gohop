"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { PencilSimpleIcon } from "@phosphor-icons/react";

import { updateLink } from "~/server/actions/update-link";
import { Button } from "~/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { Switch } from "~/components/ui/switch";

export type EditableLink = {
  code: string;
  name: string | null;
  redirectedLink: string;
  isActive: boolean;
  maxUses: number | null;
  viewCount: number;
  /** Never pass the hash itself to the client, only whether one exists. */
  hasPassword: boolean;
};

const isHttpUrl = (value: string) => {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

const formSchema = z
  .object({
    name: z.string().max(256, "Keep the name under 256 characters"),
    redirectedLink: z
      .string()
      .trim()
      .min(1, "Destination URL is required")
      .max(2048, "URL is too long")
      .refine(isHttpUrl, "Enter a valid http(s) URL"),
    isActive: z.boolean(),
    maxUses: z
      .string()
      .trim()
      .refine(
        (v) => v === "" || /^[1-9]\d{0,9}$/.test(v),
        "Enter a whole number of 1 or more, or leave blank for unlimited",
      ),
    passwordMode: z.enum(["keep", "set", "remove"]),
    newPassword: z.string().max(256, "Password is too long"),
  })
  .refine((d) => d.passwordMode !== "set" || d.newPassword.length > 0, {
    path: ["newPassword"],
    message: "Enter a password",
  });

type FormValues = z.infer<typeof formSchema>;

// Server-side error paths -> form field names
const SERVER_FIELD_MAP: Record<string, keyof FormValues> = {
  name: "name",
  redirectedLink: "redirectedLink",
  isActive: "isActive",
  maxUses: "maxUses",
  "password.value": "newPassword",
};

export function EditLinkDialog({ link }: { link: EditableLink }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const defaults: FormValues = {
    name: link.name ?? "",
    redirectedLink: link.redirectedLink,
    isActive: link.isActive,
    maxUses: link.maxUses ? String(link.maxUses) : "",
    passwordMode: "keep",
    newPassword: "",
  };

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: defaults,
  });

  const maxUsesValue = form.watch("maxUses");
  const parsedMax = /^[1-9]\d*$/.test(maxUsesValue)
    ? Number(maxUsesValue)
    : null;
  const limitAlreadyReached = parsedMax !== null && parsedMax <= link.viewCount;

  const passwordOptions: {
    value: FormValues["passwordMode"];
    label: string;
  }[] = link.hasPassword
    ? [
        { value: "keep", label: "Keep current" },
        { value: "set", label: "Change" },
        { value: "remove", label: "Remove" },
      ]
    : [
        { value: "keep", label: "No password" },
        { value: "set", label: "Set password" },
      ];

  async function onSubmit(values: FormValues) {
    const result = await updateLink(link.code, {
      name: values.name,
      redirectedLink: values.redirectedLink,
      isActive: values.isActive,
      maxUses: values.maxUses === "" ? null : Number(values.maxUses),
      password:
        values.passwordMode === "set"
          ? { mode: "set", value: values.newPassword }
          : { mode: values.passwordMode },
    });

    if (!result.ok) {
      for (const [path, message] of Object.entries(result.fieldErrors ?? {})) {
        const field = SERVER_FIELD_MAP[path];
        if (field) form.setError(field, { message });
      }
      toast.error(result.error);
      return;
    }

    toast.success("Link updated");
    setOpen(false);
    form.reset({ ...values, passwordMode: "keep", newPassword: "" });
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) form.reset(defaults);
      }}
    >
      <DialogTrigger>
        <Button variant="outline" size="sm" className="gap-2">
          <PencilSimpleIcon className="h-4 w-4" /> Edit link
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit link</DialogTitle>
          <DialogDescription>
            Changes apply to /~/{link.code} straight away. Your existing stats
            are kept.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FieldGroup>
            <Controller
              name="name"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-name">Name</FieldLabel>
                  <Input
                    {...field}
                    id="edit-name"
                    placeholder="Untitled link"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Only for you, to tell your links apart.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="redirectedLink"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-url">Destination URL</FieldLabel>
                  <Input
                    {...field}
                    id="edit-url"
                    type="url"
                    inputMode="url"
                    placeholder="https://example.com"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    Visitors are sent here from now on.
                  </FieldDescription>
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="maxUses"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="edit-max">Max views</FieldLabel>
                  <Input
                    {...field}
                    id="edit-max"
                    inputMode="numeric"
                    placeholder="Unlimited"
                    aria-invalid={fieldState.invalid}
                  />
                  <FieldDescription>
                    {link.viewCount.toLocaleString()} used so far. Leave blank
                    for unlimited.
                  </FieldDescription>
                  {limitAlreadyReached && !fieldState.invalid && (
                    <p className="text-destructive text-sm">
                      This is at or below the current view count, so the link
                      will stop working immediately.
                    </p>
                  )}
                  {fieldState.invalid && (
                    <FieldError errors={[fieldState.error]} />
                  )}
                </Field>
              )}
            />

            <Controller
              name="passwordMode"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <div
                    role="radiogroup"
                    aria-label="Password protection"
                    className="flex flex-wrap gap-2"
                  >
                    {passwordOptions.map((opt) => (
                      <Button
                        key={opt.value}
                        type="button"
                        size="sm"
                        role="radio"
                        aria-checked={field.value === opt.value}
                        variant={
                          field.value === opt.value ? "default" : "outline"
                        }
                        onClick={() => field.onChange(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </Field>
              )}
            />

            {form.watch("passwordMode") === "set" && (
              <Controller
                name="newPassword"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="edit-password">
                      {link.hasPassword ? "New password" : "Password"}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="edit-password"
                      type="password"
                      autoComplete="new-password"
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldDescription>
                      Visitors must enter this before they&apos;re redirected.
                    </FieldDescription>
                    {fieldState.invalid && (
                      <FieldError errors={[fieldState.error]} />
                    )}
                  </Field>
                )}
              />
            )}

            <Controller
              name="isActive"
              control={form.control}
              render={({ field }) => (
                <Field orientation="horizontal">
                  <div className="flex-1 space-y-1">
                    <FieldLabel htmlFor="edit-active">Active</FieldLabel>
                    <FieldDescription>
                      Turn off to stop the link working without deleting it.
                    </FieldDescription>
                  </div>
                  <Switch
                    id="edit-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </Field>
              )}
            />
          </FieldGroup>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                form.reset(defaults);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
