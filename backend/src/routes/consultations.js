
import { Router } from "express";
import { randomUUID } from "crypto";
import { pool } from "../db.js";
import {
  authRequired,
  requireRole
} from "../middleware/auth.js";

const router = Router();

// Specialist schedules a consultation
router.post(
  "/",
  authRequired,
  requireRole("SPECIALIST"),
  async (req, res) => {
    try {
      const {
        patientId,
        scheduledAt,
        reason
      } = req.body;

      if (!patientId || !scheduledAt) {
        return res.status(400).json({
          message: "Patient and appointment date/time are required."
        });
      }

      const appointmentDate = new Date(scheduledAt);

      if (Number.isNaN(appointmentDate.getTime())) {
        return res.status(400).json({
          message: "Invalid appointment date/time."
        });
      }

      if (appointmentDate <= new Date()) {
        return res.status(400).json({
          message: "Please select a future appointment time."
        });
      }

      // Random room name makes the meeting URL difficult to guess.
      const roomName = `aarogya-${randomUUID()}`;

      const specialistId = req.user?.id
        ? String(req.user.id)
        : null;

      const result = await pool.query(
        `INSERT INTO tbl_video_consultations
        (patient_id, specialist_id, scheduled_at, reason, room_name)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *`,
        [
          String(patientId),
          specialistId,
          appointmentDate,
          reason || null,
          roomName
        ]
      );

      const appointment = result.rows[0];

      res.status(201).json({
        message: "Consultation scheduled successfully.",
        appointment,
        patientJoinUrl: `/patient-consultation/${roomName}`
      });

    } catch (error) {
      console.error("Schedule consultation error:", error);

      res.status(500).json({
        message: "Unable to schedule consultation."
      });
    }
  }
);

// Specialist views scheduled consultations
router.get(
  "/",
  authRequired,
  requireRole("SPECIALIST"),
  async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT *
         FROM tbl_video_consultations
         ORDER BY scheduled_at DESC`
      );

      res.json(result.rows);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Unable to fetch consultations."
      });
    }
  }
);

// Specialist saves consultation notes and status
router.patch(
  "/:id",
  authRequired,
  requireRole("SPECIALIST"),
  async (req, res) => {
    try {
      const { status, specialistNotes } = req.body;

      const allowedStatuses = [
        "SCHEDULED",
        "COMPLETED",
        "CANCELLED"
      ];

      if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid consultation status."
        });
      }

      const result = await pool.query(
        `UPDATE tbl_video_consultations
         SET status = COALESCE($1, status),
             specialist_notes = COALESCE($2, specialist_notes)
         WHERE id = $3
         RETURNING *`,
        [
          status || null,
          specialistNotes ?? null,
          req.params.id
        ]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          message: "Consultation not found."
        });
      }

      res.json({
        message: "Consultation updated successfully.",
        appointment: result.rows[0]
      });

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message: "Unable to update consultation."
      });
    }
  }
);

export default router;
