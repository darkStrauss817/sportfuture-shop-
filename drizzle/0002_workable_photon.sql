CREATE TABLE `couponClaims` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`email` varchar(320) NOT NULL,
	`orderId` int NOT NULL,
	`status` enum('reserved','redeemed') NOT NULL DEFAULT 'reserved',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`redeemedAt` timestamp,
	CONSTRAINT `couponClaims_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_claim_email_code_unique` UNIQUE(`email`,`code`)
);
--> statement-breakpoint
CREATE TABLE `orderItems` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderId` int NOT NULL,
	`productId` int NOT NULL,
	`variantId` int NOT NULL,
	`productTitle` text NOT NULL,
	`variantTitle` varchar(255) NOT NULL,
	`quantity` int NOT NULL,
	`unitAmountCents` int NOT NULL,
	CONSTRAINT `orderItems_id` PRIMARY KEY(`id`)
);
