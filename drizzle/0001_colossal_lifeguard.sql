ALTER TABLE `garage_items` ADD `reference_key` text DEFAULT '' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `garage_reference_unique` ON `garage_items` (`reference_key`);
