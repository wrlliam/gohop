import z from "zod";

export const passwordRules = [
  {
    id: "length",
    label: "At least 7 characters",
    test: (v: string) => v.length >= 7,
  },
  {
    id: "lower",
    label: "A lowercase letter",
    test: (v: string) => /[a-z]/.test(v),
  },
  {
    id: "upper",
    label: "An uppercase letter",
    test: (v: string) => /[A-Z]/.test(v),
  },
  {
    id: "symbol",
    label: "A symbol (e.g. ! @ # $)",
    test: (v: string) => /[^A-Za-z0-9\s]/.test(v),
  },
] as const;

const email = z.email({ error: "Please provide a valid email address." });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, { error: "Please provide a password." }),
});

export const signupSchema = z
  .object({
    email,
    name: z.string(),
    password: z
      .string()
      .refine((v) => passwordRules.every((rule) => rule.test(v)), {
        error: "Password doesn't meet all the requirements.",
      }),
    confirmPassword: z
      .string()
      .min(1, { error: "Please confirm your password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    error: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type SignupValues = z.infer<typeof signupSchema>;
