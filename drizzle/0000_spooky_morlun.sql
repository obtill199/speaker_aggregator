CREATE TABLE `collector_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`started_at` integer NOT NULL,
	`finished_at` integer,
	`status` text DEFAULT 'running' NOT NULL,
	`discovered_count` integer DEFAULT 0 NOT NULL,
	`upserted_count` integer DEFAULT 0 NOT NULL,
	`error_message` text
);
--> statement-breakpoint
CREATE INDEX `collector_runs_source_started_idx` ON `collector_runs` (`source`,`started_at`);--> statement-breakpoint
CREATE TABLE `garage_items` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text,
	`title` text NOT NULL,
	`stage` text DEFAULT 'watching' NOT NULL,
	`purchase_price_cents` integer,
	`parts_cost_cents` integer DEFAULT 0 NOT NULL,
	`labor_hours` real DEFAULT 0 NOT NULL,
	`target_sale_cents` integer,
	`sold_price_cents` integer,
	`notes` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `garage_listing_unique` ON `garage_items` (`listing_id`);--> statement-breakpoint
CREATE INDEX `garage_stage_idx` ON `garage_items` (`stage`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`source_listing_id` text NOT NULL,
	`url` text NOT NULL,
	`title` text NOT NULL,
	`brand` text,
	`model` text,
	`category` text DEFAULT 'speaker' NOT NULL,
	`price_cents` integer,
	`shipping_cents` integer DEFAULT 0 NOT NULL,
	`location` text,
	`latitude` real,
	`longitude` real,
	`distance_miles` real,
	`condition` text,
	`description` text,
	`image_url` text,
	`posted_at` integer,
	`first_seen_at` integer NOT NULL,
	`last_seen_at` integer NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`is_vintage` integer DEFAULT true NOT NULL,
	`deal_score` real,
	`deal_grade` text,
	`confidence` text,
	`estimated_value_low_cents` integer,
	`estimated_value_high_cents` integer,
	`estimated_repair_cents` integer DEFAULT 0 NOT NULL,
	`estimated_profit_cents` integer,
	`risk_flags` text DEFAULT '[]' NOT NULL,
	`source_payload` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_source_listing_unique` ON `listings` (`source`,`source_listing_id`);--> statement-breakpoint
CREATE INDEX `listings_deal_score_idx` ON `listings` (`deal_score`);--> statement-breakpoint
CREATE INDEX `listings_last_seen_idx` ON `listings` (`last_seen_at`);--> statement-breakpoint
CREATE INDEX `listings_brand_category_idx` ON `listings` (`brand`,`category`);--> statement-breakpoint
CREATE TABLE `watch_rules` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`brand` text NOT NULL,
	`aliases` text DEFAULT '[]' NOT NULL,
	`max_price_cents` integer,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL
);
