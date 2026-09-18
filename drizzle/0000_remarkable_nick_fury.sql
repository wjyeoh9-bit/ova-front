CREATE TABLE `first_batch_signups` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`whatsapp` text,
	`items` text NOT NULL,
	`total_myr` integer NOT NULL,
	`attribution` text NOT NULL,
	`distinct_id` text NOT NULL,
	`consent_version` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `first_batch_signups_email_unique` ON `first_batch_signups` (`email`);--> statement-breakpoint
CREATE TABLE `signup_rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`window` integer NOT NULL,
	`count` integer NOT NULL
);
