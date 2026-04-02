CREATE TABLE `ai_recommendations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`project_id` varchar(50),
	`product_name` varchar(255),
	`rank` int,
	`confidence` varchar(20),
	`ai_score` decimal(10,4),
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `ai_recommendations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` int AUTO_INCREMENT NOT NULL,
	`original_id` varchar(50),
	`name` varchar(255),
	`investment` decimal(20,2),
	`country` varchar(100),
	`sector` varchar(100),
	`stage` varchar(50),
	`contractor` varchar(255),
	`start_date` timestamp,
	`summary` text,
	`created_at` timestamp DEFAULT (now()),
	CONSTRAINT `projects_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `aiAnalysisLogs` ADD `result` json;--> statement-breakpoint
ALTER TABLE `aiAnalysisLogs` ADD `errorMessage` text;