-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: 172.27.253.29    Database: nhaxinhf12
-- ------------------------------------------------------
-- Server version	8.0.46-0ubuntu0.24.04.4

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_audit_logs`
--

DROP TABLE IF EXISTS `admin_audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_audit_logs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `admin_id` bigint DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(80) NOT NULL,
  `entity_id` varchar(80) DEFAULT NULL,
  `before_data` json DEFAULT NULL,
  `after_data` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_admin_audit_logs_entity` (`entity_type`,`entity_id`,`created_at`),
  KEY `ix_admin_audit_logs_admin_date` (`admin_id`,`created_at`),
  CONSTRAINT `fk_admin_audit_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_audit_logs`
--

LOCK TABLES `admin_audit_logs` WRITE;
/*!40000 ALTER TABLE `admin_audit_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blog_articles`
--

DROP TABLE IF EXISTS `blog_articles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blog_articles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `author_admin_id` bigint DEFAULT NULL,
  `title` varchar(240) NOT NULL,
  `slug` varchar(260) NOT NULL,
  `excerpt` varchar(800) DEFAULT NULL,
  `content` longtext NOT NULL,
  `cover_image_url` varchar(1000) DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'DRAFT',
  `published_at` datetime DEFAULT NULL,
  `seo_title` varchar(240) DEFAULT NULL,
  `seo_description` varchar(600) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_blog_articles_slug` (`slug`),
  KEY `fk_blog_articles_author` (`author_admin_id`),
  KEY `ix_blog_articles_status_published` (`status`,`published_at`),
  FULLTEXT KEY `fx_blog_articles_search` (`title`,`excerpt`,`content`),
  CONSTRAINT `fk_blog_articles_author` FOREIGN KEY (`author_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_blog_articles_status` CHECK ((`status` in (_utf8mb4'DRAFT',_utf8mb4'PUBLISHED',_utf8mb4'ARCHIVED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blog_articles`
--

LOCK TABLES `blog_articles` WRITE;
/*!40000 ALTER TABLE `blog_articles` DISABLE KEYS */;
/*!40000 ALTER TABLE `blog_articles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `brands`
--

DROP TABLE IF EXISTS `brands`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `brands` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `description` text,
  `logo_url` varchar(1000) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_brands_slug` (`slug`),
  KEY `ix_brands_active_name` (`is_active`,`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `brands`
--

LOCK TABLES `brands` WRITE;
/*!40000 ALTER TABLE `brands` DISABLE KEYS */;
INSERT INTO `brands` VALUES (1,'Calligaris','calligaris',NULL,NULL,1,'2026-10-09 03:48:32','2026-10-09 03:48:32'),(2,'La-Z-Boy','la-z-boy',NULL,NULL,1,'2026-10-09 03:48:32','2026-10-09 03:48:32');
/*!40000 ALTER TABLE `brands` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `cart_items`
--

DROP TABLE IF EXISTS `cart_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cart_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `cart_id` bigint NOT NULL,
  `variant_id` bigint NOT NULL,
  `quantity` int unsigned NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cart_items_variant` (`cart_id`,`variant_id`),
  KEY `ix_cart_items_variant` (`variant_id`),
  CONSTRAINT `fk_cart_items_cart` FOREIGN KEY (`cart_id`) REFERENCES `carts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cart_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_cart_items_quantity` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `cart_items`
--

LOCK TABLES `cart_items` WRITE;
/*!40000 ALTER TABLE `cart_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `cart_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `carts`
--

DROP TABLE IF EXISTS `carts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `carts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` bigint DEFAULT NULL,
  `guest_token_hash` char(64) DEFAULT NULL,
  `currency` char(3) NOT NULL DEFAULT 'VND',
  `expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_carts_guest_token` (`guest_token_hash`),
  KEY `ix_carts_customer_updated` (`customer_id`,`updated_at`),
  KEY `ix_carts_expiry` (`expires_at`),
  CONSTRAINT `fk_carts_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `carts`
--

LOCK TABLES `carts` WRITE;
/*!40000 ALTER TABLE `carts` DISABLE KEYS */;
/*!40000 ALTER TABLE `carts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `parent_id` bigint DEFAULT NULL,
  `name` varchar(160) NOT NULL,
  `slug` varchar(180) NOT NULL,
  `description` text,
  `image_url` varchar(1000) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categories_slug` (`slug`),
  KEY `ix_categories_parent_sort` (`parent_id`,`is_active`,`sort_order`),
  CONSTRAINT `fk_categories_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,NULL,'Sofa','sofa',NULL,NULL,10,1,'2026-10-09 03:48:32','2026-10-09 03:48:32'),(2,NULL,'Ghế','ghe',NULL,NULL,20,1,'2026-10-09 03:48:32','2026-10-09 03:48:32'),(3,NULL,'Bàn','ban',NULL,NULL,30,1,'2026-10-09 03:48:32','2026-10-09 03:48:32'),(4,NULL,'Tủ và kệ','tu-va-ke',NULL,NULL,40,1,'2026-10-09 03:48:32','2026-10-09 03:48:32'),(5,NULL,'Giường và nệm','giuong-va-nem',NULL,NULL,50,1,'2026-10-09 03:48:32','2026-10-09 03:48:32'),(6,NULL,'Bếp','bep',NULL,NULL,60,1,'2026-10-09 03:48:32','2026-10-09 03:48:32'),(7,NULL,'Đèn và thảm','den-va-tham',NULL,NULL,70,1,'2026-10-09 03:48:32','2026-10-09 03:48:32'),(8,NULL,'Trang trí','trang-tri',NULL,NULL,80,1,'2026-10-09 03:48:32','2026-10-09 03:48:32'),(9,NULL,'Hương thơm và ngoại thất','huong-thom-va-ngoai-that',NULL,NULL,90,1,'2026-10-09 03:48:32','2026-10-09 03:48:32');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collection_products`
--

DROP TABLE IF EXISTS `collection_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collection_products` (
  `collection_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`collection_id`,`product_id`),
  KEY `ix_collection_products_product` (`product_id`,`collection_id`),
  CONSTRAINT `fk_collection_products_collection` FOREIGN KEY (`collection_id`) REFERENCES `collections` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_collection_products_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collection_products`
--

LOCK TABLES `collection_products` WRITE;
/*!40000 ALTER TABLE `collection_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `collection_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `collections`
--

DROP TABLE IF EXISTS `collections`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `collections` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(180) NOT NULL,
  `slug` varchar(200) NOT NULL,
  `description` text,
  `cover_image_url` varchar(1000) DEFAULT NULL,
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'DRAFT',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_collections_slug` (`slug`),
  KEY `ix_collections_status_dates` (`status`,`starts_at`,`ends_at`),
  CONSTRAINT `chk_collections_dates` CHECK (((`ends_at` is null) or (`starts_at` is null) or (`ends_at` > `starts_at`))),
  CONSTRAINT `chk_collections_status` CHECK ((`status` in (_utf8mb4'DRAFT',_utf8mb4'PUBLISHED',_utf8mb4'ARCHIVED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `collections`
--

LOCK TABLES `collections` WRITE;
/*!40000 ALTER TABLE `collections` DISABLE KEYS */;
/*!40000 ALTER TABLE `collections` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupon_redemptions`
--

DROP TABLE IF EXISTS `coupon_redemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupon_redemptions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `coupon_id` bigint NOT NULL,
  `customer_id` bigint DEFAULT NULL,
  `order_id` bigint NOT NULL,
  `discount_amount` decimal(14,2) NOT NULL,
  `redeemed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupon_redemptions_order` (`order_id`),
  KEY `fk_coupon_redemptions_customer` (`customer_id`),
  KEY `ix_coupon_redemptions_customer` (`coupon_id`,`customer_id`),
  CONSTRAINT `fk_coupon_redemptions_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_coupon_redemptions_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_coupon_redemptions_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_coupon_redemptions_amount` CHECK ((`discount_amount` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupon_redemptions`
--

LOCK TABLES `coupon_redemptions` WRITE;
/*!40000 ALTER TABLE `coupon_redemptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `coupon_redemptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `coupons`
--

DROP TABLE IF EXISTS `coupons`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `coupons` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `discount_type` varchar(20) NOT NULL,
  `discount_value` decimal(14,2) NOT NULL,
  `minimum_order_value` decimal(14,2) NOT NULL DEFAULT '0.00',
  `maximum_discount` decimal(14,2) DEFAULT NULL,
  `usage_limit` int unsigned DEFAULT NULL,
  `usage_per_customer` int unsigned DEFAULT NULL,
  `usage_count` int unsigned NOT NULL DEFAULT '0',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_coupons_code` (`code`),
  KEY `ix_coupons_active_dates` (`is_active`,`starts_at`,`ends_at`),
  CONSTRAINT `chk_coupons_dates` CHECK (((`ends_at` is null) or (`starts_at` is null) or (`ends_at` > `starts_at`))),
  CONSTRAINT `chk_coupons_discount_type` CHECK ((`discount_type` in (_utf8mb4'PERCENT',_utf8mb4'FIXED'))),
  CONSTRAINT `chk_coupons_discount_value` CHECK ((`discount_value` > 0)),
  CONSTRAINT `chk_coupons_max_discount` CHECK (((`maximum_discount` is null) or (`maximum_discount` >= 0))),
  CONSTRAINT `chk_coupons_minimum` CHECK ((`minimum_order_value` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `coupons`
--

LOCK TABLES `coupons` WRITE;
/*!40000 ALTER TABLE `coupons` DISABLE KEYS */;
/*!40000 ALTER TABLE `coupons` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_addresses`
--

DROP TABLE IF EXISTS `customer_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_addresses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `recipient_name` varchar(160) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `address_line` varchar(255) NOT NULL,
  `ward` varchar(120) DEFAULT NULL,
  `district` varchar(120) NOT NULL,
  `city` varchar(120) NOT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `address_type` varchar(20) NOT NULL DEFAULT 'SHIPPING',
  `is_default` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_customer_addresses_customer_default` (`customer_id`,`is_default`),
  CONSTRAINT `fk_customer_addresses_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_customer_addresses_type` CHECK ((`address_type` in (_utf8mb4'SHIPPING',_utf8mb4'BILLING')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_addresses`
--

LOCK TABLES `customer_addresses` WRITE;
/*!40000 ALTER TABLE `customer_addresses` DISABLE KEYS */;
/*!40000 ALTER TABLE `customer_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `password_hash` varchar(100) DEFAULT NULL,
  `full_name` varchar(160) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email_verified_at` datetime DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_customers_email` (`email`),
  KEY `ix_customers_phone` (`phone`),
  KEY `ix_customers_created` (`created_at`),
  CONSTRAINT `chk_customers_status` CHECK ((`status` in (_utf8mb4'ACTIVE',_utf8mb4'LOCKED',_utf8mb4'DELETED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `design_consultations`
--

DROP TABLE IF EXISTS `design_consultations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `design_consultations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chain_id` bigint DEFAULT NULL,
  `customer_id` bigint DEFAULT NULL,
  `assigned_admin_id` bigint DEFAULT NULL,
  `preferred_store_id` bigint DEFAULT NULL,
  `customer_name` varchar(160) NOT NULL,
  `customer_email` varchar(254) DEFAULT NULL,
  `customer_phone` varchar(30) NOT NULL,
  `room_type` varchar(60) DEFAULT NULL,
  `budget_min` decimal(14,2) DEFAULT NULL,
  `budget_max` decimal(14,2) DEFAULT NULL,
  `preferred_contact_time` varchar(120) DEFAULT NULL,
  `message` text NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'NEW',
  `internal_note` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_design_consultations_admin` (`assigned_admin_id`),
  KEY `ix_design_consultations_status_date` (`status`,`created_at`),
  KEY `ix_design_consultations_customer` (`customer_id`,`created_at`),
  KEY `fk_design_consultations_chain` (`chain_id`),
  CONSTRAINT `fk_design_consultations_admin` FOREIGN KEY (`assigned_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_design_consultations_chain` FOREIGN KEY (`chain_id`) REFERENCES `retail_chains` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_design_consultations_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_design_consultations_budget` CHECK ((((`budget_min` is null) or (`budget_min` >= 0)) and ((`budget_max` is null) or (`budget_max` >= 0)) and ((`budget_max` is null) or (`budget_min` is null) or (`budget_max` >= `budget_min`)))),
  CONSTRAINT `chk_design_consultations_status` CHECK ((`status` in (_utf8mb4'NEW',_utf8mb4'CONTACTED',_utf8mb4'IN_PROGRESS',_utf8mb4'COMPLETED',_utf8mb4'CANCELLED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `design_consultations`
--

LOCK TABLES `design_consultations` WRITE;
/*!40000 ALTER TABLE `design_consultations` DISABLE KEYS */;
/*!40000 ALTER TABLE `design_consultations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flyway_schema_history`
--

DROP TABLE IF EXISTS `flyway_schema_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flyway_schema_history` (
  `installed_rank` int NOT NULL,
  `version` varchar(50) DEFAULT NULL,
  `description` varchar(200) NOT NULL,
  `type` varchar(20) NOT NULL,
  `script` varchar(1000) NOT NULL,
  `checksum` int DEFAULT NULL,
  `installed_by` varchar(100) NOT NULL,
  `installed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `execution_time` int NOT NULL,
  `success` tinyint(1) NOT NULL,
  PRIMARY KEY (`installed_rank`),
  KEY `flyway_schema_history_s_idx` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flyway_schema_history`
--

LOCK TABLES `flyway_schema_history` WRITE;
/*!40000 ALTER TABLE `flyway_schema_history` DISABLE KEYS */;
INSERT INTO `flyway_schema_history` VALUES (1,'1','create policy and admin tables','SQL','V1__create_policy_and_admin_tables.sql',632238150,'trunghieu','2026-10-09 03:48:30',81,1),(2,'2','create furniture commerce schema','SQL','V2__create_furniture_commerce_schema.sql',1846324171,'trunghieu','2026-10-09 03:48:32',1843,1),(3,'3','add multichannel support and retail chain','SQL','V3__add_multichannel_support_and_retail_chain.sql',153216593,'trunghieu','2026-10-09 03:48:32',440,0);
/*!40000 ALTER TABLE `flyway_schema_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `hero_slides`
--

DROP TABLE IF EXISTS `hero_slides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hero_slides` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(240) NOT NULL,
  `subtitle` varchar(240) DEFAULT NULL,
  `description` varchar(1000) DEFAULT NULL,
  `image_url` varchar(1000) NOT NULL,
  `mobile_image_url` varchar(1000) DEFAULT NULL,
  `cta_label` varchar(100) DEFAULT NULL,
  `cta_url` varchar(500) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_hero_slides_active_order` (`is_active`,`sort_order`),
  KEY `ix_hero_slides_dates` (`starts_at`,`ends_at`),
  CONSTRAINT `chk_hero_slides_dates` CHECK (((`ends_at` is null) or (`starts_at` is null) or (`ends_at` > `starts_at`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `hero_slides`
--

LOCK TABLES `hero_slides` WRITE;
/*!40000 ALTER TABLE `hero_slides` DISABLE KEYS */;
/*!40000 ALTER TABLE `hero_slides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_levels`
--

DROP TABLE IF EXISTS `inventory_levels`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_levels` (
  `variant_id` bigint NOT NULL,
  `warehouse_id` bigint NOT NULL,
  `quantity_on_hand` int unsigned NOT NULL DEFAULT '0',
  `quantity_reserved` int unsigned NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`variant_id`,`warehouse_id`),
  KEY `ix_inventory_levels_warehouse` (`warehouse_id`,`variant_id`),
  CONSTRAINT `fk_inventory_levels_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inventory_levels_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_inventory_levels_reserved` CHECK ((`quantity_reserved` <= `quantity_on_hand`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_levels`
--

LOCK TABLES `inventory_levels` WRITE;
/*!40000 ALTER TABLE `inventory_levels` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_levels` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_movements`
--

DROP TABLE IF EXISTS `inventory_movements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_movements` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `variant_id` bigint NOT NULL,
  `warehouse_id` bigint NOT NULL,
  `movement_type` varchar(24) NOT NULL,
  `quantity_delta` int NOT NULL,
  `reference_type` varchar(30) DEFAULT NULL,
  `reference_id` bigint DEFAULT NULL,
  `note` varchar(500) DEFAULT NULL,
  `created_by_admin_id` bigint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_inventory_movements_warehouse` (`warehouse_id`),
  KEY `fk_inventory_movements_admin` (`created_by_admin_id`),
  KEY `ix_inventory_movements_variant_date` (`variant_id`,`created_at`),
  KEY `ix_inventory_movements_reference` (`reference_type`,`reference_id`),
  CONSTRAINT `fk_inventory_movements_admin` FOREIGN KEY (`created_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_inventory_movements_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_inventory_movements_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_inventory_movements_delta` CHECK ((`quantity_delta` <> 0)),
  CONSTRAINT `chk_inventory_movements_type` CHECK ((`movement_type` in (_utf8mb4'RECEIPT',_utf8mb4'SALE',_utf8mb4'RETURN',_utf8mb4'ADJUSTMENT',_utf8mb4'TRANSFER_IN',_utf8mb4'TRANSFER_OUT')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_movements`
--

LOCK TABLES `inventory_movements` WRITE;
/*!40000 ALTER TABLE `inventory_movements` DISABLE KEYS */;
/*!40000 ALTER TABLE `inventory_movements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `legal_entities`
--

DROP TABLE IF EXISTS `legal_entities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `legal_entities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chain_id` bigint NOT NULL,
  `code` varchar(40) NOT NULL,
  `legal_name` varchar(240) NOT NULL,
  `tax_code` varchar(40) DEFAULT NULL,
  `billing_address` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_legal_entities_chain_code` (`chain_id`,`code`),
  UNIQUE KEY `uq_legal_entities_chain_id` (`chain_id`,`id`),
  KEY `ix_legal_entities_tax_code` (`tax_code`),
  CONSTRAINT `fk_legal_entities_chain` FOREIGN KEY (`chain_id`) REFERENCES `retail_chains` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `legal_entities`
--

LOCK TABLES `legal_entities` WRITE;
/*!40000 ALTER TABLE `legal_entities` DISABLE KEYS */;
INSERT INTO `legal_entities` VALUES (1,1,'MAIN','Công ty TNHH Nội thất Nhà Xinh - Dữ liệu mẫu',NULL,'Địa chỉ mẫu, TP. Hồ Chí Minh',1,'2026-10-09 03:48:32');
/*!40000 ALTER TABLE `legal_entities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `newsletter_subscribers`
--

DROP TABLE IF EXISTS `newsletter_subscribers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `newsletter_subscribers` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `email` varchar(254) NOT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'SUBSCRIBED',
  `subscribed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `unsubscribed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_newsletter_subscribers_email` (`email`),
  KEY `ix_newsletter_subscribers_status_date` (`status`,`subscribed_at`),
  CONSTRAINT `chk_newsletter_subscribers_status` CHECK ((`status` in (_utf8mb4'SUBSCRIBED',_utf8mb4'UNSUBSCRIBED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `newsletter_subscribers`
--

LOCK TABLES `newsletter_subscribers` WRITE;
/*!40000 ALTER TABLE `newsletter_subscribers` DISABLE KEYS */;
/*!40000 ALTER TABLE `newsletter_subscribers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_addresses`
--

DROP TABLE IF EXISTS `order_addresses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_addresses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `address_type` varchar(12) NOT NULL,
  `recipient_name` varchar(160) NOT NULL,
  `phone` varchar(30) NOT NULL,
  `email` varchar(254) DEFAULT NULL,
  `address_line` varchar(255) NOT NULL,
  `ward` varchar(120) DEFAULT NULL,
  `district` varchar(120) NOT NULL,
  `city` varchar(120) NOT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_order_addresses_type` (`order_id`,`address_type`),
  CONSTRAINT `fk_order_addresses_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_order_addresses_type` CHECK ((`address_type` in (_utf8mb4'SHIPPING',_utf8mb4'BILLING')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_addresses`
--

LOCK TABLES `order_addresses` WRITE;
/*!40000 ALTER TABLE `order_addresses` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_addresses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `product_id` bigint DEFAULT NULL,
  `variant_id` bigint DEFAULT NULL,
  `product_name_snapshot` varchar(240) NOT NULL,
  `variant_name_snapshot` varchar(180) NOT NULL,
  `sku_snapshot` varchar(100) NOT NULL,
  `quantity` int unsigned NOT NULL,
  `unit_price` decimal(14,2) NOT NULL,
  `discount_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `line_total` decimal(14,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_order_items_order` (`order_id`),
  KEY `ix_order_items_product` (`product_id`),
  KEY `ix_order_items_variant` (`variant_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_order_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_items_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_order_items_amounts` CHECK (((`unit_price` >= 0) and (`discount_amount` >= 0) and (`line_total` >= 0))),
  CONSTRAINT `chk_order_items_quantity` CHECK ((`quantity` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_status_history`
--

DROP TABLE IF EXISTS `order_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_status_history` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `from_status` varchar(24) DEFAULT NULL,
  `to_status` varchar(24) NOT NULL,
  `note` varchar(500) DEFAULT NULL,
  `changed_by_admin_id` bigint DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_order_status_history_admin` (`changed_by_admin_id`),
  KEY `ix_order_status_history_order_date` (`order_id`,`created_at`),
  CONSTRAINT `fk_order_status_history_admin` FOREIGN KEY (`changed_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_order_status_history_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_status_history`
--

LOCK TABLES `order_status_history` WRITE;
/*!40000 ALTER TABLE `order_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_number` varchar(40) NOT NULL,
  `customer_id` bigint DEFAULT NULL,
  `coupon_id` bigint DEFAULT NULL,
  `customer_email` varchar(254) NOT NULL,
  `customer_name` varchar(160) NOT NULL,
  `customer_phone` varchar(30) NOT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'PENDING',
  `payment_status` varchar(24) NOT NULL DEFAULT 'UNPAID',
  `currency` char(3) NOT NULL DEFAULT 'VND',
  `subtotal` decimal(14,2) NOT NULL,
  `discount_total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `shipping_fee` decimal(14,2) NOT NULL DEFAULT '0.00',
  `tax_total` decimal(14,2) NOT NULL DEFAULT '0.00',
  `grand_total` decimal(14,2) NOT NULL,
  `coupon_code_snapshot` varchar(50) DEFAULT NULL,
  `customer_note` varchar(1000) DEFAULT NULL,
  `internal_note` varchar(1000) DEFAULT NULL,
  `placed_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `confirmed_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_orders_order_number` (`order_number`),
  KEY `fk_orders_coupon` (`coupon_id`),
  KEY `ix_orders_customer_date` (`customer_id`,`placed_at`),
  KEY `ix_orders_status_date` (`status`,`placed_at`),
  KEY `ix_orders_payment_status` (`payment_status`,`placed_at`),
  KEY `ix_orders_email` (`customer_email`),
  CONSTRAINT `fk_orders_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_orders_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_orders_amounts` CHECK (((`subtotal` >= 0) and (`discount_total` >= 0) and (`shipping_fee` >= 0) and (`tax_total` >= 0) and (`grand_total` >= 0))),
  CONSTRAINT `chk_orders_payment_status` CHECK ((`payment_status` in (_utf8mb4'UNPAID',_utf8mb4'PENDING',_utf8mb4'PAID',_utf8mb4'PARTIALLY_REFUNDED',_utf8mb4'REFUNDED',_utf8mb4'FAILED'))),
  CONSTRAINT `chk_orders_status` CHECK ((`status` in (_utf8mb4'PENDING',_utf8mb4'CONFIRMED',_utf8mb4'PROCESSING',_utf8mb4'SHIPPED',_utf8mb4'COMPLETED',_utf8mb4'CANCELLED',_utf8mb4'RETURNED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `provider` varchar(40) NOT NULL,
  `provider_transaction_id` varchar(160) DEFAULT NULL,
  `payment_method` varchar(30) NOT NULL,
  `amount` decimal(14,2) NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'VND',
  `status` varchar(24) NOT NULL DEFAULT 'PENDING',
  `paid_at` datetime DEFAULT NULL,
  `refunded_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  `provider_response` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_payments_provider_transaction` (`provider`,`provider_transaction_id`),
  KEY `ix_payments_order_status` (`order_id`,`status`),
  KEY `ix_payments_provider_transaction` (`provider`,`provider_transaction_id`),
  CONSTRAINT `fk_payments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_payments_amount` CHECK (((`amount` >= 0) and (`refunded_amount` >= 0) and (`refunded_amount` <= `amount`))),
  CONSTRAINT `chk_payments_method` CHECK ((`payment_method` in (_utf8mb4'COD',_utf8mb4'BANK_TRANSFER',_utf8mb4'CARD',_utf8mb4'E_WALLET'))),
  CONSTRAINT `chk_payments_status` CHECK ((`status` in (_utf8mb4'PENDING',_utf8mb4'AUTHORIZED',_utf8mb4'PAID',_utf8mb4'FAILED',_utf8mb4'CANCELLED',_utf8mb4'PARTIALLY_REFUNDED',_utf8mb4'REFUNDED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `policy_pages`
--

DROP TABLE IF EXISTS `policy_pages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `policy_pages` (
  `id` int NOT NULL,
  `title` varchar(200) NOT NULL,
  `introduction` text NOT NULL,
  `purchase_policy` longtext NOT NULL,
  `return_policy` longtext NOT NULL,
  `updated_at` timestamp NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `chk_policy_pages_singleton` CHECK ((`id` = 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `policy_pages`
--

LOCK TABLES `policy_pages` WRITE;
/*!40000 ALTER TABLE `policy_pages` DISABLE KEYS */;
INSERT INTO `policy_pages` VALUES (1,'Chính sách mua bán, đổi trả hàng','Nhà Xinh mong muốn mang đến trải nghiệm mua sắm rõ ràng và thuận tiện. Quý khách vui lòng kiểm tra thông tin đơn hàng và liên hệ cửa hàng đã giao dịch nếu cần hỗ trợ.','Quý khách vui lòng kiểm tra kỹ thông tin sản phẩm, số lượng và địa chỉ nhận hàng trước khi xác nhận đơn. Thông tin về giá, thanh toán và giao nhận sẽ được Nhà Xinh xác nhận theo từng đơn hàng. Vui lòng giữ lại đơn hàng, hóa đơn và chứng từ liên quan để thuận tiện khi cần hỗ trợ.','Với mong muốn đảm bảo quyền lợi cho khách hàng và nâng cao chất lượng dịch vụ, quý khách có thể trả hoặc đổi hàng để có được sự thoải mái và hài lòng nhất tại Nhà Xinh.\n\n1. CÁC TRƯỜNG HỢP ĐƯỢC TRẢ HÀNG, ĐỔI HÀNG\n- Sản phẩm không thể đưa vào nhà được (do cầu thang hẹp, cửa hẹp,…).\n- Không đủ số lượng, không đủ bộ như trong đơn hàng.\n- Hàng bị lỗi, không đạt chất lượng.\n\n2. CÁC TRƯỜNG HỢP KHÔNG ĐƯỢC ĐỔI HOẶC TRẢ\n- Hàng đã sử dụng, dơ, cũ hoặc hư hại.\n- Không có đầy đủ các hóa đơn, chứng từ.\n- Hàng bán khuyến mại.\n\n3. THỜI GIAN VÀ THỦ TỤC ĐỔI, TRẢ HÀNG\nThời gian được phép đổi, trả hàng: trong vòng 3 ngày kể từ ngày giao hàng, trước khi xuất hóa đơn.\n\nThủ tục đổi, trả hàng:\nKhi có yêu cầu đổi, trả hàng, xin quý khách vui lòng liên hệ với cửa hàng Nhà Xinh đã giao dịch. Nhà Xinh chịu chi phí phát sinh dịch vụ đổi, trả hàng.','2026-10-09 03:48:30');
/*!40000 ALTER TABLE `policy_pages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_attribute_assignments`
--

DROP TABLE IF EXISTS `product_attribute_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_attribute_assignments` (
  `product_id` bigint NOT NULL,
  `attribute_id` bigint NOT NULL,
  `attribute_value_id` bigint NOT NULL,
  PRIMARY KEY (`product_id`,`attribute_id`,`attribute_value_id`),
  KEY `ix_product_attribute_assignments_filter` (`attribute_id`,`attribute_value_id`,`product_id`),
  CONSTRAINT `fk_product_attribute_assignments_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_attribute_assignments_value` FOREIGN KEY (`attribute_id`, `attribute_value_id`) REFERENCES `product_attribute_values` (`attribute_id`, `id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_attribute_assignments`
--

LOCK TABLES `product_attribute_assignments` WRITE;
/*!40000 ALTER TABLE `product_attribute_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_attribute_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_attribute_values`
--

DROP TABLE IF EXISTS `product_attribute_values`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_attribute_values` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `attribute_id` bigint NOT NULL,
  `value_text` varchar(180) NOT NULL,
  `slug` varchar(200) NOT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_attribute_values_slug` (`attribute_id`,`slug`),
  UNIQUE KEY `uq_product_attribute_values_pair` (`attribute_id`,`id`),
  KEY `ix_product_attribute_values_sort` (`attribute_id`,`sort_order`),
  CONSTRAINT `fk_product_attribute_values_attribute` FOREIGN KEY (`attribute_id`) REFERENCES `product_attributes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_attribute_values`
--

LOCK TABLES `product_attribute_values` WRITE;
/*!40000 ALTER TABLE `product_attribute_values` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_attribute_values` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_attributes`
--

DROP TABLE IF EXISTS `product_attributes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_attributes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(80) NOT NULL,
  `name` varchar(120) NOT NULL,
  `data_type` varchar(20) NOT NULL DEFAULT 'TEXT',
  `unit` varchar(30) DEFAULT NULL,
  `is_filterable` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_attributes_code` (`code`),
  KEY `ix_product_attributes_filterable` (`is_filterable`,`sort_order`),
  CONSTRAINT `chk_product_attributes_data_type` CHECK ((`data_type` in (_utf8mb4'TEXT',_utf8mb4'NUMBER',_utf8mb4'BOOLEAN')))
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_attributes`
--

LOCK TABLES `product_attributes` WRITE;
/*!40000 ALTER TABLE `product_attributes` DISABLE KEYS */;
INSERT INTO `product_attributes` VALUES (1,'material','Chất liệu','TEXT',NULL,1,10),(2,'color','Màu sắc','TEXT',NULL,1,20),(3,'style','Phong cách','TEXT',NULL,1,30),(4,'width','Chiều rộng','NUMBER','mm',1,40),(5,'height','Chiều cao','NUMBER','mm',1,50),(6,'depth','Chiều sâu','NUMBER','mm',1,60);
/*!40000 ALTER TABLE `product_attributes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_categories`
--

DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `product_id` bigint NOT NULL,
  `category_id` bigint NOT NULL,
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`product_id`,`category_id`),
  KEY `ix_product_categories_category` (`category_id`,`product_id`),
  CONSTRAINT `fk_product_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_categories_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_categories`
--

LOCK TABLES `product_categories` WRITE;
/*!40000 ALTER TABLE `product_categories` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_media`
--

DROP TABLE IF EXISTS `product_media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_media` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `variant_id` bigint DEFAULT NULL,
  `media_type` varchar(20) NOT NULL DEFAULT 'IMAGE',
  `media_url` varchar(1000) NOT NULL,
  `alt_text` varchar(300) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_primary` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `ix_product_media_product_sort` (`product_id`,`sort_order`),
  KEY `ix_product_media_variant` (`variant_id`),
  CONSTRAINT `fk_product_media_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_media_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_product_media_type` CHECK ((`media_type` in (_utf8mb4'IMAGE',_utf8mb4'VIDEO',_utf8mb4'MODEL_3D')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_media`
--

LOCK TABLES `product_media` WRITE;
/*!40000 ALTER TABLE `product_media` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_media` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_reviews`
--

DROP TABLE IF EXISTS `product_reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_reviews` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `customer_id` bigint NOT NULL,
  `order_item_id` bigint DEFAULT NULL,
  `rating` tinyint unsigned NOT NULL,
  `title` varchar(180) DEFAULT NULL,
  `content` text,
  `status` varchar(20) NOT NULL DEFAULT 'PENDING',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_reviews_order_item` (`order_item_id`),
  KEY `ix_product_reviews_product_status_date` (`product_id`,`status`,`created_at`),
  KEY `ix_product_reviews_customer` (`customer_id`,`created_at`),
  CONSTRAINT `fk_product_reviews_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_reviews_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_product_reviews_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_product_reviews_rating` CHECK ((`rating` between 1 and 5)),
  CONSTRAINT `chk_product_reviews_status` CHECK ((`status` in (_utf8mb4'PENDING',_utf8mb4'PUBLISHED',_utf8mb4'HIDDEN')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_reviews`
--

LOCK TABLES `product_reviews` WRITE;
/*!40000 ALTER TABLE `product_reviews` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_rooms`
--

DROP TABLE IF EXISTS `product_rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_rooms` (
  `product_id` bigint NOT NULL,
  `room_id` bigint NOT NULL,
  PRIMARY KEY (`product_id`,`room_id`),
  KEY `ix_product_rooms_room` (`room_id`,`product_id`),
  CONSTRAINT `fk_product_rooms_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_product_rooms_room` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_rooms`
--

LOCK TABLES `product_rooms` WRITE;
/*!40000 ALTER TABLE `product_rooms` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `product_id` bigint NOT NULL,
  `sku` varchar(100) NOT NULL,
  `name` varchar(180) NOT NULL,
  `option_values` json DEFAULT NULL,
  `price` decimal(14,2) NOT NULL,
  `compare_at_price` decimal(14,2) DEFAULT NULL,
  `cost_price` decimal(14,2) DEFAULT NULL,
  `weight_grams` int unsigned DEFAULT NULL,
  `width_mm` int unsigned DEFAULT NULL,
  `height_mm` int unsigned DEFAULT NULL,
  `depth_mm` int unsigned DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'ACTIVE',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_variants_sku` (`sku`),
  KEY `ix_product_variants_product_status` (`product_id`,`status`),
  CONSTRAINT `fk_product_variants_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_product_variants_compare_price` CHECK (((`compare_at_price` is null) or (`compare_at_price` >= `price`))),
  CONSTRAINT `chk_product_variants_cost_price` CHECK (((`cost_price` is null) or (`cost_price` >= 0))),
  CONSTRAINT `chk_product_variants_price` CHECK ((`price` >= 0)),
  CONSTRAINT `chk_product_variants_status` CHECK ((`status` in (_utf8mb4'ACTIVE',_utf8mb4'INACTIVE')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `brand_id` bigint DEFAULT NULL,
  `name` varchar(240) NOT NULL,
  `slug` varchar(260) NOT NULL,
  `short_description` varchar(600) DEFAULT NULL,
  `description` longtext,
  `specifications` json DEFAULT NULL,
  `status` varchar(20) NOT NULL DEFAULT 'DRAFT',
  `seo_title` varchar(240) DEFAULT NULL,
  `seo_description` varchar(600) DEFAULT NULL,
  `published_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_slug` (`slug`),
  KEY `ix_products_status_published` (`status`,`published_at`),
  KEY `ix_products_brand_status` (`brand_id`,`status`),
  FULLTEXT KEY `fx_products_search` (`name`,`short_description`,`description`),
  CONSTRAINT `fk_products_brand` FOREIGN KEY (`brand_id`) REFERENCES `brands` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_products_status` CHECK ((`status` in (_utf8mb4'DRAFT',_utf8mb4'ACTIVE',_utf8mb4'INACTIVE',_utf8mb4'ARCHIVED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotion_products`
--

DROP TABLE IF EXISTS `promotion_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotion_products` (
  `coupon_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  PRIMARY KEY (`coupon_id`,`product_id`),
  KEY `ix_promotion_products_product` (`product_id`,`coupon_id`),
  CONSTRAINT `fk_promotion_products_coupon` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_promotion_products_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotion_products`
--

LOCK TABLES `promotion_products` WRITE;
/*!40000 ALTER TABLE `promotion_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotion_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `retail_chains`
--

DROP TABLE IF EXISTS `retail_chains`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `retail_chains` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `name` varchar(180) NOT NULL,
  `default_currency` char(3) NOT NULL DEFAULT 'VND',
  `default_timezone` varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_retail_chains_code` (`code`),
  KEY `ix_retail_chains_active` (`is_active`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `retail_chains`
--

LOCK TABLES `retail_chains` WRITE;
/*!40000 ALTER TABLE `retail_chains` DISABLE KEYS */;
INSERT INTO `retail_chains` VALUES (1,'NHA_XINH','Nhà Xinh','VND','Asia/Ho_Chi_Minh',1,'2026-10-09 03:48:32','2026-10-09 03:48:32');
/*!40000 ALTER TABLE `retail_chains` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `return_request_items`
--

DROP TABLE IF EXISTS `return_request_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `return_request_items` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `return_request_id` bigint NOT NULL,
  `order_item_id` bigint NOT NULL,
  `quantity` int unsigned NOT NULL,
  `condition_note` varchar(500) DEFAULT NULL,
  `resolution` varchar(24) DEFAULT NULL,
  `refund_amount` decimal(14,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_return_request_order_item` (`return_request_id`,`order_item_id`),
  KEY `ix_return_request_items_order_item` (`order_item_id`),
  CONSTRAINT `fk_return_request_items_order_item` FOREIGN KEY (`order_item_id`) REFERENCES `order_items` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_return_request_items_request` FOREIGN KEY (`return_request_id`) REFERENCES `return_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_return_request_items_quantity` CHECK ((`quantity` > 0)),
  CONSTRAINT `chk_return_request_items_refund` CHECK ((`refund_amount` >= 0)),
  CONSTRAINT `chk_return_request_items_resolution` CHECK (((`resolution` is null) or (`resolution` in (_utf8mb4'REFUND',_utf8mb4'REPLACE',_utf8mb4'REPAIR',_utf8mb4'REJECT'))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `return_request_items`
--

LOCK TABLES `return_request_items` WRITE;
/*!40000 ALTER TABLE `return_request_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `return_request_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `return_requests`
--

DROP TABLE IF EXISTS `return_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `return_requests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `request_number` varchar(40) NOT NULL,
  `order_id` bigint NOT NULL,
  `customer_id` bigint DEFAULT NULL,
  `reason` varchar(40) NOT NULL,
  `customer_description` text,
  `status` varchar(24) NOT NULL DEFAULT 'REQUESTED',
  `resolution_note` varchar(1000) DEFAULT NULL,
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `resolved_at` datetime DEFAULT NULL,
  `resolved_by_admin_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_return_requests_number` (`request_number`),
  KEY `fk_return_requests_customer` (`customer_id`),
  KEY `fk_return_requests_admin` (`resolved_by_admin_id`),
  KEY `ix_return_requests_order` (`order_id`,`requested_at`),
  KEY `ix_return_requests_status` (`status`,`requested_at`),
  CONSTRAINT `fk_return_requests_admin` FOREIGN KEY (`resolved_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_return_requests_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_return_requests_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_return_requests_reason` CHECK ((`reason` in (_utf8mb4'DEFECTIVE',_utf8mb4'WRONG_ITEM',_utf8mb4'MISSING_ITEM',_utf8mb4'CANNOT_FIT',_utf8mb4'OTHER'))),
  CONSTRAINT `chk_return_requests_status` CHECK ((`status` in (_utf8mb4'REQUESTED',_utf8mb4'APPROVED',_utf8mb4'REJECTED',_utf8mb4'RECEIVED',_utf8mb4'REFUNDED',_utf8mb4'CLOSED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `return_requests`
--

LOCK TABLES `return_requests` WRITE;
/*!40000 ALTER TABLE `return_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `return_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rooms` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(120) NOT NULL,
  `slug` varchar(140) NOT NULL,
  `description` text,
  `image_url` varchar(1000) DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rooms_slug` (`slug`),
  KEY `ix_rooms_active_sort` (`is_active`,`sort_order`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rooms`
--

LOCK TABLES `rooms` WRITE;
/*!40000 ALTER TABLE `rooms` DISABLE KEYS */;
INSERT INTO `rooms` VALUES (1,'Phòng khách','phong-khach',NULL,NULL,10,1),(2,'Phòng ăn','phong-an',NULL,NULL,20,1),(3,'Phòng ngủ','phong-ngu',NULL,NULL,30,1),(4,'Phòng làm việc','phong-lam-viec',NULL,NULL,40,1),(5,'Ngoại thất','ngoai-that',NULL,NULL,50,1);
/*!40000 ALTER TABLE `rooms` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipments`
--

DROP TABLE IF EXISTS `shipments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `order_id` bigint NOT NULL,
  `warehouse_id` bigint DEFAULT NULL,
  `shipping_method_id` bigint DEFAULT NULL,
  `carrier` varchar(100) DEFAULT NULL,
  `tracking_number` varchar(120) DEFAULT NULL,
  `status` varchar(24) NOT NULL DEFAULT 'PENDING',
  `shipping_fee` decimal(14,2) NOT NULL DEFAULT '0.00',
  `shipped_at` datetime DEFAULT NULL,
  `delivered_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_shipments_warehouse` (`warehouse_id`),
  KEY `fk_shipments_shipping_method` (`shipping_method_id`),
  KEY `ix_shipments_order_status` (`order_id`,`status`),
  KEY `ix_shipments_tracking` (`carrier`,`tracking_number`),
  CONSTRAINT `fk_shipments_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_shipments_shipping_method` FOREIGN KEY (`shipping_method_id`) REFERENCES `shipping_methods` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_shipments_warehouse` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses` (`id`) ON DELETE SET NULL,
  CONSTRAINT `chk_shipments_fee` CHECK ((`shipping_fee` >= 0)),
  CONSTRAINT `chk_shipments_status` CHECK ((`status` in (_utf8mb4'PENDING',_utf8mb4'PACKING',_utf8mb4'SHIPPED',_utf8mb4'DELIVERED',_utf8mb4'FAILED',_utf8mb4'RETURNED')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipments`
--

LOCK TABLES `shipments` WRITE;
/*!40000 ALTER TABLE `shipments` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipping_methods`
--

DROP TABLE IF EXISTS `shipping_methods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_methods` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `name` varchar(120) NOT NULL,
  `carrier` varchar(100) DEFAULT NULL,
  `estimated_min_days` smallint unsigned DEFAULT NULL,
  `estimated_max_days` smallint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shipping_methods_code` (`code`),
  KEY `ix_shipping_methods_active` (`is_active`),
  CONSTRAINT `chk_shipping_methods_estimate` CHECK (((`estimated_max_days` is null) or (`estimated_min_days` is null) or (`estimated_max_days` >= `estimated_min_days`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipping_methods`
--

LOCK TABLES `shipping_methods` WRITE;
/*!40000 ALTER TABLE `shipping_methods` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipping_methods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipping_rates`
--

DROP TABLE IF EXISTS `shipping_rates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_rates` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `zone_id` bigint NOT NULL,
  `shipping_method_id` bigint NOT NULL,
  `minimum_weight_grams` int unsigned NOT NULL DEFAULT '0',
  `maximum_weight_grams` int unsigned DEFAULT NULL,
  `base_fee` decimal(14,2) NOT NULL DEFAULT '0.00',
  `fee_per_kilogram` decimal(14,2) NOT NULL DEFAULT '0.00',
  `free_shipping_threshold` decimal(14,2) DEFAULT NULL,
  `requires_manual_quote` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shipping_rates_tier` (`zone_id`,`shipping_method_id`,`minimum_weight_grams`),
  KEY `fk_shipping_rates_method` (`shipping_method_id`),
  KEY `ix_shipping_rates_zone_method` (`zone_id`,`shipping_method_id`),
  CONSTRAINT `fk_shipping_rates_method` FOREIGN KEY (`shipping_method_id`) REFERENCES `shipping_methods` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_shipping_rates_zone` FOREIGN KEY (`zone_id`) REFERENCES `shipping_zones` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_shipping_rates_fees` CHECK (((`base_fee` >= 0) and (`fee_per_kilogram` >= 0) and ((`free_shipping_threshold` is null) or (`free_shipping_threshold` >= 0)))),
  CONSTRAINT `chk_shipping_rates_weight` CHECK (((`maximum_weight_grams` is null) or (`maximum_weight_grams` > `minimum_weight_grams`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipping_rates`
--

LOCK TABLES `shipping_rates` WRITE;
/*!40000 ALTER TABLE `shipping_rates` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipping_rates` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipping_zone_locations`
--

DROP TABLE IF EXISTS `shipping_zone_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_zone_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `zone_id` bigint NOT NULL,
  `city` varchar(120) NOT NULL,
  `district` varchar(120) NOT NULL DEFAULT '*',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shipping_zone_location` (`zone_id`,`city`,`district`),
  KEY `ix_shipping_zone_locations_lookup` (`city`,`district`),
  CONSTRAINT `fk_shipping_zone_locations_zone` FOREIGN KEY (`zone_id`) REFERENCES `shipping_zones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipping_zone_locations`
--

LOCK TABLES `shipping_zone_locations` WRITE;
/*!40000 ALTER TABLE `shipping_zone_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipping_zone_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shipping_zones`
--

DROP TABLE IF EXISTS `shipping_zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `shipping_zones` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(40) NOT NULL,
  `name` varchar(160) NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_shipping_zones_code` (`code`),
  KEY `ix_shipping_zones_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shipping_zones`
--

LOCK TABLES `shipping_zones` WRITE;
/*!40000 ALTER TABLE `shipping_zones` DISABLE KEYS */;
/*!40000 ALTER TABLE `shipping_zones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_assortments`
--

DROP TABLE IF EXISTS `store_assortments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_assortments` (
  `store_location_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `availability_status` varchar(20) NOT NULL DEFAULT 'AVAILABLE',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  PRIMARY KEY (`store_location_id`,`product_id`),
  KEY `ix_store_assortments_product_status` (`product_id`,`availability_status`),
  CONSTRAINT `fk_store_assortments_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_store_assortments_store` FOREIGN KEY (`store_location_id`) REFERENCES `store_locations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chk_store_assortments_dates` CHECK (((`ends_at` is null) or (`starts_at` is null) or (`ends_at` > `starts_at`))),
  CONSTRAINT `chk_store_assortments_status` CHECK ((`availability_status` in (_utf8mb4'AVAILABLE',_utf8mb4'ORDER_ONLY',_utf8mb4'UNAVAILABLE')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_assortments`
--

LOCK TABLES `store_assortments` WRITE;
/*!40000 ALTER TABLE `store_assortments` DISABLE KEYS */;
/*!40000 ALTER TABLE `store_assortments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `store_locations`
--

DROP TABLE IF EXISTS `store_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `store_locations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chain_id` bigint NOT NULL,
  `legal_entity_id` bigint NOT NULL,
  `store_code` varchar(40) NOT NULL,
  `name` varchar(180) NOT NULL,
  `slug` varchar(200) NOT NULL,
  `store_type` varchar(24) NOT NULL DEFAULT 'SHOWROOM',
  `address_line` varchar(255) NOT NULL,
  `ward` varchar(120) DEFAULT NULL,
  `district` varchar(120) NOT NULL,
  `city` varchar(120) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `email` varchar(254) DEFAULT NULL,
  `manager_name` varchar(160) DEFAULT NULL,
  `opens_at` time DEFAULT NULL,
  `closes_at` time DEFAULT NULL,
  `timezone` varchar(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  `opening_hours` varchar(500) DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_store_locations_chain_code` (`chain_id`,`store_code`),
  UNIQUE KEY `uq_store_locations_chain_slug` (`chain_id`,`slug`),
  UNIQUE KEY `uq_store_locations_chain_id` (`chain_id`,`id`),
  KEY `ix_store_locations_city_active` (`city`,`is_active`,`sort_order`),
  KEY `fk_store_locations_legal_entity` (`chain_id`,`legal_entity_id`),
  CONSTRAINT `fk_store_locations_chain` FOREIGN KEY (`chain_id`) REFERENCES `retail_chains` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_store_locations_legal_entity` FOREIGN KEY (`chain_id`, `legal_entity_id`) REFERENCES `legal_entities` (`chain_id`, `id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_store_locations_type` CHECK ((`store_type` in (_utf8mb4'SHOWROOM',_utf8mb4'FLAGSHIP',_utf8mb4'OUTLET',_utf8mb4'PICKUP_POINT')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `store_locations`
--

LOCK TABLES `store_locations` WRITE;
/*!40000 ALTER TABLE `store_locations` DISABLE KEYS */;
/*!40000 ALTER TABLE `store_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(100) NOT NULL,
  `password_hash` varchar(100) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_users_username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2a$10$elcVfB2s20F1LiExXLyTremaumb168eajNkCHqwN52iyt4AEHO7TW','2026-10-09 04:27:37');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `variant_attribute_assignments`
--

DROP TABLE IF EXISTS `variant_attribute_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `variant_attribute_assignments` (
  `variant_id` bigint NOT NULL,
  `attribute_id` bigint NOT NULL,
  `attribute_value_id` bigint NOT NULL,
  PRIMARY KEY (`variant_id`,`attribute_id`,`attribute_value_id`),
  KEY `ix_variant_attribute_assignments_filter` (`attribute_id`,`attribute_value_id`,`variant_id`),
  CONSTRAINT `fk_variant_attribute_assignments_value` FOREIGN KEY (`attribute_id`, `attribute_value_id`) REFERENCES `product_attribute_values` (`attribute_id`, `id`) ON DELETE CASCADE,
  CONSTRAINT `fk_variant_attribute_assignments_variant` FOREIGN KEY (`variant_id`) REFERENCES `product_variants` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `variant_attribute_assignments`
--

LOCK TABLES `variant_attribute_assignments` WRITE;
/*!40000 ALTER TABLE `variant_attribute_assignments` DISABLE KEYS */;
/*!40000 ALTER TABLE `variant_attribute_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `warehouses`
--

DROP TABLE IF EXISTS `warehouses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `warehouses` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `chain_id` bigint NOT NULL,
  `store_location_id` bigint DEFAULT NULL,
  `code` varchar(40) NOT NULL,
  `name` varchar(160) NOT NULL,
  `warehouse_type` varchar(24) NOT NULL DEFAULT 'DISTRIBUTION_CENTER',
  `address_line` varchar(255) NOT NULL,
  `ward` varchar(120) DEFAULT NULL,
  `district` varchar(120) DEFAULT NULL,
  `city` varchar(120) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_warehouses_chain_code` (`chain_id`,`code`),
  UNIQUE KEY `uq_warehouses_chain_id` (`chain_id`,`id`),
  KEY `ix_warehouses_active_city` (`is_active`,`city`),
  KEY `ix_warehouses_chain_store` (`chain_id`,`store_location_id`,`is_active`),
  CONSTRAINT `fk_warehouses_chain` FOREIGN KEY (`chain_id`) REFERENCES `retail_chains` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_warehouses_store` FOREIGN KEY (`chain_id`, `store_location_id`) REFERENCES `store_locations` (`chain_id`, `id`) ON DELETE RESTRICT,
  CONSTRAINT `chk_warehouses_type` CHECK ((`warehouse_type` in (_utf8mb4'STORE_BACKROOM',_utf8mb4'DISTRIBUTION_CENTER',_utf8mb4'RETURNS_CENTER')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `warehouses`
--

LOCK TABLES `warehouses` WRITE;
/*!40000 ALTER TABLE `warehouses` DISABLE KEYS */;
/*!40000 ALTER TABLE `warehouses` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlist_items`
--

DROP TABLE IF EXISTS `wishlist_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wishlist_items` (
  `wishlist_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `added_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`wishlist_id`,`product_id`),
  KEY `ix_wishlist_items_product` (`product_id`),
  CONSTRAINT `fk_wishlist_items_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_wishlist_items_wishlist` FOREIGN KEY (`wishlist_id`) REFERENCES `wishlists` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wishlist_items`
--

LOCK TABLES `wishlist_items` WRITE;
/*!40000 ALTER TABLE `wishlist_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `wishlist_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wishlists`
--

DROP TABLE IF EXISTS `wishlists`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wishlists` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `customer_id` bigint NOT NULL,
  `name` varchar(120) NOT NULL DEFAULT 'Yêu thích',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_wishlists_customer_name` (`customer_id`,`name`),
  CONSTRAINT `fk_wishlists_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wishlists`
--

LOCK TABLES `wishlists` WRITE;
/*!40000 ALTER TABLE `wishlists` DISABLE KEYS */;
/*!40000 ALTER TABLE `wishlists` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-10-26 16:23:45
