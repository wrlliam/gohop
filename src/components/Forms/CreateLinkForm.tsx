"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon } from "@phosphor-icons/react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Switch } from "~/components/ui/switch";
import { createLinkSchema, type CreateLinkValues } from "~/lib/schemas/link";

type ApiResponse = {
  error?: string;
  field?: keyof CreateLinkValues;
  shortUrl?: string;
};

const defaultValues: CreateLinkValues = {
  url: "",
  slug: "",
  name: "",
  maxViews: null,
  password: "",
  isActive: true,
  expiresAt: null,
};

// Calendar gives us midnight; make the link last through the whole chosen day.
function endOfDayMs(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function CreateLinkForm() {
  const form = useForm<CreateLinkValues>({
    resolver: zodResolver(createLinkSchema),
    defaultValues,
  });

  async function onSubmit(data: CreateLinkValues) {
    const toastId = toast.loading("Creating link...");

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = (await res.json().catch(() => ({}))) as ApiResponse;

      if (!res.ok) {
        if (json.field && json.field in defaultValues) {
          form.setError(json.field, { message: json.error });
        }
        toast.error(json.error ?? "Something went wrong", { id: toastId });
        return;
      }

      toast.success("Link created", {
        id: toastId,
        description: json.shortUrl,
        action: json.shortUrl
          ? {
              label: "Copy",
              onClick: () => void navigator.clipboard.writeText(json.shortUrl!),
            }
          : undefined,
      });
      form.reset(defaultValues);
    } catch {
      toast.error("Network error, please try again", { id: toastId });
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="w-full">
      <FieldGroup>
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Name (optional)</FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="Summer campaign"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Only you can see this. It helps you tell your links apart.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="url"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Destination URL</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="text"
                inputMode="url"
                placeholder="https://example.com/my-page"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="slug"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>
                Custom alias (optional)
              </FieldLabel>
              <Input
                {...field}
                id={field.name}
                placeholder="my-link"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Leave blank and we&apos;ll generate one for you.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="maxViews"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Max views (optional)</FieldLabel>
              <Input
                id={field.name}
                name={field.name}
                ref={field.ref}
                onBlur={field.onBlur}
                type="number"
                inputMode="numeric"
                min={1}
                step={1}
                placeholder="Unlimited"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(
                    e.target.value === "" ? null : Number(e.target.value),
                  )
                }
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Leave blank for unlimited views.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="expiresAt"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Expires (optional)</FieldLabel>
              <div className="flex flex-row gap-2">
                <Popover>
                  <PopoverTrigger>
                    <Button
                      id={field.name}
                      type="button"
                      variant="outline"
                      className="flex-1 justify-start font-normal"
                    >
                      <CalendarIcon className="mr-2 size-4" />
                      {field.value
                        ? new Date(field.value).toLocaleDateString(undefined, {
                            dateStyle: "long",
                          })
                        : "Never expires"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value ? new Date(field.value) : undefined}
                      onSelect={(date) =>
                        field.onChange(date ? endOfDayMs(date) : null)
                      }
                      disabled={{ before: today }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                {field.value !== null && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => field.onChange(null)}
                  >
                    Clear
                  </Button>
                )}
              </div>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Password (optional)</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>
                Visitors will need this to open the link.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="isActive"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel htmlFor={field.name}>Active</FieldLabel>
                <FieldDescription>
                  Inactive links won&apos;t redirect until you turn them on.
                </FieldDescription>
              </FieldContent>
              <Switch
                id={field.name}
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </Field>
          )}
        />

        <Field>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Creating..." : "Create link"}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}
