-- Generated from the application's 63 model schemas.
-- Scalar and reference fields use typed columns; arrays and embedded records use child tables.

CREATE DATABASE IF NOT EXISTS `online_tutor` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `online_tutor`;

CREATE TABLE IF NOT EXISTS `user_sessions` (
  `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` INT UNSIGNED NOT NULL,
  `data` MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;

CREATE TABLE IF NOT EXISTS `assessments` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `apply_duration` TINYINT(1) NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `status` LONGTEXT NULL,
  `date` LONGTEXT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessments__task_types` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_assessments__task_types_root` FOREIGN KEY (`parent_id`) REFERENCES `assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessments__student_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_assessments__student_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessments__student_assessment_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_assessments__student_assessment_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessments__content` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `learning_content_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_assessments__content_root` FOREIGN KEY (`parent_id`) REFERENCES `assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessments__content__lessons` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `lesson_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_assessments__content__lessons_root` FOREIGN KEY (`parent_id`) REFERENCES `assessments` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assessments__content__lessons_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `assessments__content` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessments__content__lessons__practice_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_assessments__content__lessons__practice_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `assessments` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assessments__content__lessons__practice_ids_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `assessments__content__lessons` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assessments__content__lessons__challenges_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_assessments__content__lessons__challenges_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `assessments` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_assessments__content__lessons__challenges_ids_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `assessments__content__lessons` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `assigned_tutors` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `default_lesson_category` LONGTEXT NULL,
  `default_duration` LONGTEXT NULL,
  `price` DOUBLE NULL,
  `default_billing` LONGTEXT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attempted_assessments` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `assessment_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lesson_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `challenge_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `assessment_type` LONGTEXT NULL,
  `status` LONGTEXT NULL,
  `percentage` LONGTEXT NULL,
  `total_attempted_question` DOUBLE NULL,
  `total_correct_answer` DOUBLE NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `attempted_assessments__answers` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_attempted_assessments__answers_root` FOREIGN KEY (`parent_id`) REFERENCES `attempted_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `primary_number` DOUBLE NULL,
  `primary_email` LONGTEXT NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__notification_settings` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `send_birthday_email` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__notification_settings_root` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__event_scheduling` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `check_scheduling_conflict` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__event_scheduling_root` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__cancellation_policy` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `allow_event_cancellation` TINYINT(1) NULL,
  `prior_cancellation_time` DOUBLE NULL,
  `notify_on_cancellation` TINYINT(1) NULL,
  `event_cancelled_before_deadline` LONGTEXT NULL,
  `event_cancelled_after_deadline` LONGTEXT NULL,
  `policy_text` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__cancellation_policy_root` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__sales_taxes` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `tax_name` LONGTEXT NULL,
  `tax_rate` DOUBLE NULL,
  `is_default` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__sales_taxes_root` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__family_contact_settings` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `balance_date_type` LONGTEXT NULL,
  `specific_day` DOUBLE NULL,
  `specific_date` DATETIME(3) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__family_contact_settings_root` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__family_contact_settings__payment_methods` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `method` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__family_contact_settings__paym_8595fc48` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_business_settings__family_contact_settings__paym_729af104` FOREIGN KEY (`parent_row_id`) REFERENCES `business_settings__family_contact_settings` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__invoice_settings` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `overdue_reminder_day` LONGTEXT NULL,
  `email_time_frame` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__invoice_settings_root` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__invoice_settings__automatic_late_d14acdd3` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__invoice_settings__automatic_l_47ac0323` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_business_settings__invoice_settings__automatic_l_63329de5` FOREIGN KEY (`parent_row_id`) REFERENCES `business_settings__invoice_settings` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__invoice_settings__notifications_reminders` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__invoice_settings__notificatio_b0a2cb72` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_business_settings__invoice_settings__notificatio_16383ead` FOREIGN KEY (`parent_row_id`) REFERENCES `business_settings__invoice_settings` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__invoice_formatting` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `invoice_logo` LONGTEXT NULL,
  `invoice_name` LONGTEXT NULL,
  `negative_invoices` LONGTEXT NULL,
  `invoice_footer_text` LONGTEXT NULL,
  `invoice_accent_color` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__invoice_formatting_root` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__invoice_formatting__invoice_number` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `generate_invoice_number` TINYINT(1) NULL,
  `invoice_number_format` LONGTEXT NULL,
  `next_invoice_number` DOUBLE NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__invoice_formatting__invoice_n_1c413065` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_business_settings__invoice_formatting__invoice_n_a9e62e6d` FOREIGN KEY (`parent_row_id`) REFERENCES `business_settings__invoice_formatting` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `business_settings__invoice_formatting__options` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_business_settings__invoice_formatting__options_root` FOREIGN KEY (`parent_id`) REFERENCES `business_settings` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_business_settings__invoice_formatting__options_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `business_settings__invoice_formatting` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `challenges` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `type` LONGTEXT NULL,
  `duration` LONGTEXT NULL,
  `show_timer` TINYINT(1) NULL,
  `multiplication_no` DOUBLE NULL,
  `position` DOUBLE NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `challenges__practice_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_challenges__practice_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `challenges` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `challenges_versions` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `type` LONGTEXT NULL,
  `duration` LONGTEXT NULL,
  `show_timer` TINYINT(1) NULL,
  `multiplication_no` DOUBLE NULL,
  `version_type` LONGTEXT NULL,
  `original_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` DOUBLE NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `challenges_versions__practice_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_challenges_versions__practice_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `challenges_versions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `charge_categories` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `events` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `slug` LONGTEXT NULL,
  `parent_event_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `is_substitute_tutor` TINYINT(1) NULL,
  `substitute_tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `event_category_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `event_location_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `event_course_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `event_attendance_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `start_date` DATETIME(3) NULL,
  `start_time` DATETIME(3) NULL,
  `end_time` DATETIME(3) NULL,
  `duration` LONGTEXT NULL,
  `public_note` LONGTEXT NULL,
  `private_note` LONGTEXT NULL,
  `status` LONGTEXT NULL,
  `comment` LONGTEXT NULL,
  `cancel_requested_whole_day` TINYINT(1) NULL,
  `will_repeat` TINYINT(1) NULL,
  `student_pricing_option` LONGTEXT NULL,
  `per_std_lesson_price` DOUBLE NULL,
  `ignore_conflict` TINYINT(1) NULL,
  `timezone_warning_acknowledged` TINYINT(1) NULL,
  `leave_warning_acknowledged` TINYINT(1) NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `events__student_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_events__student_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `events` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `events__recurring_info` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `recurring_type` LONGTEXT NULL,
  `no_of_recurring` DOUBLE NULL,
  `repeat_indefinitely` TINYINT(1) NULL,
  `recurring_until` DATETIME(3) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_events__recurring_info_root` FOREIGN KEY (`parent_id`) REFERENCES `events` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_attendances` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `event_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `is_substitute` TINYINT(1) NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `group_note_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_attendances__attendees` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `status` LONGTEXT NULL,
  `std_was_late` TINYINT(1) NULL,
  `marked_attendance_at` DATETIME(3) NULL,
  `std_absent_billing_option` LONGTEXT NULL,
  `tutor_cancel_billing_option` LONGTEXT NULL,
  `lesson_price` DOUBLE NULL,
  `lesson_price_paid_at_lesson` DOUBLE NULL,
  `is_lesson_price_paid_at_lesson` TINYINT(1) NULL,
  `payment_note` LONGTEXT NULL,
  `payment_method` LONGTEXT NULL,
  `private_note` LONGTEXT NULL,
  `email_receipt` LONGTEXT NULL,
  `is_cc_email_receipt` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_event_attendances__attendees_root` FOREIGN KEY (`parent_id`) REFERENCES `event_attendances` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_attendances__attendees__private_attachments` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_event_attendances__attendees__private_attachments_root` FOREIGN KEY (`parent_id`) REFERENCES `event_attendances` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_attendances__attendees__private_attachments_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `event_attendances__attendees` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_categories` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `color` LONGTEXT NULL,
  `email_reminder` LONGTEXT NULL,
  `sms_reminder` LONGTEXT NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_courses` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `percentage` DOUBLE NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_courses__event_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_event_courses__event_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `event_courses` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_courses__content` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `learning_content_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lesson_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `is_default` TINYINT(1) NULL,
  `is_skipped` TINYINT(1) NULL,
  `status` LONGTEXT NULL,
  `slide_score` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_event_courses__content_root` FOREIGN KEY (`parent_id`) REFERENCES `event_courses` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_courses__content__slides` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `slide_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `attached_event_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `mark_as_read` TINYINT(1) NULL,
  `mark_at` DATETIME(3) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_event_courses__content__slides_root` FOREIGN KEY (`parent_id`) REFERENCES `event_courses` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_event_courses__content__slides_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `event_courses__content` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_group_notes_and_attachments` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `event_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `type` LONGTEXT NULL,
  `tutor_note` LONGTEXT NULL,
  `student_note` LONGTEXT NULL,
  `parent_note` LONGTEXT NULL,
  `email_to_all_attendees` TINYINT(1) NULL,
  `email_to_all_parents` TINYINT(1) NULL,
  `email_to_tutor_only` TINYINT(1) NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_group_notes_and_attachments__attachments` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `name` LONGTEXT NULL,
  `size` LONGTEXT NULL,
  `extension` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_event_group_notes_and_attachments__attachments_root` FOREIGN KEY (`parent_id`) REFERENCES `event_group_notes_and_attachments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_locations` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `color` LONGTEXT NULL,
  `icons` LONGTEXT NULL,
  `location_type` LONGTEXT NULL,
  `specific_address_details` LONGTEXT NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `event_templates` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `description` LONGTEXT NULL,
  `template_note` LONGTEXT NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `family_contacts` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `user_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `mobile_number__dial_code` LONGTEXT NULL,
  `mobile_number__iso_code` LONGTEXT NULL,
  `mobile_number__phone` LONGTEXT NULL,
  `mobile_number__sms_capable` TINYINT(1) NULL,
  `home_number__dial_code` LONGTEXT NULL,
  `home_number__iso_code` LONGTEXT NULL,
  `home_number__phone` LONGTEXT NULL,
  `home_number__sms_capable` TINYINT(1) NULL,
  `work_number__dial_code` LONGTEXT NULL,
  `work_number__iso_code` LONGTEXT NULL,
  `work_number__phone` LONGTEXT NULL,
  `work_number__sms_capable` TINYINT(1) NULL,
  `private_note` LONGTEXT NULL,
  `preferred_invoice_recipient` TINYINT(1) NULL,
  `show_in_student_portal` TINYINT(1) NULL,
  `email_lesson_reminders` TINYINT(1) NULL,
  `sms_lesson_reminders` TINYINT(1) NULL,
  `legal_parents` TINYINT(1) NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `createdAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `family_contacts__students` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_family_contacts__students_root` FOREIGN KEY (`parent_id`) REFERENCES `family_contacts` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `grades` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `status` DOUBLE NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `group_tags` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `created_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `color` LONGTEXT NULL,
  `description` LONGTEXT NULL,
  `active_status` TINYINT(1) NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `group_tags__student_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_group_tags__student_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `group_tags` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Invoice` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `skip_family_zero_invoice` TINYINT(1) NULL,
  `invoice_number` LONGTEXT NULL,
  `invoice_amount` DOUBLE NULL,
  `paid_amount` DOUBLE NULL,
  `created_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `date` DATETIME(3) NULL,
  `include_balance_type` LONGTEXT NULL,
  `previous_balance` DOUBLE NULL,
  `total_payments` DOUBLE NULL,
  `total_charges` DOUBLE NULL,
  `date_range__start` DATETIME(3) NULL,
  `date_range__end` DATETIME(3) NULL,
  `due_date` DATETIME(3) NULL,
  `display_type` LONGTEXT NULL,
  `footer_note` LONGTEXT NULL,
  `private_note` LONGTEXT NULL,
  `is_emailed` TINYINT(1) NULL,
  `email_sent_at` DATETIME(3) NULL,
  `is_archived` TINYINT(1) NULL,
  `archived_at` DATETIME(3) NULL,
  `archived_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `is_paid` TINYINT(1) NULL,
  `paid_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `paid_at` DATETIME(3) NULL,
  `is_void` TINYINT(1) NULL,
  `voided_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `voided_at` DATETIME(3) NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Invoice__transactions` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_Invoice__transactions_root` FOREIGN KEY (`parent_id`) REFERENCES `Invoice` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Invoice__category` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_Invoice__category_root` FOREIGN KEY (`parent_id`) REFERENCES `Invoice` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `learningContents` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `grade_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `topic_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `sub_topic_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `short_description` LONGTEXT NULL,
  `content_directory` LONGTEXT NULL,
  `thumbnail` LONGTEXT NULL,
  `status` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `learningContents__lesson_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_learningContents__lesson_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `learningContents` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `learning_content_versions` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `grade_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `topic_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `sub_topic_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `short_description` LONGTEXT NULL,
  `content_directory` LONGTEXT NULL,
  `thumbnail` LONGTEXT NULL,
  `original_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `status` DOUBLE NULL,
  `version_type` LONGTEXT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `learning_content_versions__lesson_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_learning_content_versions__lesson_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `learning_content_versions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lessons` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lessons__slide_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_lessons__slide_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `lessons` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lessons__practice_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_lessons__practice_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `lessons` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lessons__challenge_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_lessons__challenge_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `lessons` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lesson_versions` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `original_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `version_type` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lesson_versions__slide_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_lesson_versions__slide_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `lesson_versions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lesson_versions__practice_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_lesson_versions__practice_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `lesson_versions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `lesson_versions__challenge_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_lesson_versions__challenge_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `lesson_versions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `Notification` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `subject` LONGTEXT NULL,
  `type` LONGTEXT NULL,
  `cc_me_email` LONGTEXT NULL,
  `receiver__name` LONGTEXT NULL,
  `receiver__email` LONGTEXT NULL,
  `receiver__phone` LONGTEXT NULL,
  `sender__name` LONGTEXT NULL,
  `sender__email` LONGTEXT NULL,
  `status` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `attechments` LONGTEXT NULL,
  `messageBody` LONGTEXT NULL,
  `meta` LONGTEXT NULL,
  `sentAt` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `notification_templates` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `type` LONGTEXT NULL,
  `subject` LONGTEXT NULL,
  `message` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `points_balance` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `userId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `balance` DOUBLE NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `point_history` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tutorId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `studentId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `weekStart` DATETIME(3) NULL,
  `weekEnd` DATETIME(3) NULL,
  `pointsAssigned__attendingClassOnTime__marks` DOUBLE NULL,
  `pointsAssigned__attendingClassOnTime__received_at` DATETIME(3) NULL,
  `pointsAssigned__askingQuestions__marks` DOUBLE NULL,
  `pointsAssigned__askingQuestions__received_at` DATETIME(3) NULL,
  `pointsAssigned__homeworkSubmission__marks` DOUBLE NULL,
  `pointsAssigned__homeworkSubmission__received_at` DATETIME(3) NULL,
  `pointsAssigned__participatingClassActivities__marks` DOUBLE NULL,
  `pointsAssigned__participatingClassActivities__received_at` DATETIME(3) NULL,
  `pointsAssigned__bonusPoints__marks` DOUBLE NULL,
  `pointsAssigned__bonusPoints__received_at` DATETIME(3) NULL,
  `totalPoints` DOUBLE NULL,
  `comment` LONGTEXT NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `point_system` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `attendingClassOnTime` DOUBLE NULL,
  `askingQuestions` DOUBLE NULL,
  `homeworkSubmission` DOUBLE NULL,
  `participatingClassActivities` DOUBLE NULL,
  `bonusPoints` DOUBLE NULL,
  `assignmentGapDuration` DOUBLE NULL,
  `redemptionGapDuration` DOUBLE NULL,
  `pointAssignmentModificationPeriod` DOUBLE NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `point_transactions` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `receiverId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `senderId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `transactionType` LONGTEXT NULL,
  `amount` DOUBLE NULL,
  `pointHistoryId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `voucherHistoryId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `comment` LONGTEXT NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `policies` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `status` DOUBLE NULL,
  `attachment` LONGTEXT NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `policies__marked_as_read` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `marked_at` DATETIME(3) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_policies__marked_as_read_root` FOREIGN KEY (`parent_id`) REFERENCES `policies` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `practices` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `question_type` LONGTEXT NULL,
  `question_title` LONGTEXT NULL,
  `question` LONGTEXT NULL,
  `question_slug` LONGTEXT NULL,
  `question_duration` LONGTEXT NULL,
  `question_image` LONGTEXT NULL,
  `question_audio` LONGTEXT NULL,
  `question_explanation` LONGTEXT NULL,
  `content_directory` LONGTEXT NULL,
  `option_display_preference` LONGTEXT NULL,
  `challenges_listing` TINYINT(1) NULL,
  `reference_id` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `practices__options` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `option_image` LONGTEXT NULL,
  `option_text` LONGTEXT NULL,
  `option_correct` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_practices__options_root` FOREIGN KEY (`parent_id`) REFERENCES `practices` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `practices_versions` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `question_type` LONGTEXT NULL,
  `question_title` LONGTEXT NULL,
  `question` LONGTEXT NULL,
  `question_slug` LONGTEXT NULL,
  `question_duration` LONGTEXT NULL,
  `question_image` LONGTEXT NULL,
  `question_audio` LONGTEXT NULL,
  `question_explanation` LONGTEXT NULL,
  `content_directory` LONGTEXT NULL,
  `option_display_preference` LONGTEXT NULL,
  `challenges_listing` TINYINT(1) NULL,
  `original_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `version_type` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `practices_versions__options` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `option_image` LONGTEXT NULL,
  `option_text` LONGTEXT NULL,
  `option_correct` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_practices_versions__options_root` FOREIGN KEY (`parent_id`) REFERENCES `practices_versions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `programs` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `status` LONGTEXT NULL,
  `percentage` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `programs__ex_content` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `lesson_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `learning_content_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `is_skipped` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_programs__ex_content_root` FOREIGN KEY (`parent_id`) REFERENCES `programs` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `programs__ex_content__slides` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_programs__ex_content__slides_root` FOREIGN KEY (`parent_id`) REFERENCES `programs` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_programs__ex_content__slides_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `programs__ex_content` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `saved_assessments` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `assessment_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lesson_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `saved_assessments__answers` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_saved_assessments__answers_root` FOREIGN KEY (`parent_id`) REFERENCES `saved_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `schools` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `email` LONGTEXT NULL,
  `dial_code` DOUBLE NULL,
  `iso_code` LONGTEXT NULL,
  `phone` LONGTEXT NULL,
  `address` LONGTEXT NULL,
  `status` DOUBLE NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slides` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `duration` LONGTEXT NULL,
  `description` LONGTEXT NULL,
  `video_url` LONGTEXT NULL,
  `video` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `content_directory` LONGTEXT NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slides__attachments` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_slides__attachments_root` FOREIGN KEY (`parent_id`) REFERENCES `slides` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slides__marked_completed` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_slides__marked_completed_root` FOREIGN KEY (`parent_id`) REFERENCES `slides` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slides_versions` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `duration` LONGTEXT NULL,
  `description` LONGTEXT NULL,
  `video_url` LONGTEXT NULL,
  `video` LONGTEXT NULL,
  `original_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `version_type` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `content_directory` LONGTEXT NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slides_versions__attachments` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_slides_versions__attachments_root` FOREIGN KEY (`parent_id`) REFERENCES `slides_versions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `slides_versions__marked_completed` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_slides_versions__marked_completed_root` FOREIGN KEY (`parent_id`) REFERENCES `slides_versions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_auto_invoicing` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tutorId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `invoiceDetails__billingCycleStartDate` DATETIME(3) NULL,
  `invoiceDetails__invoiceCreationDate__option` LONGTEXT NULL,
  `invoiceDetails__invoiceCreationDate__customDate` DATETIME(3) NULL,
  `invoiceDetails__invoiceCreationDate__daysBeforeBillingStart` DOUBLE NULL,
  `invoiceDetails__dueDateSetup__option` LONGTEXT NULL,
  `invoiceDetails__dueDateSetup__customDate` DATETIME(3) NULL,
  `invoiceDetails__dueDateSetup__daysAfterInvoiceDate` DOUBLE NULL,
  `invoiceDetails__autoInvoicingSchedule__frequency` LONGTEXT NULL,
  `invoiceDetails__autoInvoicingSchedule__repeatsEvery` DOUBLE NULL,
  `invoiceDetails__autoInvoicingSchedule__repeatOption` LONGTEXT NULL,
  `preferences__displayStyle` LONGTEXT NULL,
  `preferences__zeroBalanceHandling` LONGTEXT NULL,
  `preferences__balanceForward` TINYINT(1) NULL,
  `preferences__autoEmail` TINYINT(1) NULL,
  `preferences__footerNote` LONGTEXT NULL,
  `isActive` TINYINT(1) NULL,
  `createdAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NULL,
  `created_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lastProcessed` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_auto_invoicing__invoiceDetails__invoiceFor` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_staff_auto_invoicing__invoiceDetails__invoiceFor_root` FOREIGN KEY (`parent_id`) REFERENCES `staff_auto_invoicing` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_invoices` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `skip_family_zero_invoice` TINYINT(1) NULL,
  `invoice_number` LONGTEXT NULL,
  `invoice_amount` DOUBLE NULL,
  `paid_amount` DOUBLE NULL,
  `created_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `date` DATETIME(3) NULL,
  `include_balance_type` LONGTEXT NULL,
  `previous_balance` DOUBLE NULL,
  `total_payments` DOUBLE NULL,
  `total_charges` DOUBLE NULL,
  `date_range__start` DATETIME(3) NULL,
  `date_range__end` DATETIME(3) NULL,
  `due_date` DATETIME(3) NULL,
  `display_type` LONGTEXT NULL,
  `footer_note` LONGTEXT NULL,
  `private_note` LONGTEXT NULL,
  `status` LONGTEXT NULL,
  `status_comment` LONGTEXT NULL,
  `is_emailed` TINYINT(1) NULL,
  `email_sent_at` DATETIME(3) NULL,
  `is_archived` TINYINT(1) NULL,
  `archived_at` DATETIME(3) NULL,
  `archived_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `is_paid` TINYINT(1) NULL,
  `paid_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `paid_at` DATETIME(3) NULL,
  `is_void` TINYINT(1) NULL,
  `voided_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `voided_at` DATETIME(3) NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_invoices__transactions` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_staff_invoices__transactions_root` FOREIGN KEY (`parent_id`) REFERENCES `staff_invoices` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_invoices__category` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_staff_invoices__category_root` FOREIGN KEY (`parent_id`) REFERENCES `staff_invoices` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_transactions` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `type` LONGTEXT NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `event_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `date` DATETIME(3) NULL,
  `payment_method` LONGTEXT NULL,
  `amount` DOUBLE NULL,
  `note` LONGTEXT NULL,
  `send_receipt` TINYINT(1) NULL,
  `email_recipient_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `email_recipient` LONGTEXT NULL,
  `sms_recipient_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `sms_recipient` LONGTEXT NULL,
  `charge_type` LONGTEXT NULL,
  `category__kind` LONGTEXT NULL,
  `category__refId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `recurring` TINYINT(1) NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `createdAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_transactions__invoices_id` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `paid_amount` DOUBLE NULL,
  `amount` DOUBLE NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_staff_transactions__invoices_id_root` FOREIGN KEY (`parent_id`) REFERENCES `staff_transactions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_transactions__charge_taxes` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `tax_name` LONGTEXT NULL,
  `tax_rate` DOUBLE NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_staff_transactions__charge_taxes_root` FOREIGN KEY (`parent_id`) REFERENCES `staff_transactions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_transactions__recurring_info` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `frequency` LONGTEXT NULL,
  `recurring_montly_on` LONGTEXT NULL,
  `repeat_until` DATETIME(3) NULL,
  `repeat_indefinitely` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_staff_transactions__recurring_info_root` FOREIGN KEY (`parent_id`) REFERENCES `staff_transactions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `staff_transactions__recurring_info__repeat_days` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_staff_transactions__recurring_info__repeat_days_root` FOREIGN KEY (`parent_id`) REFERENCES `staff_transactions` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_staff_transactions__recurring_info__repeat_days_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `staff_transactions__recurring_info` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_assessments` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `assessment_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `status` LONGTEXT NULL,
  `final_score` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_assessments__practice_score` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_student_assessments__practice_score_root` FOREIGN KEY (`parent_id`) REFERENCES `student_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_assessments__challenge_score` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_student_assessments__challenge_score_root` FOREIGN KEY (`parent_id`) REFERENCES `student_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auto_invoicing` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `studentId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `invoiceDetails__billingCycleStartDate` DATETIME(3) NULL,
  `invoiceDetails__invoiceCreationDate__option` LONGTEXT NULL,
  `invoiceDetails__invoiceCreationDate__customDate` DATETIME(3) NULL,
  `invoiceDetails__invoiceCreationDate__daysBeforeBillingStart` DOUBLE NULL,
  `invoiceDetails__dueDateSetup__option` LONGTEXT NULL,
  `invoiceDetails__dueDateSetup__customDate` DATETIME(3) NULL,
  `invoiceDetails__dueDateSetup__daysAfterInvoiceDate` DOUBLE NULL,
  `invoiceDetails__autoInvoicingSchedule__frequency` LONGTEXT NULL,
  `invoiceDetails__autoInvoicingSchedule__repeatsEvery` DOUBLE NULL,
  `invoiceDetails__autoInvoicingSchedule__repeatOption` LONGTEXT NULL,
  `preferences__displayStyle` LONGTEXT NULL,
  `preferences__zeroBalanceHandling` LONGTEXT NULL,
  `preferences__balanceForward` TINYINT(1) NULL,
  `preferences__autoEmail` TINYINT(1) NULL,
  `preferences__footerNote` LONGTEXT NULL,
  `isActive` TINYINT(1) NULL,
  `createdAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NULL,
  `created_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lastProcessed` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `auto_invoicing__invoiceDetails__invoiceFor` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_auto_invoicing__invoiceDetails__invoiceFor_root` FOREIGN KEY (`parent_id`) REFERENCES `auto_invoicing` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_preference` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `title` LONGTEXT NULL,
  `first_name` LONGTEXT NULL,
  `last_name` LONGTEXT NULL,
  `email` LONGTEXT NULL,
  `address` LONGTEXT NULL,
  `private_note` LONGTEXT NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_preference__mobile_number` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `number` LONGTEXT NULL,
  `is_sms_capable` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_student_preference__mobile_number_root` FOREIGN KEY (`parent_id`) REFERENCES `student_preference` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_preference__home_number` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `number` LONGTEXT NULL,
  `is_sms_capable` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_student_preference__home_number_root` FOREIGN KEY (`parent_id`) REFERENCES `student_preference` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_preference__work_number` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `number` LONGTEXT NULL,
  `is_sms_capable` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_student_preference__work_number_root` FOREIGN KEY (`parent_id`) REFERENCES `student_preference` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `student_preference__preferences` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `preferred_invoice_recipient` TINYINT(1) NULL,
  `student_portal_contact` TINYINT(1) NULL,
  `email_lesson_reminders` TINYINT(1) NULL,
  `sms_lesson_reminders` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_student_preference__preferences_root` FOREIGN KEY (`parent_id`) REFERENCES `student_preference` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `subTopics` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `topic_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `note` LONGTEXT NULL,
  `status` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `isDeleted` TINYINT(1) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `topics` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `topic_image` LONGTEXT NULL,
  `note` LONGTEXT NULL,
  `status` DOUBLE NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `type` LONGTEXT NULL,
  `student_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `event_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `date` DATETIME(3) NULL,
  `payment_method` LONGTEXT NULL,
  `amount` DOUBLE NULL,
  `note` LONGTEXT NULL,
  `send_receipt` TINYINT(1) NULL,
  `email_recipient_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `email_recipient` LONGTEXT NULL,
  `sms_recipient_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `sms_recipient` LONGTEXT NULL,
  `charge_type` LONGTEXT NULL,
  `category__kind` LONGTEXT NULL,
  `category__refId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `recurring` TINYINT(1) NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_by` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `createdAt` DATETIME(3) NULL,
  `updatedAt` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions__invoices_id` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `paid_amount` DOUBLE NULL,
  `amount` DOUBLE NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_transactions__invoices_id_root` FOREIGN KEY (`parent_id`) REFERENCES `transactions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions__charge_taxes` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `tax_name` LONGTEXT NULL,
  `tax_rate` DOUBLE NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_transactions__charge_taxes_root` FOREIGN KEY (`parent_id`) REFERENCES `transactions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions__recurring_info` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `frequency` LONGTEXT NULL,
  `recurring_montly_on` LONGTEXT NULL,
  `repeat_until` DATETIME(3) NULL,
  `repeat_indefinitely` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_transactions__recurring_info_root` FOREIGN KEY (`parent_id`) REFERENCES `transactions` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions__recurring_info__repeat_days` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_transactions__recurring_info__repeat_days_root` FOREIGN KEY (`parent_id`) REFERENCES `transactions` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_transactions__recurring_info__repeat_days_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `transactions__recurring_info` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_assessments` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `assessment_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `status` LONGTEXT NULL,
  `final_score` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_assessments__slide_score` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_assessments__slide_score_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_assessments__practice_score` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_assessments__practice_score_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_attempted_assessments` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `assessment_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `lesson_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `assessment_type` LONGTEXT NULL,
  `status` LONGTEXT NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_attempted_assessments__answers` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_attempted_assessments__answers_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_attempted_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_availabilities` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `start_date_time` DOUBLE NULL,
  `end_date_time` DOUBLE NULL,
  `note` LONGTEXT NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `isApproved` LONGTEXT NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_availabilities__days` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_availabilities__days_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_availabilities` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_leaves` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `start_date` DATETIME(3) NULL,
  `end_date` DATETIME(3) NULL,
  `note` LONGTEXT NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `isApproved` LONGTEXT NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_preference` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tutor_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_preference__email_notification_preferences` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `register_for_lesson` TINYINT(1) NULL,
  `cancel_for_lesson` TINYINT(1) NULL,
  `email_daily_agenda` LONGTEXT NULL,
  `select_time` LONGTEXT NULL,
  `send_email_daily_agenda` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_preference__email_notification_preferences_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_preference` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `name` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `status` LONGTEXT NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__tutor_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__tutor_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__tutor_assessment_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__tutor_assessment_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__original_content` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `training_content_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__original_content_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__original_content__lessons` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `lesson_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__original_content__le_0943e058` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tutor_training_assessments__original_content__le_5fea49c6` FOREIGN KEY (`parent_row_id`) REFERENCES `tutor_training_assessments__original_content` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__original_content__lesso_cacf1470` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__original_content__le_5c0f9890` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tutor_training_assessments__original_content__le_49533760` FOREIGN KEY (`parent_row_id`) REFERENCES `tutor_training_assessments__original_content__lessons` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__original_content__lesso_a1b5bf92` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__original_content__le_0167d946` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tutor_training_assessments__original_content__le_a12a7d50` FOREIGN KEY (`parent_row_id`) REFERENCES `tutor_training_assessments__original_content__lessons` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__content` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `training_content_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__content_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__content__lessons` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `lesson_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__content__lessons_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tutor_training_assessments__content__lessons_parent` FOREIGN KEY (`parent_row_id`) REFERENCES `tutor_training_assessments__content` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__content__lessons__slide_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__content__lessons__sl_42404e40` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tutor_training_assessments__content__lessons__sl_95d6a2b3` FOREIGN KEY (`parent_row_id`) REFERENCES `tutor_training_assessments__content__lessons` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_assessments__content__lessons__practice_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_assessments__content__lessons__pr_61986427` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_assessments` (`_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tutor_training_assessments__content__lessons__pr_e9e6bfb7` FOREIGN KEY (`parent_row_id`) REFERENCES `tutor_training_assessments__content__lessons` (`_row_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_contents` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `topic_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `sub_topic_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `short_description` LONGTEXT NULL,
  `content_directory` LONGTEXT NULL,
  `thumbnail` LONGTEXT NULL,
  `status` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_contents__lesson_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_contents__lesson_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_contents` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_lessons` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_lessons__slide_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_lessons__slide_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_lessons` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_lessons__practice_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_lessons__practice_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_lessons` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_practices` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `question_type` LONGTEXT NULL,
  `question_title` LONGTEXT NULL,
  `question` LONGTEXT NULL,
  `question_slug` LONGTEXT NULL,
  `question_duration` LONGTEXT NULL,
  `question_image` LONGTEXT NULL,
  `question_audio` LONGTEXT NULL,
  `question_explanation` LONGTEXT NULL,
  `content_directory` LONGTEXT NULL,
  `option_display_preference` LONGTEXT NULL,
  `challenges_listing` TINYINT(1) NULL,
  `reference_id` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_practices__options` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `option_image` LONGTEXT NULL,
  `option_text` LONGTEXT NULL,
  `option_correct` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_practices__options_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_practices` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_slides` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `duration` LONGTEXT NULL,
  `description` LONGTEXT NULL,
  `video_url` LONGTEXT NULL,
  `video` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `content_directory` LONGTEXT NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_slides__attachments` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_slides__attachments_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_slides` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_slides__marked_completed` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_slides__marked_completed_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_slides` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_contents` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tutor_training_content_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `topic_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `sub_topic_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `short_description` LONGTEXT NULL,
  `content_directory` LONGTEXT NULL,
  `thumbnail` LONGTEXT NULL,
  `status` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_contents__lesson_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_version_contents__lesson_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_version_contents` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_lessons` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tutor_training_lesson_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_lessons__slide_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_version_lessons__slide_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_version_lessons` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_lessons__practice_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_version_lessons__practice_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_version_lessons` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_practices` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tutor_training_practice_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `question_type` LONGTEXT NULL,
  `question_title` LONGTEXT NULL,
  `question` LONGTEXT NULL,
  `question_slug` LONGTEXT NULL,
  `question_duration` LONGTEXT NULL,
  `question_image` LONGTEXT NULL,
  `question_audio` LONGTEXT NULL,
  `question_explanation` LONGTEXT NULL,
  `content_directory` LONGTEXT NULL,
  `option_display_preference` LONGTEXT NULL,
  `challenges_listing` TINYINT(1) NULL,
  `reference_id` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_practices__options` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `option_image` LONGTEXT NULL,
  `option_text` LONGTEXT NULL,
  `option_correct` TINYINT(1) NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_version_practices__options_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_version_practices` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_slides` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `tutor_training_slide_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `duration` LONGTEXT NULL,
  `description` LONGTEXT NULL,
  `video_url` LONGTEXT NULL,
  `video` LONGTEXT NULL,
  `position` DOUBLE NULL,
  `content_directory` LONGTEXT NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_slides__attachments` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_version_slides__attachments_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_version_slides` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tutor_training_version_slides__marked_completed` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_tutor_training_version_slides__marked_completed_root` FOREIGN KEY (`parent_id`) REFERENCES `tutor_training_version_slides` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `role` DOUBLE NULL,
  `username` LONGTEXT NULL,
  `title` LONGTEXT NULL,
  `first_name` LONGTEXT NULL,
  `last_name` LONGTEXT NULL,
  `company_name` LONGTEXT NULL,
  `relationship` LONGTEXT NULL,
  `contact_type` LONGTEXT NULL,
  `dial_code` LONGTEXT NULL,
  `iso_code` LONGTEXT NULL,
  `phone` LONGTEXT NULL,
  `send_sms` DOUBLE NULL,
  `time_zone` LONGTEXT NULL,
  `email` LONGTEXT NULL,
  `password` LONGTEXT NULL,
  `token` LONGTEXT NULL,
  `gender` DOUBLE NULL,
  `profile_image` LONGTEXT NULL,
  `address` LONGTEXT NULL,
  `note` LONGTEXT NULL,
  `status` DOUBLE NULL,
  `start_date` DATETIME(3) NULL,
  `end_date` DATETIME(3) NULL,
  `calendar_color` LONGTEXT NULL,
  `virtual_meeting_link` LONGTEXT NULL,
  `qualification` LONGTEXT NULL,
  `register_number` LONGTEXT NULL,
  `ndis_number` LONGTEXT NULL,
  `account_number` LONGTEXT NULL,
  `skill_level` LONGTEXT NULL,
  `birth_day` DATETIME(3) NULL,
  `referrer` LONGTEXT NULL,
  `grade_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `school_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `group_tag_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `points_wallet_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `auto_invoice` TINYINT(1) NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users__subject_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_users__subject_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `users` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users__attachments` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `name` LONGTEXT NULL,
  `size` LONGTEXT NULL,
  `extension` LONGTEXT NULL,
  `note` LONGTEXT NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_users__attachments_root` FOREIGN KEY (`parent_id`) REFERENCES `users` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users__availability_id` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_users__availability_id_root` FOREIGN KEY (`parent_id`) REFERENCES `users` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users__leave_request_ids` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `value` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_users__leave_request_ids_root` FOREIGN KEY (`parent_id`) REFERENCES `users` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users__payroll` (
  `_row_id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `parent_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `parent_row_id` BIGINT UNSIGNED NULL,
  `item_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `type` LONGTEXT NULL,
  `pay_rate_hourly_rate` DOUBLE NULL,
  PRIMARY KEY (`_row_id`),
  INDEX `idx_parent_position` (`parent_id`, `position`),
  INDEX `idx_parent_row` (`parent_row_id`, `position`),
  CONSTRAINT `fk_users__payroll_root` FOREIGN KEY (`parent_id`) REFERENCES `users` (`_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `vouchers` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `title` LONGTEXT NULL,
  `slug` LONGTEXT NULL,
  `required_points` DOUBLE NULL,
  `equivalent_amount` DOUBLE NULL,
  `isDeleted` TINYINT(1) NULL,
  `deleted_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `voucher_histories` (
  `_id` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  `studentId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `voucherId` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `voucherRequiredPoints` DOUBLE NULL,
  `voucherEquivalentAmount` DOUBLE NULL,
  `balanceBeforeDeduction` DOUBLE NULL,
  `status` LONGTEXT NULL,
  `reason` LONGTEXT NULL,
  `approvedBy` VARCHAR(191) CHARACTER SET ascii COLLATE ascii_bin NULL,
  `created_at` DATETIME(3) NULL,
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
