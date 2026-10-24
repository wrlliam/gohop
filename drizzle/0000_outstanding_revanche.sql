CREATE TABLE `account` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`accountId` text(255) NOT NULL,
	`providerId` text(255) NOT NULL,
	`accessToken` text,
	`refreshToken` text,
	`accessTokenExpiresAt` integer,
	`refreshTokenExpiresAt` integer,
	`scope` text(255),
	`idToken` text,
	`password` text,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE TABLE `ledger_entry` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`linkId` integer,
	`periodId` integer,
	`payoutId` integer,
	`type` text NOT NULL,
	`amountMinor` integer NOT NULL,
	`grossMinor` integer,
	`feeMinor` integer,
	`feeBps` integer,
	`billableViews` integer,
	`availableAt` integer NOT NULL,
	`note` text(512),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`linkId`) REFERENCES `link_redirects`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`periodId`) REFERENCES `revenue_period`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`payoutId`) REFERENCES `payout`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ledger_user_idx` ON `ledger_entry` (`userId`,`availableAt`);--> statement-breakpoint
CREATE INDEX `ledger_link_idx` ON `ledger_entry` (`linkId`);--> statement-breakpoint
CREATE UNIQUE INDEX `ledger_period_link_type_idx` ON `ledger_entry` (`periodId`,`linkId`,`type`);--> statement-breakpoint
CREATE TABLE `payout` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`userId` text(255) NOT NULL,
	`amountMinor` integer NOT NULL,
	`feeMinor` integer NOT NULL,
	`currency` text(3) NOT NULL,
	`status` text DEFAULT 'processing' NOT NULL,
	`stripeTransferId` text(255),
	`failureReason` text(512),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`completedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `payout_user_idx` ON `payout` (`userId`,`createdAt`);--> statement-breakpoint
CREATE TABLE `payout_account` (
	`userId` text(255) PRIMARY KEY NOT NULL,
	`stripeAccountId` text(255) NOT NULL,
	`detailsSubmitted` integer DEFAULT false NOT NULL,
	`payoutsEnabled` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payout_account_stripeAccountId_unique` ON `payout_account` (`stripeAccountId`);--> statement-breakpoint
CREATE TABLE `platform_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`platformFeeBps` integer DEFAULT 1000 NOT NULL,
	`withdrawalFeeMinor` integer DEFAULT 50 NOT NULL,
	`minWithdrawalMinor` integer DEFAULT 1000 NOT NULL,
	`holdDays` integer DEFAULT 35 NOT NULL,
	`currency` text(3) DEFAULT 'usd' NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE TABLE `link_redirects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256),
	`redirectedLink` text(2048) NOT NULL,
	`code` text(64) NOT NULL,
	`createdById` text(255) NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`maxUses` integer,
	`expiresAt` integer,
	`password` text(256),
	`monetisationEnabled` integer DEFAULT true NOT NULL,
	`viewCount` integer DEFAULT 0 NOT NULL,
	`uniqueViewCount` integer DEFAULT 0 NOT NULL,
	`billableViewCount` integer DEFAULT 0 NOT NULL,
	`lastViewedAt` integer,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`createdById`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `link_redirects_code_unique` ON `link_redirects` (`code`);--> statement-breakpoint
CREATE INDEX `link_redirects_created_by_idx` ON `link_redirects` (`createdById`);--> statement-breakpoint
CREATE INDEX `link_redirects_name_idx` ON `link_redirects` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `link_redirects_code_idx` ON `link_redirects` (`code`);--> statement-breakpoint
CREATE TABLE `revenue_period` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`startsAt` integer NOT NULL,
	`endsAt` integer NOT NULL,
	`grossRevenueMinor` integer NOT NULL,
	`totalBillableViews` integer NOT NULL,
	`feeBps` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `revenue_period_starts_idx` ON `revenue_period` (`startsAt`);--> statement-breakpoint
CREATE TABLE `session` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`userId` text(255) NOT NULL,
	`token` text(255) NOT NULL,
	`expiresAt` integer NOT NULL,
	`ipAddress` text(255),
	`userAgent` text(255),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer,
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`userId`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`name` text(255),
	`email` text(255) NOT NULL,
	`emailVerified` integer DEFAULT false,
	`image` text(255),
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_email_unique` ON `user` (`email`);--> statement-breakpoint
CREATE TABLE `verification` (
	`id` text(255) PRIMARY KEY NOT NULL,
	`identifier` text(255) NOT NULL,
	`value` text(255) NOT NULL,
	`expiresAt` integer NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	`updatedAt` integer
);
--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE TABLE `link_view` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`linkId` integer NOT NULL,
	`viewerId` text(255),
	`visitorHash` text(64) NOT NULL,
	`ipHash` text(64),
	`impressionAt` integer,
	`referrer` text(2048),
	`referrerDomain` text(255),
	`utmSource` text(255),
	`utmMedium` text(255),
	`utmCampaign` text(255),
	`country` text(2),
	`region` text(255),
	`city` text(255),
	`userAgent` text(512),
	`browser` text(64),
	`os` text(64),
	`deviceType` text DEFAULT 'unknown' NOT NULL,
	`isUnique` integer DEFAULT false NOT NULL,
	`isBot` integer DEFAULT false NOT NULL,
	`isBillable` integer DEFAULT false NOT NULL,
	`createdAt` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`linkId`) REFERENCES `link_redirects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`viewerId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `link_view_link_created_idx` ON `link_view` (`linkId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `link_view_link_visitor_idx` ON `link_view` (`linkId`,`visitorHash`);--> statement-breakpoint
CREATE INDEX `link_view_viewer_idx` ON `link_view` (`viewerId`);--> statement-breakpoint
CREATE INDEX `link_view_country_idx` ON `link_view` (`linkId`,`country`);--> statement-breakpoint
CREATE INDEX `link_view_referrer_idx` ON `link_view` (`linkId`,`referrerDomain`);--> statement-breakpoint
CREATE INDEX `link_view_ip_idx` ON `link_view` (`ipHash`,`isBillable`,`createdAt`);--> statement-breakpoint
CREATE INDEX `link_view_link_ip_idx` ON `link_view` (`linkId`,`ipHash`,`createdAt`);