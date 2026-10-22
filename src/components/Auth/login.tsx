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
import { loginSchema, type LoginValues } from "~/lib/schemas/auth";
import { authClient } from "~/server/better-auth/client";
import GithubButton from "./SocialButtons/Github";
import { useUser } from "./userProvider";

export function LoginForm() {
  const router = useRouter();
  const user = useUser();

  if (user) {
    router.push("/app");
    return null;
  }

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: LoginValues) {
    await authClient.signIn.email(
      {
        email: data.email,
        password: data.password,
        callbackURL: "/app",
      },
      {
        onError: (ctx) => {
          // Handle login error (e.g. invalid credentials)
          form.setError("root", {
            message:
              ctx.error.message ||
              "Failed to log in. Please check your credentials.",
          });
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
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Field>
          <GithubButton />
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Logging in..." : "Log in"}
          </Button>
          <FieldDescription className="text-center">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-accent">
              Sign up
            </Link>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
