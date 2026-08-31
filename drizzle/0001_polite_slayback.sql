CREATE TABLE `couponRedemptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(32) NOT NULL,
	`email` varchar(320) NOT NULL,
	`orderId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `couponRedemptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupon_email_code_unique` UNIQUE(`email`,`code`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(320) NOT NULL,
	`userId` int,
	`stripeCheckoutSessionId` varchar(255) NOT NULL,
	`stripePaymentIntentId` varchar(255),
	`status` enum('pending','paid','cancelled') NOT NULL DEFAULT 'pending',
	`subtotalCents` int NOT NULL,
	`shippingCents` int NOT NULL,
	`totalCents` int NOT NULL,
	`currency` varchar(3) NOT NULL DEFAULT 'eur',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`paidAt` timestamp,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_stripeCheckoutSessionId_unique` UNIQUE(`stripeCheckoutSessionId`)
);
