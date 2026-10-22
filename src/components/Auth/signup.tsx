"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";

import { Button } from "~/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "~/components/ui/field";
import { Input } from "~/components/ui/input";
import { PasswordStrength } from "~/components/Auth/passwordStrength";
import { signupSchema, type SignupValues } from "~/lib/schemas/auth";
import { authClient } from "~/server/better-auth/client";
import GithubButton from "./SocialButtons/Github";
import { useUser } from "./userProvider";

export function SignupForm() {
  const router = useRouter();
  const user = useUser();

  if (user) {
    router.push("/app");
    return null;
  }

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", name: "" },
  });

  async function onSubmit({ email, password, name }: SignupValues) {
    await authClient.signUp.email(
      {
        email,
        password,
        name: name ?? "User", // Pass a default name or extract from email if required by your schema
        callbackURL: "/app",
      },
      {
        onError: (ctx) => {
          form.setError("root", {
            message:
              ctx.error.message ||
              "Failed to create account. Please try again.",
          });
        },
        onSuccess: () => {
          router.push("/app");
        },
      },
    );
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <FieldGroup>
        {/* Display general form/auth errors if any */}
        {form.formState.errors.root && (
          <div className="text-destructive mb-2 text-sm font-medium">
            {form.formState.errors.root.message}
          </div>
        )}

        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Name</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="text"
                placeholder="John Doe"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="email"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Email</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="password"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Password</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              <PasswordStrength
                value={field.value}
                showErrors={fieldState.invalid}
              />
            </Field>
          )}
        />
        <Controller
          name="confirmPassword"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={field.name}>Confirm password</FieldLabel>
              <Input
                {...field}
                id={field.name}
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Field>
          <GithubButton />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting
              ? "Creating account..."
              : "Create account"}
          </Button>
          <FieldDescription className="text-center">
            Already have an account?{" "}
            <Link href="/login" className="text-accent">
              Log in
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
