import { z } from "zod";
import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";
import { RESERVED_SLUGS, isBlockedDomain } from "~/lib/link-rules";

const URL_REGEX =
  /^https?:\/\/(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})(?::\d{1,5})?(?:[/?#]\S*)?$/i;

const SLUG_REGEX = /^[a-z0-9][a-z0-9_-]{2,31}$/i;

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

function hasProfanity(value: string) {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // keep raw value if it isn't valid percent-encoding
  }
  return matcher.hasMatch(decoded);
}

function hostOf(value: string) {
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

export const createLinkSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, "Enter a URL")
    .max(2048, "URL is too long")
    .regex(URL_REGEX, "Enter a valid http(s) URL, like https://example.com")
    .refine((v) => {
      const host = hostOf(v);
      return host === null || !isBlockedDomain(host);
    }, "Links to other URL shorteners or redirect services aren't allowed")
    .refine(
      (v) => !hasProfanity(v),
      "This URL contains language that isn't allowed",
    ),

  slug: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || SLUG_REGEX.test(v),
      "3-32 characters: letters, numbers, - and _ only",
    )
    .refine(
      (v) => !RESERVED_SLUGS.has(v.toLowerCase()),
      "That alias is reserved",
    )
    .refine(
      (v) => !hasProfanity(v),
      "That alias contains language that isn't allowed",
    ),

  name: z.string().trim().max(64, "Name must be 64 characters or fewer"),

  maxViews: z
    .number()
    .int("Must be a whole number")
    .min(1, "Must be at least 1")
    .max(1_000_000_000, "That's too many views")
    .nullable(),

  password: z
    .string()
    .max(128, "Password is too long")
    .refine((v) => v === "" || v.length >= 4, "Use at least 4 characters"),

  isActive: z.boolean(),

  expiresAt: z
    .number()
    .int()
    .positive()
    .nullable()
    .refine(
      (v) => v === null || v > Date.now(),
      "Expiry must be in the future",
    ),
});

export type CreateLinkValues = z.infer<typeof createLinkSchema>;
