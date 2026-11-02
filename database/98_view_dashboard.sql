-- Run after all tables. Aggregates only; no patient identifiers.
CREATE VIEW vw_district_dashboard_summary AS
SELECT f.district_id,
       date_trunc('month', s.screening_date)::date                AS month_start,
       COUNT(DISTINCT s.id)                                       AS screenings_total,
       COUNT(DISTINCT s.id) FILTER (WHERE s.case_state NOT IN ('DRAFT','CONSENTED')) AS screened,
       COUNT(DISTINCT r.id)                                       AS referrals_total
FROM tbl_screenings s
JOIN mst_facilities f            ON f.id = s.facility_id
LEFT JOIN tbl_clinical_reviews c ON c.screening_id = s.id
LEFT JOIN tbl_referrals r        ON r.review_id = c.id
GROUP BY f.district_id, date_trunc('month', s.screening_date);
