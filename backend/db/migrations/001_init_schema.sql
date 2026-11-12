-- 001_init_schema.sql
-- Skema 12 Tabel Inti TumbuhPantau (InnoDB, utf8mb4_unicode_ci)

CREATE TABLE IF NOT EXISTS organizations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id INT UNSIGNED NULL,
  type ENUM('dinas_kesehatan', 'puskesmas', 'posyandu') NOT NULL,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_organizations_code (code),
  KEY idx_organizations_parent_id (parent_id),
  KEY idx_organizations_type_active (type, is_active),
  CONSTRAINT fk_organizations_parent
    FOREIGN KEY (parent_id) REFERENCES organizations(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  username VARCHAR(80) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('kader', 'petugas_puskesmas', 'dinas_kesehatan', 'administrator') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username),
  KEY idx_users_org_role (organization_id, role, is_active),
  CONSTRAINT fk_users_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guardians (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  name VARCHAR(150) NOT NULL,
  phone VARCHAR(40) NULL,
  address VARCHAR(255) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_guardians_org_name (organization_id, name),
  CONSTRAINT fk_guardians_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS children (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  guardian_id INT UNSIGNED NULL,
  guardian_relationship VARCHAR(60) NOT NULL DEFAULT 'Ibu',
  internal_code VARCHAR(50) NOT NULL,
  name VARCHAR(150) NOT NULL,
  birth_date DATE NOT NULL,
  sex ENUM('L', 'P') NOT NULL,
  registered_on DATE NOT NULL,
  inactive_on DATE NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_children_internal_code (internal_code),
  KEY idx_children_org_active (organization_id, inactive_on),
  KEY idx_children_duplicate_check (organization_id, name, birth_date),
  KEY idx_children_guardian (guardian_id),
  CONSTRAINT fk_children_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_children_guardian
    FOREIGN KEY (guardian_id) REFERENCES guardians(id)
    ON DELETE SET NULL ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS posyandu_sessions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  organization_id INT UNSIGNED NOT NULL,
  session_date DATE NOT NULL,
  status ENUM('open', 'closed', 'cancelled') NOT NULL DEFAULT 'open',
  notes VARCHAR(500) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at DATETIME NULL,
  cancelled_at DATETIME NULL,
  cancel_reason VARCHAR(500) NULL,
  UNIQUE KEY uq_posyandu_sessions_org_date (organization_id, session_date),
  KEY idx_posyandu_sessions_status (organization_id, status, session_date),
  KEY idx_posyandu_sessions_created_by (created_by),
  CONSTRAINT fk_posyandu_sessions_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_posyandu_sessions_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS attendances (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id INT UNSIGNED NOT NULL,
  child_id INT UNSIGNED NOT NULL,
  status ENUM('present', 'absent') NOT NULL DEFAULT 'present',
  recorded_by INT UNSIGNED NOT NULL,
  recorded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_attendances_session_child (session_id, child_id),
  KEY idx_attendances_child (child_id),
  KEY idx_attendances_recorded_by (recorded_by),
  CONSTRAINT fk_attendances_session
    FOREIGN KEY (session_id) REFERENCES posyandu_sessions(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_attendances_child
    FOREIGN KEY (child_id) REFERENCES children(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_attendances_recorded_by
    FOREIGN KEY (recorded_by) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS measurements (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  attendance_id INT UNSIGNED NOT NULL,
  revision_no INT UNSIGNED NOT NULL DEFAULT 1,
  supersedes_id INT UNSIGNED NULL,
  measured_at DATETIME NOT NULL,
  weight_kg DECIMAL(5,2) NULL,
  length_height_cm DECIMAL(5,1) NULL,
  position ENUM('recumbent', 'standing') NOT NULL,
  status ENUM('draft', 'submitted', 'voided') NOT NULL DEFAULT 'draft',
  correction_reason VARCHAR(500) NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_token VARCHAR(64) NOT NULL,
  UNIQUE KEY uq_measurements_request_token (request_token),
  KEY idx_measurements_attendance_status (attendance_id, status, revision_no),
  KEY idx_measurements_supersedes (supersedes_id),
  KEY idx_measurements_created_by (created_by),
  CONSTRAINT fk_measurements_attendance
    FOREIGN KEY (attendance_id) REFERENCES attendances(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_measurements_supersedes
    FOREIGN KEY (supersedes_id) REFERENCES measurements(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_measurements_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reference_versions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  source_url VARCHAR(255) NOT NULL,
  file_checksum VARCHAR(64) NOT NULL,
  algorithm_version VARCHAR(50) NOT NULL,
  activated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_reference_versions_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS growth_assessments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  measurement_id INT UNSIGNED NOT NULL,
  reference_version_id INT UNSIGNED NOT NULL,
  birth_date_used DATE NOT NULL,
  sex_used ENUM('L', 'P') NOT NULL,
  age_days INT NOT NULL,
  adjustment_cm DECIMAL(3,1) NOT NULL DEFAULT 0.0,
  adjusted_length_height_cm DECIMAL(5,1) NOT NULL,
  z_score DECIMAL(5,2) NOT NULL,
  category ENUM('sangat_pendek', 'pendek', 'normal', 'tinggi') NOT NULL,
  quality_status ENUM('valid', 'flagged_plausibility') NOT NULL DEFAULT 'valid',
  review_reason VARCHAR(255) NULL,
  review_status ENUM('not_flagged', 'pending', 'validated', 'remeasure_requested') NOT NULL DEFAULT 'not_flagged',
  reviewed_by INT UNSIGNED NULL,
  reviewed_at DATETIME NULL,
  review_note VARCHAR(500) NULL,
  UNIQUE KEY uq_growth_assessments_measurement (measurement_id),
  KEY idx_growth_assessments_review (review_status, category),
  KEY idx_growth_assessments_ref_version (reference_version_id),
  KEY idx_growth_assessments_reviewed_by (reviewed_by),
  CONSTRAINT fk_growth_assessments_measurement
    FOREIGN KEY (measurement_id) REFERENCES measurements(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_growth_assessments_reference_version
    FOREIGN KEY (reference_version_id) REFERENCES reference_versions(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_growth_assessments_reviewed_by
    FOREIGN KEY (reviewed_by) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS follow_ups (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  child_id INT UNSIGNED NOT NULL,
  assessment_id INT UNSIGNED NULL,
  type ENUM('clinical_review', 'remeasurement', 'operational_measurement') NOT NULL,
  description VARCHAR(500) NOT NULL,
  assigned_to INT UNSIGNED NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  due_date DATE NOT NULL,
  status ENUM('open', 'in_progress', 'closed') NOT NULL DEFAULT 'open',
  closed_by INT UNSIGNED NULL,
  closed_at DATETIME NULL,
  closure_note VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_follow_ups_child (child_id, status),
  KEY idx_follow_ups_assigned (assigned_to, status, due_date),
  KEY idx_follow_ups_assessment (assessment_id),
  KEY idx_follow_ups_created_by (created_by),
  KEY idx_follow_ups_closed_by (closed_by),
  CONSTRAINT fk_follow_ups_child
    FOREIGN KEY (child_id) REFERENCES children(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_follow_ups_assessment
    FOREIGN KEY (assessment_id) REFERENCES growth_assessments(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_follow_ups_assigned_to
    FOREIGN KEY (assigned_to) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_follow_ups_created_by
    FOREIGN KEY (created_by) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_follow_ups_closed_by
    FOREIGN KEY (closed_by) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS follow_up_updates (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  follow_up_id INT UNSIGNED NOT NULL,
  actor_id INT UNSIGNED NOT NULL,
  activity_at DATETIME NOT NULL,
  note VARCHAR(500) NOT NULL,
  result ENUM('contacted', 'visited', 'unreachable', 'referred', 'remeasured', 'system_revision_notice') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_follow_up_updates_follow_up (follow_up_id, created_at),
  KEY idx_follow_up_updates_actor (actor_id),
  CONSTRAINT fk_follow_up_updates_follow_up
    FOREIGN KEY (follow_up_id) REFERENCES follow_ups(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_follow_up_updates_actor
    FOREIGN KEY (actor_id) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  actor_id INT UNSIGNED NULL,
  organization_id INT UNSIGNED NULL,
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id INT UNSIGNED NULL,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  request_id VARCHAR(64) NULL,
  change_summary VARCHAR(500) NOT NULL,
  KEY idx_audit_logs_org_occurred (organization_id, occurred_at),
  KEY idx_audit_logs_actor_occurred (actor_id, occurred_at),
  KEY idx_audit_logs_action (action, occurred_at),
  CONSTRAINT fk_audit_logs_actor
    FOREIGN KEY (actor_id) REFERENCES users(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT fk_audit_logs_organization
    FOREIGN KEY (organization_id) REFERENCES organizations(id)
    ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
