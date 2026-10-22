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
ALTER TABLE `link_redirects` ADD `monetisationEnabled` integer DEFAULT true NOT NULL;