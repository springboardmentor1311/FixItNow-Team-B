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
  PRIMARY KEY (`id`),
  KEY `FKe0b0175l27ffcser90cjoots1` (`provider_id`),
  CONSTRAINT `FKe0b0175l27ffcser90cjoots1` FOREIGN KEY (`provider_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `services`
--

LOCK TABLES `services` WRITE;
/*!40000 ALTER TABLE `services` DISABLE KEYS */;
INSERT INTO `services` VALUES (1,'Mon-Sat 9AM-6PM',5.00,'Electrical','2026-03-06 11:21:23.164299','Professional fan repair and installation for ceiling fans, pedestal fans, and exhaust fans. Quick diagnosis and reliable service.',40.71280000,'New York, NY',-74.00600000,450.00,1,'Fan Repair / Installation',2),(2,'Mon-Sat 9AM-6PM',0.00,'Electrical','2026-03-06 11:22:27.616638','Professional light fixture installation for residential and commercial properties. We ensure safe and efficient lighting solutions.',40.71280000,'New York, NY',-74.00600000,450.00,0,'Light Fixture Installation',2),(3,'Mon-Sat 10AM-7PM',0.00,'Plumbing','2026-03-06 11:24:32.839539','Fix leaking pipes, taps, and valves. Our plumbers ensure durable repairs with quality fittings.',40.71500000,'New York, NY',-74.00300000,700.00,0,'Leakage Repair',4),(4,'Mon-Fri 9AM-5PM',0.00,'Carpentry','2026-03-06 12:14:53.810564','Repair and restoration of wooden furniture including chairs, tables, wardrobes, and sofas.',40.72000000,'New York, NY',-74.00000000,550.00,0,'Furniture Repair (Chair, Table, Sofa)',5),(5,'Mon-Fri 9AM-5PM',0.00,'Carpentry','2026-03-06 12:16:06.746901','Repair and restoration of wooden furniture including chairs, tables, wardrobes, and sofas.',40.72000000,'New York, NY',-74.00000000,550.00,0,'Door / Window Repair',5);
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

-- Dump completed on 2026-03-06 17:57:01
