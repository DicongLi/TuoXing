ALTER TABLE `aiAnalysisLogs` MODIFY COLUMN `entityType` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `aiAnalysisLogs` MODIFY COLUMN `result` text;--> statement-breakpoint
ALTER TABLE `aiAnalysisLogs` MODIFY COLUMN `status` varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `operatingStatus` varchar(100) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `stockExchange` varchar(64);--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `stockSymbol` varchar(32);--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `riskLevel` varchar(50) DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE `dataImports` MODIFY COLUMN `fileType` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `dataImports` MODIFY COLUMN `status` varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `deals` MODIFY COLUMN `status` varchar(50) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `newsItems` MODIFY COLUMN `sentiment` varchar(50) DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE `opportunities` MODIFY COLUMN `stage` varchar(50) DEFAULT 'lead';--> statement-breakpoint
ALTER TABLE `opportunities` MODIFY COLUMN `status` varchar(50) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `subsidiaries` MODIFY COLUMN `entityType` varchar(50) DEFAULT 'subsidiary';--> statement-breakpoint
ALTER TABLE `subsidiaries` MODIFY COLUMN `operatingStatus` varchar(50) DEFAULT 'active';--> statement-breakpoint
ALTER TABLE `subsidiaries` MODIFY COLUMN `relationshipType` varchar(50) DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` varchar(50) NOT NULL DEFAULT 'user';