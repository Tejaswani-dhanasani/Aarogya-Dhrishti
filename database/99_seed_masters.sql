-- AAROGYA DRISHTI - master seed data (synthetic demo). Run after 01_schema.sql.
-- name_te is left NULL where a verified Telugu translation is not yet supplied:
-- fill it from your translation dictionary and have a Telugu speaker check it.
BEGIN;

INSERT INTO mst_languages (code, name_en, native_name) VALUES
 ('en','English','English'),
 ('te','Telugu','తెలుగు');

INSERT INTO mst_roles (code, name_en, description) VALUES
 ('HEALTH_WORKER','Health worker','Registers patients, screening intake, image capture, assigned follow-up'),
 ('MEDICAL_OFFICER','Medical Officer','Reviews findings independently of AI, signs review, decides referral'),
 ('SPECIALIST','Specialist','Sees referred cases, consultations, simulated investigation reports'),
 ('NAVIGATOR','Navigator','Appointments, contacts, transport, missed-visit workflow'),
 ('DISTRICT_ADMIN','District admin','Aggregated trends only; no default access to identifiable records');

INSERT INTO mst_permissions (code, resource, action, description) VALUES
 ('patient.register','patient','create','Register synthetic patient'),
 ('patient.read_assigned','patient','read','Read patients within own facility / assigned or referred cases'),
 ('consent.record','consent','create','Record purpose-specific consent'),
 ('screening.create','screening','create','Create screening and history'),
 ('image.upload','image','create','Upload oral photo for assigned screening'),
 ('image.view','image','read','View image via short-lived signed access (audited)'),
 ('ai.analyze','ai','create','Queue non-clinical AI analysis'),
 ('review.create','review','create','Save clinician observations'),
 ('review.sign','review','sign','Sign clinical review'),
 ('referral.create','referral','create','Create specialist referral'),
 ('appointment.book','appointment','create','Book or request appointment'),
 ('appointment.view','appointment','read','View appointments'),
 ('video.join','video','join','Join authorised video consultation'),
 ('investigation.record','investigation','create','Record biopsy/pathology simulation'),
 ('pathology.review','pathology','review','Enter diagnosis on a pathology report'),
 ('navigation.update','navigation','update','Track contact and attendance'),
 ('dashboard.view_aggregate','dashboard','read','View aggregate reporting'),
 ('user.manage','user','manage','Manage users and assignments'),
 ('audit.view','audit','read','View audit trail');

INSERT INTO tbl_role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM (VALUES
 ('HEALTH_WORKER','patient.register'),('HEALTH_WORKER','patient.read_assigned'),
 ('HEALTH_WORKER','consent.record'),('HEALTH_WORKER','screening.create'),
 ('HEALTH_WORKER','image.upload'),('HEALTH_WORKER','image.view'),('HEALTH_WORKER','ai.analyze'),
 ('MEDICAL_OFFICER','patient.read_assigned'),('MEDICAL_OFFICER','image.view'),
 ('MEDICAL_OFFICER','review.create'),('MEDICAL_OFFICER','review.sign'),
 ('MEDICAL_OFFICER','referral.create'),('MEDICAL_OFFICER','appointment.book'),
 ('MEDICAL_OFFICER','video.join'),('MEDICAL_OFFICER','investigation.record'),
 ('SPECIALIST','patient.read_assigned'),('SPECIALIST','image.view'),
 ('SPECIALIST','appointment.view'),('SPECIALIST','video.join'),
 ('SPECIALIST','investigation.record'),('SPECIALIST','pathology.review'),
 ('NAVIGATOR','patient.read_assigned'),('NAVIGATOR','appointment.book'),
 ('NAVIGATOR','appointment.view'),('NAVIGATOR','navigation.update'),
 ('DISTRICT_ADMIN','dashboard.view_aggregate'),('DISTRICT_ADMIN','user.manage'),
 ('DISTRICT_ADMIN','audit.view')
) AS m(role_code, perm_code)
JOIN mst_roles r ON r.code = m.role_code
JOIN mst_permissions p ON p.code = m.perm_code;

INSERT INTO mst_appointment_statuses (code, name_en, is_terminal, sort_order) VALUES
 ('REQUESTED','Requested',FALSE,1),('CONFIRMED','Confirmed',FALSE,2),
 ('RESCHEDULED','Rescheduled',FALSE,3),('COMPLETED','Completed',TRUE,4),
 ('MISSED','Missed',TRUE,5),('CANCELLED','Cancelled',TRUE,6);

INSERT INTO mst_investigation_statuses (code, name_en, is_terminal, sort_order) VALUES
 ('ORDERED','Ordered',FALSE,1),('SAMPLE_COLLECTED','Sample collected',FALSE,2),
 ('REPORT_UPLOADED','Report uploaded',FALSE,3),('REVIEWED','Reviewed by clinician',TRUE,4),
 ('CANCELLED','Cancelled',TRUE,5);

INSERT INTO mst_followup_statuses (code, name_en, is_terminal, sort_order) VALUES
 ('OPEN','Open',FALSE,1),('IN_PROGRESS','In progress',FALSE,2),
 ('ESCALATED','Escalated',FALSE,3),('CLOSED','Closed',TRUE,4);

INSERT INTO mst_referral_priorities (code, name_en, priority_rank, target_days) VALUES   -- target_days: set by clinical protocol
 ('URGENT','Urgent',1,NULL),('SOON','Soon',2,NULL),('ROUTINE','Routine',3,NULL);

INSERT INTO mst_consent_purposes (code, name_en, text_en, is_required) VALUES
 ('SCREENING','Oral screening','I agree to a demonstration oral screening using synthetic data.',TRUE),
 ('IMAGE_CAPTURE','Photograph capture','I agree to oral photographs being taken for this demonstration.',TRUE),
 ('AI_RESEARCH','Research AI demo','I understand the AI output is a research demo, not a diagnosis.',FALSE),
 ('TELECONSULT','Video consultation','I agree to a video consultation with a specialist (not recorded).',FALSE);

INSERT INTO mst_exposure_types (code, name_en, category) VALUES
 ('SMOKED_TOBACCO','Smoked tobacco','TOBACCO'),('SMOKELESS_TOBACCO','Smokeless tobacco','TOBACCO'),
 ('ARECA_NUT','Areca nut / betel quid','ARECA'),('ALCOHOL','Alcohol','ALCOHOL');

INSERT INTO mst_symptoms (code, name_en) VALUES
 ('MOUTH_ULCER','Non-healing mouth ulcer'),('WHITE_PATCH','White patch'),
 ('RED_PATCH','Red patch'),('PAIN','Pain in mouth'),
 ('DIFFICULTY_SWALLOWING','Difficulty swallowing'),('LIMITED_MOUTH_OPENING','Limited mouth opening'),
 ('NECK_SWELLING','Neck swelling');

INSERT INTO mst_investigation_types (code, name_en) VALUES
 ('BIOPSY','Biopsy'),('PATHOLOGY','Pathology report'),('IMAGING','Imaging');

INSERT INTO mst_specialties (code, name_en) VALUES
 ('ORAL_MEDICINE','Oral medicine'),('ORAL_SURGERY','Oral & maxillofacial surgery'),
 ('ENT','ENT'),('ONCOLOGY','Oncology'),('PATHOLOGY','Pathology');

INSERT INTO mst_ai_models (provider, model_version, description, is_research_only, clinical_use) VALUES
 ('mock','mock-v1','Mock adapter returning fixed example labels. NOT FOR CLINICAL USE',TRUE,FALSE);

-- Geography (demo subset)
INSERT INTO mst_districts (code, name_en) VALUES ('ASR','Alluri Sitharama Raju');
INSERT INTO mst_mandals (district_id, code, name_en)
SELECT d.id, m.code, m.name FROM mst_districts d,
 (VALUES ('PADERU','Paderu'),('G_MADUGULA','G. Madugula'),('HUKUMPETA','Hukumpeta')) AS m(code,name)
WHERE d.code = 'ASR';

COMMIT;
