-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: fixitnow
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bookings`
--

DROP TABLE IF EXISTS `bookings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bookings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `booking_date` date NOT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `status` enum('CANCELLED','COMPLETED','CONFIRMED','PENDING') NOT NULL,
  `time_slot` varchar(255) NOT NULL,
  `customer_id` bigint NOT NULL,
  `provider_id` bigint NOT NULL,
  `service_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKib6gjgj2e9binkktxmm175bmm` (`customer_id`),
  KEY `FKnuv5epx29ao9njgi1cosrcsjr` (`provider_id`),
  KEY `FKjcwbou2jlblfwu14uoxs65b25` (`service_id`),
  CONSTRAINT `FKib6gjgj2e9binkktxmm175bmm` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKjcwbou2jlblfwu14uoxs65b25` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `FKnuv5epx29ao9njgi1cosrcsjr` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bookings`
--

LOCK TABLES `bookings` WRITE;
/*!40000 ALTER TABLE `bookings` DISABLE KEYS */;
INSERT INTO `bookings` VALUES (1,'2024-03-25','2026-03-11 16:27:25.727628','COMPLETED','09:00:00 - 11:00:00',3,2,1),(2,'2024-03-13','2026-03-12 16:24:10.569317','COMPLETED','09:00:00 - 11:00:00',3,2,1),(3,'2024-03-25','2026-03-12 16:39:50.007951','CANCELLED','09:00:00 - 10:00:00',3,2,1),(4,'2026-03-20','2026-03-14 13:26:21.375297','COMPLETED','09:00 - 11:00',3,2,1),(5,'2024-03-25','2026-03-14 15:53:52.386905','COMPLETED','09:00:00 - 11:00:00',3,4,6);
/*!40000 ALTER TABLE `bookings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `description` varchar(255) DEFAULT NULL,
  `icon` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKt8o6pivur7nn124jehx7cygw5` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (1,'Electrical repair and installation services','⚡','Electrical'),(2,'Plumbing and water system services','💧','Plumbing'),(3,'Woodwork and furniture services','🪚','Carpentry');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `chat_messages`
--

DROP TABLE IF EXISTS `chat_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chat_messages` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `content` text NOT NULL,
  `sent_at` datetime(6) NOT NULL,
  `booking_id` bigint NOT NULL,
  `receiver_id` bigint NOT NULL,
  `sender_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_booking` (`booking_id`),
  KEY `idx_sender` (`sender_id`),
  KEY `idx_receiver` (`receiver_id`),
  KEY `idx_booking_sent_at` (`booking_id`,`sent_at`),
  CONSTRAINT `FKand7mh9iu4kt3n1tn2w9i9of0` FOREIGN KEY (`receiver_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKgiqeap8ays4lf684x7m0r2729` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKl2wi5y3jjsiadif318kec2wq6` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `chat_messages`
--

LOCK TABLES `chat_messages` WRITE;
/*!40000 ALTER TABLE `chat_messages` DISABLE KEYS */;
INSERT INTO `chat_messages` VALUES (1,'Hi, I have some questions about the service','2026-03-14 15:58:04.622455',5,4,3),(2,'yeah, you can askme anything about the service','2026-03-14 15:59:24.239452',5,3,4),(3,'the service is completed successfully','2026-03-14 16:03:19.145188',5,3,4);
/*!40000 ALTER TABLE `chat_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reviews`
--

DROP TABLE IF EXISTS `reviews`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reviews` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `comment` text,
  `created_at` datetime(6) NOT NULL,
  `rating` int NOT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  `customer_id` bigint NOT NULL,
  `provider_id` bigint NOT NULL,
  `service_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UKjf2lkcka32t8flm7si5lrsypb` (`service_id`,`customer_id`),
  KEY `FKkquncb1glvrldaui8v52xfd5q` (`customer_id`),
  KEY `FK6v6isw4stf5vu1fktr1whlx06` (`provider_id`),
  CONSTRAINT `FK6v6isw4stf5vu1fktr1whlx06` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKkquncb1glvrldaui8v52xfd5q` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FKmobnphh6ln84v2omwl8n1fj9f` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reviews`
--

LOCK TABLES `reviews` WRITE;
/*!40000 ALTER TABLE `reviews` DISABLE KEYS */;
INSERT INTO `reviews` VALUES (1,'Excellent service! Alice was very professional and thorough. The cleaning was perfect and she arrived on time. Highly recommend!','2026-03-06 12:49:48.496080',5,'2026-03-06 12:49:48.496080',3,2,1);
/*!40000 ALTER TABLE `reviews` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `review_notifications`
--

DROP TABLE IF EXISTS `review_notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `review_notifications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `created_at` datetime(6) DEFAULT NULL,
  `is_read` bit(1) NOT NULL,
  `read_at` datetime(6) DEFAULT NULL,
  `customer_id` bigint NOT NULL,
  `provider_id` bigint NOT NULL,
  `review_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK_review_provider_notification` (`review_id`,`provider_id`),
  KEY `idx_review_notifications_provider` (`provider_id`),
  KEY `idx_review_notifications_read_state` (`is_read`),
  KEY `idx_review_notifications_created_at` (`created_at`),
  KEY `idx_review_notifications_customer` (`customer_id`),
  CONSTRAINT `FK_review_notifications_customer` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_review_notifications_provider` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`),
  CONSTRAINT `FK_review_notifications_review` FOREIGN KEY (`review_id`) REFERENCES `reviews` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `review_notifications`
--

LOCK TABLES `review_notifications` WRITE;
/*!40000 ALTER TABLE `review_notifications` DISABLE KEYS */;
INSERT INTO `review_notifications` VALUES (1,'2026-03-06 12:49:48.496080',_binary '\0','2026-03-06 12:55:12.000000',3,2,1);
/*!40000 ALTER TABLE `review_notifications` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `services`
--

DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `availability` varchar(255) DEFAULT NULL,
  `average_rating` decimal(3,2) DEFAULT NULL,
  `category` varchar(255) NOT NULL,
  `created_at` datetime(6) NOT NULL,
  `description` text,
  `latitude` decimal(10,8) DEFAULT NULL,
  `location` varchar(255) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `review_count` int DEFAULT NULL,
  `subcategory` varchar(255) DEFAULT NULL,
  `provider_id` bigint NOT NULL,
  `duration_minutes` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKe0b0175l27ffcser90cjoots1` (`provider_id`),
  CONSTRAINT `FKe0b0175l27ffcser90cjoots1` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,'Mon-Sat 9AM-6PM',5.00,'Electrical','2026-03-06 11:21:23.164299','Professional fan repair and installation for ceiling fans, pedestal fans, and exhaust fans. Quick diagnosis and reliable service.',40.71280000,'New York, NY',-74.00600000,450.00,1,'Fan Repair / Installation',2,0),(2,'Mon-Sat 9AM-6PM',0.00,'Electrical','2026-03-06 11:22:27.616638','Professional light fixture installation for residential and commercial properties. We ensure safe and efficient lighting solutions.',40.71280000,'New York, NY',-74.00600000,450.00,0,'Light Fixture Installation',2,0),(3,'Mon-Sat 10AM-7PM',0.00,'Plumbing','2026-03-06 11:24:32.839539','Fix leaking pipes, taps, and valves. Our plumbers ensure durable repairs with quality fittings.',40.71500000,'New York, NY',-74.00300000,700.00,0,'Leakage Repair',4,0),(4,'Mon-Fri 9AM-5PM',0.00,'Carpentry','2026-03-06 12:14:53.810564','Repair and restoration of wooden furniture including chairs, tables, wardrobes, and sofas.',40.72000000,'New York, NY',-74.00000000,550.00,0,'Furniture Repair (Chair, Table, Sofa)',5,0),(5,'Mon-Fri 9AM-5PM',0.00,'Carpentry','2026-03-06 12:16:06.746901','Repair and restoration of wooden furniture including chairs, tables, wardrobes, and sofas.',40.72000000,'New York, NY',-74.00000000,550.00,0,'Door / Window Repair',5,0),(6,'Mon-Fri 9AM-6PM, Sat 10AM-4PM',0.00,'Electrical','2026-03-12 16:14:16.978037','Professional fan repair and installation services for all types of fans. We fix motor issues, blade problems, and wiring concerns to ensure your fan runs efficiently.',40.71280000,'New York, NY',-74.00600000,500.00,0,'Fan Repair / Installation',4,120);
/*!40000 ALTER TABLE `services` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subcategories`
--

DROP TABLE IF EXISTS `subcategories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subcategories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `category_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  KEY `FKiborb6ptvy1t1n3v6klb56l5s` (`category_id`),
  CONSTRAINT `FKiborb6ptvy1t1n3v6klb56l5s` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subcategories`
--

LOCK TABLES `subcategories` WRITE;
/*!40000 ALTER TABLE `subcategories` DISABLE KEYS */;
INSERT INTO `subcategories` VALUES (1,'Fan Repair / Installation',1),(2,'Light Fixture Installation',1),(3,'Switch / Socket Repair',1),(4,'Leakage Repair',2),(5,'Tap / Mixer Installation',2),(6,'Toilet / Flush Tank Repair',2),(7,'Furniture Repair (Chair, Table, Sofa)',3),(8,'Door / Window Repair',3),(9,'Wooden Cabinet / Wardrobe Repair',3);
/*!40000 ALTER TABLE `subcategories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `approval_status` enum('APPROVED','ON_HOLD','PENDING') DEFAULT NULL,
  `created_at` datetime(6) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `id_proof_document_name` varchar(255) DEFAULT NULL,
  `id_proof_type` varchar(255) DEFAULT NULL,
  `is_active` bit(1) NOT NULL,
  `location` varchar(255) DEFAULT NULL,
  `name` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `phone` varchar(255) DEFAULT NULL,
  `role` enum('ADMIN','CUSTOMER','PROVIDER') NOT NULL,
  `service_type` varchar(255) DEFAULT NULL,
  `updated_at` datetime(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `UK6dotkott2kjsp8vw4d0m25fb7` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'APPROVED','2026-03-05 20:39:01.352949','admin@example.com',NULL,NULL,_binary '',NULL,'Admin User','$2a$10$3.AupDpUEyVAES8oGl7.v.4kUkbDCYQi9/7ZsWFIsyPKwZPopZBKa',NULL,'ADMIN',NULL,'2026-03-05 20:39:01.352949'),(2,'APPROVED','2026-03-05 20:39:35.959151','alice456@gmail.com','AADHAR_12345678','AADHAR',_binary '','New York, NY','Alice','$2a$10$E.Fc/h4F5e2GQG49nB4m6evlsxBqxgWQVVOsjWV5DADIUM5P88qbO','+1-555-5678','PROVIDER','Electrical','2026-03-05 20:39:35.959151'),(3,'APPROVED','2026-03-05 20:40:04.141913','john456@gmail.com',NULL,NULL,_binary '','New York, NY','John','$2a$10$B10dwI07b.dQuA510kygEOCoEEd6QsLhnXKyaPYvj8gE4dAyQPZGu','+1-555-1234','CUSTOMER',NULL,'2026-03-05 20:40:04.141913'),(4,'APPROVED','2026-03-06 11:02:00.296029','bob456@gmail.com','AADHAR_999999','AADHAR',_binary '','New York, NY','Bob','$2a$10$MOs1is2TOe03JJTyVvK77.NsdWIXFwyaHOOFnpD023gW0wod1guwy','+1-555-2222','PROVIDER','Plumbing','2026-03-06 11:02:00.296029'),(5,'APPROVED','2026-03-06 11:08:42.105967','charlie456@gmail.com','AADHAR_888888','AADHAR',_binary '','New York, NY','Charlie','$2a$10$zrllL7B9fjUNfmvcFEzTG.AQ1tItMzcciYWx6FXqXOjQuD598T.Fi','+1-555-3333','PROVIDER','Plumbing','2026-03-06 11:08:42.105967');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-14 16:18:03
