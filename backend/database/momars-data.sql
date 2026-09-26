
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
DROP TABLE IF EXISTS `app_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `app_settings` (
  `setting_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `app_settings` WRITE;
/*!40000 ALTER TABLE `app_settings` DISABLE KEYS */;
INSERT INTO `app_settings` VALUES ('registration_form_fields','[{\"id\":\"age\",\"label\":\"العمر\",\"type\":\"number\",\"required\":true,\"showInRequests\":true,\"options\":[]},{\"id\":\"complex_name\",\"label\":\"اسم المجمع\",\"type\":\"select\",\"required\":false,\"showInRequests\":true,\"options\":[\"غير محدد\"]},{\"id\":\"house_name\",\"label\":\"اسم الدار\",\"type\":\"select\",\"required\":false,\"showInRequests\":true,\"options\":[\"غير محدد\"]}]',NULL,'2026-07-21 15:42:01');
/*!40000 ALTER TABLE `app_settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `archives`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `archives` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `courses_count` int unsigned NOT NULL DEFAULT '0',
  `batch_type` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'all',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `archives_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `archives` WRITE;
/*!40000 ALTER TABLE `archives` DISABLE KEYS */;
INSERT INTO `archives` VALUES ('019e4740-39c7-70e0-bb7c-4d9966e38138','Code2',0,'all','2026-05-20 21:17:31'),('019e4748-e0ea-737b-8266-63efe2d59872','شس',0,'all','2026-05-20 21:26:59'),('019ea8f2-2ad7-7376-a9dd-471e3a142fb4','123',0,'all','2026-06-08 20:35:03');
/*!40000 ALTER TABLE `archives` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `branches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `branches` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `branches_code_unique` (`code`),
  UNIQUE KEY `branches_name_unique` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `branches` WRITE;
/*!40000 ALTER TABLE `branches` DISABLE KEYS */;
INSERT INTO `branches` VALUES ('89e5a268-f2f8-4f13-8a3e-9f9e5cb238f9','female','معلمات','2026-05-14 07:46:58'),('a88056c0-8c94-40cb-9515-6cb7aa6b869f','male','معلمين','2026-05-14 07:46:58');
/*!40000 ALTER TABLE `branches` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `cache`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

DROP TABLE IF EXISTS `cache_locks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cache_locks` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`),
  KEY `cache_locks_expiration_index` (`expiration`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cache_locks` WRITE;
/*!40000 ALTER TABLE `cache_locks` DISABLE KEYS */;
/*!40000 ALTER TABLE `cache_locks` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `completion_requirement_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `completion_requirement_settings` (
  `branch_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `attendance_required` smallint unsigned NOT NULL DEFAULT '10',
  `tasks_percentage_required` tinyint unsigned NOT NULL DEFAULT '80',
  `final_exam_percentage_required` tinyint unsigned NOT NULL DEFAULT '70',
  `quran_parts_required` tinyint unsigned NOT NULL,
  `is_closed` tinyint(1) NOT NULL DEFAULT '0',
  `closed_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `closed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`branch_code`),
  KEY `completion_requirement_settings_closed_by_foreign` (`closed_by`),
  CONSTRAINT `completion_requirement_settings_closed_by_foreign` FOREIGN KEY (`closed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `completion_requirement_settings` WRITE;
/*!40000 ALTER TABLE `completion_requirement_settings` DISABLE KEYS */;
INSERT INTO `completion_requirement_settings` VALUES ('female',10,80,70,10,0,NULL,NULL,'2026-07-21 15:42:03','2026-07-21 15:42:03'),('male',10,80,70,30,0,NULL,NULL,'2026-07-21 15:42:03','2026-07-21 15:42:03');
/*!40000 ALTER TABLE `completion_requirement_settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `course_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_attendance` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `source` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'post-test',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `course_attendance_course_id_login_code_source_unique` (`course_id`,`login_code`,`source`),
  KEY `course_attendance_student_id_foreign` (`student_id`),
  KEY `course_attendance_archive_id_foreign` (`archive_id`),
  KEY `attendance_archive_login_course_index` (`archive_id`,`login_code`,`course_id`),
  CONSTRAINT `course_attendance_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_attendance_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_attendance_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `course_attendance` WRITE;
/*!40000 ALTER TABLE `course_attendance` DISABLE KEYS */;
INSERT INTO `course_attendance` VALUES ('1972eff7-a0b8-4fc6-9a24-221984013e31','69b7eb69-c633-45c7-95d8-a73c5a1fbcd6','019e2660-cb44-722e-a8eb-8748e437395f','اختبار 933223','933223','manual','2026-05-15 18:01:58','019e4740-39c7-70e0-bb7c-4d9966e38138'),('ef0740d4-94b6-4503-9bfe-40fac3eacb51','69b7eb69-c633-45c7-95d8-a73c5a1fbcd6','019e2657-68c2-729b-a7d2-5797949d138a','123','123','manual','2026-05-15 18:01:58','019e4740-39c7-70e0-bb7c-4d9966e38138');
/*!40000 ALTER TABLE `course_attendance` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `course_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_questions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` json DEFAULT NULL,
  `allow_file` tinyint(1) NOT NULL DEFAULT '0',
  `points` int NOT NULL DEFAULT '1',
  `correct_answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `attachment_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `attachment_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `attachment_data_url` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_path` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `course_questions_course_id_foreign` (`course_id`),
  KEY `course_questions_archive_id_foreign` (`archive_id`),
  CONSTRAINT `course_questions_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_questions_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `course_questions` WRITE;
/*!40000 ALTER TABLE `course_questions` DISABLE KEYS */;
INSERT INTO `course_questions` VALUES ('144ca2fe-d43b-4bce-b2e7-61b277840576','b8df93a6-cd64-43ac-a12b-ccc012664f97','tasks','text','إرفاق ملف المهمة الأدائية','[]',1,1,'','','','',0,'2026-06-16 20:18:47',NULL,NULL),('643f701a-883d-4f51-825f-af077fe13c9c','79460e58-bd9e-4288-9cf8-ff02712c4458','tasks','text','إرفاق ملف المهمة الأدائية','[]',1,1,'','','','',0,'2026-06-06 11:35:06','019ea8f2-2ad7-7376-a9dd-471e3a142fb4',NULL),('9961b21a-ce51-4378-8075-d3eccce9ddcf','69b7eb69-c633-45c7-95d8-a73c5a1fbcd6','pre','multiple','شسي','[\"شسي\", \"شسي\"]',0,1,'شسي','','','',0,'2026-05-14 16:45:01','019e4740-39c7-70e0-bb7c-4d9966e38138',NULL);
/*!40000 ALTER TABLE `course_questions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `course_submission_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_submission_answers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `submission_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_data_url` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_prompt_snapshot` text COLLATE utf8mb4_unicode_ci,
  `question_type_snapshot` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_options_snapshot` json DEFAULT NULL,
  `correct_answer_snapshot` text COLLATE utf8mb4_unicode_ci,
  `question_points_snapshot` int DEFAULT NULL,
  `allow_file_snapshot` tinyint(1) DEFAULT NULL,
  `file_path` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `course_answers_submission_question_unique` (`submission_id`,`question_id`),
  KEY `course_submission_answers_submission_id_foreign` (`submission_id`),
  KEY `course_submission_answers_question_id_foreign` (`question_id`),
  KEY `course_submission_answers_archive_id_foreign` (`archive_id`),
  KEY `submission_answers_archive_submission_index` (`archive_id`,`submission_id`),
  CONSTRAINT `course_submission_answers_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_submission_answers_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `course_questions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `course_submission_answers_submission_id_foreign` FOREIGN KEY (`submission_id`) REFERENCES `course_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `course_submission_answers` WRITE;
/*!40000 ALTER TABLE `course_submission_answers` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_submission_answers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `course_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `course_submissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `assessment_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `student_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manual_score` decimal(8,2) DEFAULT NULL,
  `task_review_status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_reviewed_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_reviewed_at` timestamp NULL DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `submission_uniqueness_scope` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'active',
  PRIMARY KEY (`id`),
  UNIQUE KEY `course_submission_once_per_scope_unique` (`course_id`,`assessment_type`,`login_code`,`submission_uniqueness_scope`),
  KEY `course_submissions_course_id_foreign` (`course_id`),
  KEY `course_submissions_student_id_foreign` (`student_id`),
  KEY `course_submissions_archive_id_foreign` (`archive_id`),
  KEY `course_submissions_task_reviewed_by_foreign` (`task_reviewed_by`),
  KEY `course_submissions_assessment_type_task_review_status_index` (`assessment_type`,`task_review_status`),
  KEY `submissions_completion_lookup_index` (`archive_id`,`assessment_type`,`task_review_status`,`course_id`,`login_code`),
  CONSTRAINT `course_submissions_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_submissions_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `course_submissions_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL,
  CONSTRAINT `course_submissions_task_reviewed_by_foreign` FOREIGN KEY (`task_reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `course_submissions` WRITE;
/*!40000 ALTER TABLE `course_submissions` DISABLE KEYS */;
/*!40000 ALTER TABLE `course_submissions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `courses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `courses` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'course',
  `task_mode` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_template_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `task_template_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `task_template_content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `youtube_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `task_description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `is_pre_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_post_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `is_tasks_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `male_pre_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `female_pre_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `male_post_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `female_post_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `male_tasks_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `female_tasks_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `assessment_windows` json DEFAULT NULL,
  `assessment_notification_templates` json DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `courses_created_by_foreign` (`created_by`),
  KEY `courses_archive_id_foreign` (`archive_id`),
  CONSTRAINT `courses_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `courses_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `courses` WRITE;
/*!40000 ALTER TABLE `courses` DISABLE KEYS */;
INSERT INTO `courses` VALUES ('1a1d10a0-c85d-47e7-a91d-4f8c9e5b747d','123','course',NULL,NULL,'','','','',0,1,1,0,1,1,1,1,1,1,'{\"male\": [], \"female\": [], \"global\": []}','{\"pre\": \"\", \"post\": \"\", \"tasks\": \"\"}',3,NULL,'2026-06-16 20:18:25',NULL),('69b7eb69-c633-45c7-95d8-a73c5a1fbcd6','12','course',NULL,NULL,'','','',NULL,0,1,0,0,1,1,0,0,1,1,'{\"male\": [], \"female\": [], \"global\": {\"pre\": {\"opensAt\": \"2026-05-19T15:28:34.004Z\", \"closesAt\": \"2026-05-19T16:28:34.004Z\", \"durationMinutes\": 60}}}','{\"pre\": \"\", \"post\": \"\", \"tasks\": \"\"}',0,NULL,'2026-05-14 16:22:32','019e4740-39c7-70e0-bb7c-4d9966e38138'),('79460e58-bd9e-4288-9cf8-ff02712c4458','1','task','document',NULL,'','','','',0,1,1,0,1,1,1,1,1,1,'{\"male\": [], \"female\": [], \"global\": []}','{\"pre\": \"\", \"post\": \"\", \"tasks\": \"\"}',1,NULL,'2026-06-06 11:35:01','019ea8f2-2ad7-7376-a9dd-471e3a142fb4'),('99d3826e-bfe3-4b78-873c-86c726162525','-','course',NULL,NULL,'','','','',0,1,1,0,1,1,1,1,1,1,'{\"male\": [], \"female\": [], \"global\": []}','{\"pre\": \"\", \"post\": \"\", \"tasks\": \"\"}',2,NULL,'2026-06-08 16:41:20','019ea8f2-2ad7-7376-a9dd-471e3a142fb4'),('b8df93a6-cd64-43ac-a12b-ccc012664f97','123','task','document',NULL,'','<p>dasd</p>','','dsad',1,0,0,1,1,1,1,1,1,1,'{\"male\": {\"tasks\": {\"opensAt\": \"2026-06-16T23:18:55.698Z\", \"closesAt\": \"2026-06-17T00:18:55.698Z\", \"durationMinutes\": 60}}, \"female\": {\"tasks\": {\"opensAt\": \"2026-06-16T23:18:55.698Z\", \"closesAt\": \"2026-06-17T00:18:55.698Z\", \"durationMinutes\": 60}}, \"global\": {\"tasks\": {\"opensAt\": \"2026-06-16T23:18:55.698Z\", \"closesAt\": \"2026-06-17T00:18:55.698Z\", \"durationMinutes\": 60}}}','{\"pre\": \"\", \"post\": \"\", \"tasks\": \"\"}',4,NULL,'2026-06-16 20:18:39',NULL);
/*!40000 ALTER TABLE `courses` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `editor_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `editor_assets` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `editor_assets_created_by_foreign` (`created_by`),
  CONSTRAINT `editor_assets_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `editor_assets` WRITE;
/*!40000 ALTER TABLE `editor_assets` DISABLE KEYS */;
INSERT INTO `editor_assets` VALUES (1,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-15 21:01:22'),(2,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-15 21:06:54'),(3,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-15 21:15:03'),(4,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-28 22:47:00'),(5,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-28 22:47:59'),(6,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-28 23:02:13'),(7,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-28 23:16:37'),(8,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-28 23:16:54'),(9,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-29 12:33:17'),(10,'019e2619-320c-71ac-8e13-14ba366286b6','2026-05-29 13:54:17');
/*!40000 ALTER TABLE `editor_assets` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `failed_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `failed_jobs` WRITE;
/*!40000 ALTER TABLE `failed_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `failed_jobs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `final_exam_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `final_exam_questions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` json DEFAULT NULL,
  `allow_file` tinyint(1) NOT NULL DEFAULT '0',
  `points` int NOT NULL DEFAULT '1',
  `correct_answer` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `attachment_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `attachment_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `attachment_data_url` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `attachment_path` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `final_exam_questions_archive_id_foreign` (`archive_id`),
  KEY `final_questions_archive_branch_sort_index` (`archive_id`,`branch_code`,`sort_order`),
  CONSTRAINT `final_exam_questions_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `final_exam_questions` WRITE;
/*!40000 ALTER TABLE `final_exam_questions` DISABLE KEYS */;
INSERT INTO `final_exam_questions` VALUES ('7aa1b4be-3699-4f54-a6e2-ea3a8ac3b484','female','multiple','fasf','[\"af\", \"412\"]',0,1,'412','','','',1,'2026-06-16 20:19:08',NULL,NULL),('b6af54d8-bb31-4bd1-9531-b9dce1f7be54','female','multiple','يش','[\"يش\", \"يشش\"]',0,1,'يش','','','',0,'2026-05-30 11:38:50','019ea8f2-2ad7-7376-a9dd-471e3a142fb4',NULL),('da1ef31e-3dcf-430d-a224-680787d10b5a','male','multiple','سؤال تجريبي للاختبار النهائي؟','[\"الأول\", \"الثاني\"]',0,1,'الأول','','','',0,'2026-05-21 18:36:34','019ea8f2-2ad7-7376-a9dd-471e3a142fb4',NULL);
/*!40000 ALTER TABLE `final_exam_questions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `final_exam_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `final_exam_settings` (
  `branch_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '0',
  `closes_at` timestamp NULL DEFAULT NULL,
  `notification_template` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`branch_code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `final_exam_settings` WRITE;
/*!40000 ALTER TABLE `final_exam_settings` DISABLE KEYS */;
INSERT INTO `final_exam_settings` VALUES ('female',1,'2026-06-17 00:19:12',''),('male',1,'2026-05-30 15:38:58','');
/*!40000 ALTER TABLE `final_exam_settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `final_exam_submission_answers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `final_exam_submission_answers` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `submission_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer_text` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `file_data_url` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_prompt_snapshot` text COLLATE utf8mb4_unicode_ci,
  `question_type_snapshot` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `question_options_snapshot` json DEFAULT NULL,
  `correct_answer_snapshot` text COLLATE utf8mb4_unicode_ci,
  `question_points_snapshot` int DEFAULT NULL,
  `allow_file_snapshot` tinyint(1) DEFAULT NULL,
  `file_path` varchar(1024) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `final_answers_submission_question_unique` (`submission_id`,`question_id`),
  KEY `final_exam_submission_answers_submission_id_foreign` (`submission_id`),
  KEY `final_exam_submission_answers_question_id_foreign` (`question_id`),
  KEY `final_exam_submission_answers_archive_id_foreign` (`archive_id`),
  KEY `final_answers_archive_submission_index` (`archive_id`,`submission_id`),
  CONSTRAINT `final_exam_submission_answers_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `final_exam_submission_answers_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `final_exam_questions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `final_exam_submission_answers_submission_id_foreign` FOREIGN KEY (`submission_id`) REFERENCES `final_exam_submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `final_exam_submission_answers` WRITE;
/*!40000 ALTER TABLE `final_exam_submission_answers` DISABLE KEYS */;
INSERT INTO `final_exam_submission_answers` VALUES ('6be68a34-2fd6-4a5a-ae49-08cbcd1547e7','5733557a-2d69-4a97-9175-647e1fee44b6','da1ef31e-3dcf-430d-a224-680787d10b5a','الثاني',NULL,NULL,NULL,NULL,'سؤال تجريبي للاختبار النهائي؟','multiple','[\"الأول\", \"الثاني\"]','الأول',1,0,NULL);
/*!40000 ALTER TABLE `final_exam_submission_answers` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `final_exam_submissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `final_exam_submissions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `manual_score` decimal(8,2) DEFAULT NULL,
  `submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `final_exam_submissions_login_code_unique` (`login_code`),
  KEY `final_exam_submissions_archive_id_foreign` (`archive_id`),
  KEY `final_submissions_archive_branch_login_index` (`archive_id`,`branch_code`,`login_code`),
  CONSTRAINT `final_exam_submissions_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `final_exam_submissions` WRITE;
/*!40000 ALTER TABLE `final_exam_submissions` DISABLE KEYS */;
INSERT INTO `final_exam_submissions` VALUES ('5733557a-2d69-4a97-9175-647e1fee44b6','male','44','44',NULL,'2026-05-30 11:40:34',NULL);
/*!40000 ALTER TABLE `final_exam_submissions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `job_batches`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_batches` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `total_jobs` int NOT NULL,
  `pending_jobs` int NOT NULL,
  `failed_jobs` int NOT NULL,
  `failed_job_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `options` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `cancelled_at` int DEFAULT NULL,
  `created_at` int NOT NULL,
  `finished_at` int DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `job_batches` WRITE;
/*!40000 ALTER TABLE `job_batches` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_batches` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `queue` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `jobs` WRITE;
/*!40000 ALTER TABLE `jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `jobs` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `media`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `media` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `model_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `model_id` bigint unsigned NOT NULL,
  `uuid` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `collection_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `disk` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `conversions_disk` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` bigint unsigned NOT NULL,
  `manipulations` json NOT NULL,
  `custom_properties` json NOT NULL,
  `generated_conversions` json NOT NULL,
  `responsive_images` json NOT NULL,
  `order_column` int unsigned DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `media_uuid_unique` (`uuid`),
  KEY `media_model_type_model_id_index` (`model_type`,`model_id`),
  KEY `media_order_column_index` (`order_column`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `media` WRITE;
/*!40000 ALTER TABLE `media` DISABLE KEYS */;
INSERT INTO `media` VALUES (1,'App\\Models\\EditorAsset',1,'777b9e9a-4a74-4e04-b416-a4531ba101c1','editor-images','10','HLjwf8ponVQVaqTx6qvjUmnoICGz7U2QcXUXuEcO.png','image/png','public','public',3213098,'[]','[]','[]','[]',1,'2026-05-15 18:01:22','2026-05-15 18:01:22'),(2,'App\\Models\\EditorAsset',2,'c3a88b31-4da1-49c9-9574-ca29d43895d1','editor-images','9','kXuoZmGSB1q3L172bkU6KICXNUf5pOxcpfLrEORs.png','image/png','public','public',3743013,'[]','[]','[]','[]',1,'2026-05-15 18:06:54','2026-05-15 18:06:54'),(3,'App\\Models\\EditorAsset',3,'de2597ad-9bb0-4a84-b892-e55c9b29af78','editor-images','ابن رجب','cRcvilVSYAPBhv91s745J6LLe3uGb8zGWMKKpOjh.png','image/png','public','public',4362927,'[]','[]','[]','[]',1,'2026-05-15 18:15:03','2026-05-15 18:15:03'),(5,'App\\Models\\EditorAsset',4,'1df7a3a4-9eaf-4965-8b9e-7f6a96439196','editor-images','6','XFwYhvsVcN6NCcM8q6gYK1KE0iLHUszVRr43PDC0.png','image/png','public','public',282747,'[]','[]','[]','[]',1,'2026-05-28 19:47:00','2026-05-28 19:47:00'),(6,'App\\Models\\EditorAsset',5,'7dd6ba50-bd4f-49a6-abf4-cab37842ee21','editor-images','7','9BA5HwtBW2INRl8gCbsgzSs3IdH8q0v8W9xAJtcq.png','image/png','public','public',280275,'[]','[]','[]','[]',1,'2026-05-28 19:48:00','2026-05-28 19:48:00'),(7,'App\\Models\\EditorAsset',6,'2a2e7945-a052-4a12-88ad-f6808c044415','editor-images','6','Lt8wExLyKH9UI68CR07WRKGiueEJ2i3sRANYercl.png','image/png','public','public',282747,'[]','[]','[]','[]',1,'2026-05-28 20:02:13','2026-05-28 20:02:13'),(10,'App\\Models\\EditorAsset',7,'7638a2da-79c9-4139-a540-743cb72aff66','editor-images','7','kt0KwPBZGkePsxrzMkhbw9Slngtv4tKmTVZYB2M1.png','image/png','public','public',280275,'[]','[]','[]','[]',1,'2026-05-28 20:16:37','2026-05-28 20:16:37'),(11,'App\\Models\\EditorAsset',8,'7bc3a696-c56e-4d13-a312-b6f095b8c50f','editor-images','7','DfbVCpImKJA9ngqrzMQBJ8ro0yphnY9uKjNxqnrp.png','image/png','public','public',280275,'[]','[]','[]','[]',1,'2026-05-28 20:16:54','2026-05-28 20:16:54'),(12,'App\\Models\\EditorAsset',9,'d115ed39-d9c8-474b-b5e1-18770e95df19','editor-images','6','N05oPpggL2ecrURgUNX3WNJBHy1KP2jh5WjWmyOe.png','image/png','public','public',282747,'[]','[]','[]','[]',1,'2026-05-29 09:33:17','2026-05-29 09:33:17'),(13,'App\\Models\\EditorAsset',10,'f4c0814c-1717-4196-86f7-0215235159fc','editor-images','7','GwQAqrYB1UYTfDijx3do6Sghk9lYN1cm43g5DYrv.png','image/png','public','public',280275,'[]','[]','[]','[]',1,'2026-05-29 10:54:17','2026-05-29 10:54:17');
/*!40000 ALTER TABLE `media` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `migrations` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `migration` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `batch` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `migrations` WRITE;
/*!40000 ALTER TABLE `migrations` DISABLE KEYS */;
INSERT INTO `migrations` VALUES (1,'0001_01_01_000000_create_users_table',1),(2,'0001_01_01_000001_create_cache_table',1),(3,'0001_01_01_000002_create_jobs_table',1),(4,'2026_05_14_090000_create_momars_core_tables',1),(5,'2026_05_14_100000_create_activity_logs_table',1),(6,'2026_05_14_110000_create_personal_access_tokens_table',1),(7,'2026_05_14_120000_create_spatie_activity_log_table',2),(8,'2026_05_14_120000_create_media_table',3),(9,'2026_05_14_120100_create_editor_assets_table',3),(10,'2026_05_20_210331_create_archives_table_and_add_archive_id',4),(11,'2026_05_21_010000_create_registration_requests_tables',5),(12,'2026_05_22_170500_add_task_description_to_courses_table',6),(13,'2026_05_23_030000_add_archive_id_to_educational_tables',7),(14,'2026_05_23_040000_make_registration_request_branch_nullable',8),(15,'2026_05_23_050000_create_training_materials_table',9),(16,'2026_05_23_060000_rebuild_training_materials_table_with_branch_scope',10),(17,'2026_05_28_120000_create_program_settings_table',11),(18,'2026_05_29_000000_add_feature_flags_to_program_settings_table',12),(19,'2026_05_29_010000_add_assessment_flags_to_program_settings_table',13),(20,'2026_05_29_020000_add_custom_sidebar_items_to_program_settings_table',14),(21,'2026_05_28_000000_create_app_settings_table',15),(22,'2026_05_29_181500_add_archived_login_code_to_students_table',15),(23,'2026_06_08_000000_add_courses_count_to_archives_table',16),(24,'2026_06_08_010000_add_external_attachments_to_training_materials_table',17),(25,'2026_06_08_230000_remove_courses_count_from_archives_table',18),(26,'2026_06_08_231500_add_batch_type_to_archives_table',19),(27,'2026_06_08_233000_restore_courses_count_to_archives_table',20),(28,'2026_07_11_210000_add_unique_scope_to_course_submissions',21),(29,'2026_07_12_150000_persist_registration_profiles',21),(30,'2026_07_12_151000_add_task_review_status',21),(31,'2026_07_12_152000_add_sidebar_role_permissions',21),(32,'2026_07_12_153000_create_completion_requirements_tables',21),(33,'2026_07_12_160000_add_dashboard_query_indexes',21),(34,'2026_07_12_161000_add_initial_password_to_registration_requests',21),(35,'2026_07_12_162000_require_password_change_for_legacy_credentials',21),(36,'2026_07_13_000000_clear_unrequested_password_change_flags',21),(37,'2026_07_16_000000_align_session_user_id_with_uuid_users',21),(38,'2026_07_16_010000_repair_page_content_encoding',21),(39,'2026_07_17_000000_preserve_assessment_question_snapshots',21),(40,'2026_07_20_160000_move_assessment_attachments_to_private_storage',21);
/*!40000 ALTER TABLE `migrations` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `notifications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notifications` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `message` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `target_branch_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `target_login_ids` json DEFAULT NULL,
  `created_by_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_by_role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `notifications_archive_id_foreign` (`archive_id`),
  CONSTRAINT `notifications_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `notifications` WRITE;
/*!40000 ALTER TABLE `notifications` DISABLE KEYS */;
/*!40000 ALTER TABLE `notifications` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `personal_access_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personal_access_tokens` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `tokenable_type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `tokenable_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `abilities` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `last_used_at` timestamp NULL DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `personal_access_tokens_token_unique` (`token`),
  KEY `personal_access_tokens_tokenable_type_tokenable_id_index` (`tokenable_type`,`tokenable_id`)
) ENGINE=InnoDB AUTO_INCREMENT=53 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `personal_access_tokens` WRITE;
/*!40000 ALTER TABLE `personal_access_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `personal_access_tokens` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `program_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `program_settings` (
  `id` tinyint unsigned NOT NULL,
  `program_title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'برنامج رخصة ممارس',
  `program_short_title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'رخصة ممارس',
  `assessment_labels` json DEFAULT NULL,
  `assessment_flags` json DEFAULT NULL,
  `entity_labels` json DEFAULT NULL,
  `dashboard_labels` json DEFAULT NULL,
  `feature_flags` json DEFAULT NULL,
  `custom_sidebar_items` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `program_settings` WRITE;
/*!40000 ALTER TABLE `program_settings` DISABLE KEYS */;
INSERT INTO `program_settings` VALUES (1,'برنامج رخصة ممارس','رخصة ممارس','{\"pre\": \"الاختبار القبلي\", \"post\": \"الاختبار البعدي\", \"tasks\": \"المهام الأدائية\"}','{\"pre\": true, \"post\": true, \"tasks\": true}','{\"taskPlural\": \"المهام الأدائية\", \"coursePlural\": \"الدورات\", \"taskSingular\": \"المهمة الأدائية\", \"courseSingular\": \"الدورة\"}','{\"tasks\": \"المهام الأدائية\", \"users\": \"المستخدمين\", \"archive\": \"الأرشيف\", \"courses\": \"الدورات\", \"program\": \"البرنامج\", \"results\": \"النتائج\", \"overview\": \"الرئيسية\", \"settings\": \"الإعدادات\", \"finalexam\": \"الاختبار النهائي\", \"materials\": \"المواد التدريبية\", \"templates\": \"القوالب\", \"permissions\": \"الإشراف والصلاحيات\", \"registration\": \"التسجيل\", \"satisfaction\": \"استبيان الرضا\", \"notifications\": \"الإشعارات\"}','{\"tasks\": true, \"users\": true, \"archive\": true, \"courses\": true, \"program\": true, \"results\": true, \"overview\": true, \"settings\": true, \"finalexam\": true, \"materials\": true, \"templates\": true, \"permissions\": true, \"registration\": true, \"satisfaction\": true, \"notifications\": true}','[]','2026-05-28 18:06:21','2026-05-28 18:22:56');
/*!40000 ALTER TABLE `program_settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `push_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `push_subscriptions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `endpoint` varchar(512) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `p256dh` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `auth` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `push_subscriptions_login_code_endpoint_unique` (`login_code`,`endpoint`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `push_subscriptions` WRITE;
/*!40000 ALTER TABLE `push_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `push_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `reciter_students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reciter_students` (
  `reciter_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`reciter_id`,`student_id`),
  KEY `reciter_students_student_id_foreign` (`student_id`),
  CONSTRAINT `reciter_students_reciter_id_foreign` FOREIGN KEY (`reciter_id`) REFERENCES `reciters` (`id`) ON DELETE CASCADE,
  CONSTRAINT `reciter_students_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `reciter_students` WRITE;
/*!40000 ALTER TABLE `reciter_students` DISABLE KEYS */;
INSERT INTO `reciter_students` VALUES ('019e2676-9f70-722c-94ec-e93746cfc113','019e2657-68c2-729b-a7d2-5797949d138a','2026-05-14 09:29:28'),('019e40d4-215b-71cc-b50f-978ebec339e4','019e2657-68c2-729b-a7d2-5797949d138a','2026-05-19 12:21:44');
/*!40000 ALTER TABLE `reciter_students` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `reciters`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reciters` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `reciters_user_id_unique` (`user_id`),
  KEY `reciters_branch_id_foreign` (`branch_id`),
  KEY `reciters_archive_id_foreign` (`archive_id`),
  CONSTRAINT `reciters_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reciters_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `reciters_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `reciters` WRITE;
/*!40000 ALTER TABLE `reciters` DISABLE KEYS */;
INSERT INTO `reciters` VALUES ('019e2676-9f70-722c-94ec-e93746cfc113','321',NULL,'a88056c0-8c94-40cb-9515-6cb7aa6b869f','2026-05-14 12:29:28','019e4740-39c7-70e0-bb7c-4d9966e38138'),('019e40d4-215b-71cc-b50f-978ebec339e4','4',NULL,'a88056c0-8c94-40cb-9515-6cb7aa6b869f','2026-05-19 15:21:44','019e4740-39c7-70e0-bb7c-4d9966e38138');
/*!40000 ALTER TABLE `reciters` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `registration_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_requests` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `initial_password` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `answers` json DEFAULT NULL,
  `student_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `status` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `decision_reason` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `reviewed_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `registration_requests_status_created_at_index` (`status`,`created_at`),
  KEY `registration_requests_login_code_index` (`login_code`),
  KEY `registration_requests_student_id_index` (`student_id`),
  KEY `registration_branch_status_created_index` (`branch_code`,`status`,`created_at`),
  KEY `registration_gender_status_created_index` (`gender`,`status`,`created_at`),
  CONSTRAINT `registration_requests_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `registration_requests` WRITE;
/*!40000 ALTER TABLE `registration_requests` DISABLE KEYS */;
INSERT INTO `registration_requests` VALUES ('019e5244-363d-717d-8c60-d8f25b4a5884','31','31',NULL,NULL,NULL,NULL,NULL,'female','','accepted','تم القبول وإنشاء سجل الطالب وحساب الدخول.','019e2619-320c-71ac-8e13-14ba366286b6','2026-05-22 21:37:57','2026-05-22 21:37:42','2026-05-22 21:37:57'),('019eae85-5e63-738c-b407-d19486d039c4','1','1',NULL,NULL,NULL,NULL,NULL,NULL,NULL,'rejected','','019e2619-320c-71ac-8e13-14ba366286b6','2026-06-09 19:44:52','2026-06-09 19:33:56','2026-06-09 19:44:52');
/*!40000 ALTER TABLE `registration_requests` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `registration_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registration_settings` (
  `key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `registration_settings` WRITE;
/*!40000 ALTER TABLE `registration_settings` DISABLE KEYS */;
INSERT INTO `registration_settings` VALUES ('is_open','1','2026-06-16 20:20:59');
/*!40000 ALTER TABLE `registration_settings` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `permission_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`role`,`permission_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES ('female_manager','close_completion_results',0),('female_manager','edit_completion_requirements',0),('female_manager','page_archive',0),('female_manager','page_completion_requirements',0),('female_manager','page_courses',0),('female_manager','page_final_exam',0),('female_manager','page_materials',0),('female_manager','page_overview',1),('female_manager','page_registration',0),('female_manager','page_satisfaction',0),('female_manager','page_tasks',0),('female_manager','page_users',0),('male_manager','add_reciter',1),('male_manager','add_student',1),('male_manager','close_completion_results',0),('male_manager','edit_completion_requirements',0),('male_manager','edit_pre_questions',1),('male_manager','edit_student',0),('male_manager','page_archive',0),('male_manager','page_completion_requirements',0),('male_manager','page_courses',1),('male_manager','page_final_exam',0),('male_manager','page_materials',0),('male_manager','page_overview',1),('male_manager','page_registration',1),('male_manager','page_satisfaction',0),('male_manager','page_tasks',0),('male_manager','page_users',1);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `satisfaction_questions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `satisfaction_questions` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `prompt` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'rating',
  `is_required` tinyint(1) NOT NULL DEFAULT '1',
  `sort_order` int NOT NULL DEFAULT '0',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `satisfaction_questions_course_id_foreign` (`course_id`),
  KEY `satisfaction_questions_archive_id_foreign` (`archive_id`),
  CONSTRAINT `satisfaction_questions_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `satisfaction_questions_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `satisfaction_questions` WRITE;
/*!40000 ALTER TABLE `satisfaction_questions` DISABLE KEYS */;
INSERT INTO `satisfaction_questions` VALUES ('cba9f3bb-d049-4258-a801-07e84a445204','69b7eb69-c633-45c7-95d8-a73c5a1fbcd6','ش','rating',1,0,'2026-05-17 08:31:37','019e4740-39c7-70e0-bb7c-4d9966e38138');
/*!40000 ALTER TABLE `satisfaction_questions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `satisfaction_responses`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `satisfaction_responses` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `course_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `question_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating_value` tinyint unsigned DEFAULT NULL,
  `text_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `satisfaction_responses_course_id_question_id_login_code_unique` (`course_id`,`question_id`,`login_code`),
  KEY `satisfaction_responses_question_id_foreign` (`question_id`),
  KEY `satisfaction_responses_archive_id_foreign` (`archive_id`),
  CONSTRAINT `satisfaction_responses_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `satisfaction_responses_course_id_foreign` FOREIGN KEY (`course_id`) REFERENCES `courses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `satisfaction_responses_question_id_foreign` FOREIGN KEY (`question_id`) REFERENCES `satisfaction_questions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `satisfaction_responses` WRITE;
/*!40000 ALTER TABLE `satisfaction_responses` DISABLE KEYS */;
/*!40000 ALTER TABLE `satisfaction_responses` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `id` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ip_address` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `payload` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `student_completion_results`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_completion_results` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `student_id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `branch_code` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `requirements_snapshot` json NOT NULL,
  `details` json NOT NULL,
  `finalized_by` char(36) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `finalized_at` timestamp NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `student_completion_results_student_id_unique` (`student_id`),
  KEY `student_completion_results_finalized_by_foreign` (`finalized_by`),
  KEY `student_completion_results_branch_code_status_index` (`branch_code`,`status`),
  CONSTRAINT `student_completion_results_finalized_by_foreign` FOREIGN KEY (`finalized_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `student_completion_results_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `student_completion_results` WRITE;
/*!40000 ALTER TABLE `student_completion_results` DISABLE KEYS */;
/*!40000 ALTER TABLE `student_completion_results` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `student_parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `student_parts` (
  `student_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `part_number` tinyint unsigned NOT NULL,
  `marked_by_reciter_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `marked_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`student_id`,`part_number`),
  KEY `student_parts_marked_by_reciter_id_foreign` (`marked_by_reciter_id`),
  CONSTRAINT `student_parts_marked_by_reciter_id_foreign` FOREIGN KEY (`marked_by_reciter_id`) REFERENCES `reciters` (`id`) ON DELETE SET NULL,
  CONSTRAINT `student_parts_student_id_foreign` FOREIGN KEY (`student_id`) REFERENCES `students` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `student_parts` WRITE;
/*!40000 ALTER TABLE `student_parts` DISABLE KEYS */;
INSERT INTO `student_parts` VALUES ('019e2657-68c2-729b-a7d2-5797949d138a',2,'019e2676-9f70-722c-94ec-e93746cfc113','2026-05-19 12:38:03'),('019ed2bb-8c73-71fe-b5ff-d396009f83aa',1,NULL,'2026-06-16 20:19:31');
/*!40000 ALTER TABLE `student_parts` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `students`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `students` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `archived_login_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `branch_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `note` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_certified` tinyint(1) NOT NULL DEFAULT '0',
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `archive_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `students_login_code_unique` (`login_code`),
  KEY `students_branch_id_foreign` (`branch_id`),
  KEY `students_created_by_foreign` (`created_by`),
  KEY `students_archive_id_foreign` (`archive_id`),
  KEY `students_archived_login_code_index` (`archived_login_code`),
  KEY `students_archive_branch_created_index` (`archive_id`,`branch_id`,`created_at`),
  CONSTRAINT `students_archive_id_foreign` FOREIGN KEY (`archive_id`) REFERENCES `archives` (`id`) ON DELETE SET NULL,
  CONSTRAINT `students_branch_id_foreign` FOREIGN KEY (`branch_id`) REFERENCES `branches` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `students_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `students` WRITE;
/*!40000 ALTER TABLE `students` DISABLE KEYS */;
INSERT INTO `students` VALUES ('019e2657-68c2-729b-a7d2-5797949d138a','123','archive-5e9c75c338','123','a88056c0-8c94-40cb-9515-6cb7aa6b869f','',1,NULL,'2026-05-14 11:55:23','019e4740-39c7-70e0-bb7c-4d9966e38138'),('019e2660-cb44-722e-a8eb-8748e437395f','اختبار 933223','archive-1bc374f886','933223','a88056c0-8c94-40cb-9515-6cb7aa6b869f','',0,NULL,'2026-05-14 12:05:38','019e4740-39c7-70e0-bb7c-4d9966e38138'),('019e98c8-c73a-73ab-87e3-02d5696b3cc6','123','archive-54fce456f4','123','a88056c0-8c94-40cb-9515-6cb7aa6b869f','',0,NULL,'2026-06-05 17:15:55','019ea8f2-2ad7-7376-a9dd-471e3a142fb4'),('019ed2bb-8c73-71fe-b5ff-d396009f83aa','33','33',NULL,'a88056c0-8c94-40cb-9515-6cb7aa6b869f','',0,NULL,'2026-06-16 23:19:27',NULL);
/*!40000 ALTER TABLE `students` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `task_templates`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_templates` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `task_templates` WRITE;
/*!40000 ALTER TABLE `task_templates` DISABLE KEYS */;
INSERT INTO `task_templates` VALUES ('493c6c46-4a7b-4dbb-981c-b25c9921ef81','12','<h1>&nbsp;</h1><h1>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</h1><h1><br></h1><h1><br></h1><h1>ثصض</h1>','2026-05-14 17:59:40'),('6c6796cf-2d5d-46e7-82f2-05966e94cfe5','1','<h3>ش<img src=\"http://127.0.0.1:8001/storage/3/cRcvilVSYAPBhv91s745J6LLe3uGb8zGWMKKpOjh.png\" data-width-px=\"103\" data-x=\"-284\" data-y=\"-89\" class=\"\" style=\"position: relative; max-width: none; width: 103px; transform: translate(-284px, -89px);\"></h3>','2026-05-15 18:15:17');
/*!40000 ALTER TABLE `task_templates` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `training_materials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `training_materials` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `target_branch_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `external_attachments` json DEFAULT NULL,
  `created_by` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `training_materials_created_by_foreign` (`created_by`),
  KEY `training_materials_target_branch_code_index` (`target_branch_code`),
  CONSTRAINT `training_materials_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `training_materials` WRITE;
/*!40000 ALTER TABLE `training_materials` DISABLE KEYS */;
/*!40000 ALTER TABLE `training_materials` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `login_code` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `must_change_password` tinyint(1) NOT NULL DEFAULT '0',
  `remember_token` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_login_code_unique` (`login_code`),
  UNIQUE KEY `users_email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('019e2619-320c-71ac-8e13-14ba366286b6','مدير النمو المهني','admin','1483',NULL,NULL,NULL,0,NULL,'2026-05-14 07:47:25','2026-07-21 18:42:05');
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
