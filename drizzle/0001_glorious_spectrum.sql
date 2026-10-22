CREATE TABLE `link_redirects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text(256),
	`redirectedLink` text(2048) NOT NULL,
	`code` text(64) NOT NULL,
	`createdById` text(255) NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`maxUses` integer,
	`expiresAt` integer,
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
CREATE TABLE `link_view` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`linkId` integer NOT NULL,
	`viewerId` text(255),
	`visitorHash` text(64) NOT NULL,
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
DROP TABLE `post`;--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_account` (
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
INSERT INTO `__new_account`("id", "userId", "accountId", "providerId", "accessToken", "refreshToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "idToken", "password", "createdAt", "updatedAt") SELECT "id", "userId", "accountId", "providerId", "accessToken", "refreshToken", "accessTokenExpiresAt", "refreshTokenExpiresAt", "scope", "idToken", "password", "createdAt", "updatedAt" FROM `account`;--> statement-breakpoint
DROP TABLE `account`;--> statement-breakpoint
ALTER TABLE `__new_account` RENAME TO `account`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `account_user_id_idx` ON `account` (`userId`);--> statement-breakpoint
CREATE TABLE `__new_session` (
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
INSERT INTO `__new_session`("id", "userId", "token", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt") SELECT "id", "userId", "token", "expiresAt", "ipAddress", "userAgent", "createdAt", "updatedAt" FROM `session`;--> statement-breakpoint
DROP TABLE `session`;--> statement-breakpoint
ALTER TABLE `__new_session` RENAME TO `session`;--> statement-breakpoint
CREATE UNIQUE INDEX `session_token_unique` ON `session` (`token`);--> statement-breakpoint
CREATE INDEX `session_user_id_idx` ON `session` (`userId`);