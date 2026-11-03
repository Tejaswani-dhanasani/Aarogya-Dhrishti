import "dotenv/config";
import fs from "node:fs";
import csv from "csv-parser";
import pool from "./db.js";

async function importLocations() {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const rows = [];

    await new Promise((resolve, reject) => {
      fs.createReadStream(new URL("./ap_locations.csv", import.meta.url))
        .pipe(csv())
        .on("data", (row) => rows.push(row))
        .on("end", resolve)
        .on("error", reject);
    });

    console.log("CSV rows:", rows.length);

    for (const row of rows) {
      const districtName = row["District"]?.trim();
      const districtCode = row["District Code"]?.trim();
      const mandalName = row["Mandal"]?.trim();
      const mandalCode = row["Mandal Code"]?.trim();

      if (!districtName || !districtCode || !mandalName || !mandalCode) {
        continue;
      }

      // Insert or find District
      const districtResult = await client.query(
        `INSERT INTO mst_districts
          (code, name_en, state_name, is_active)
         VALUES ($1, $2, 'Andhra Pradesh', TRUE)
         ON CONFLICT (code)
         DO UPDATE SET name_en = EXCLUDED.name_en
         RETURNING id`,
        [districtCode, districtName]
      );

      const districtId = districtResult.rows[0].id;

      // Insert or find Mandal
const mandalResult = await client.query(
  `INSERT INTO mst_mandals
    (district_id, code, name_en, is_active)
   VALUES ($1, $2, $3, TRUE)
   ON CONFLICT (code)
   DO UPDATE SET
     district_id = EXCLUDED.district_id,
     name_en = EXCLUDED.name_en
   RETURNING id`,
  [districtId, mandalCode, mandalName]
);

const mandalId = mandalResult.rows[0].id;

// INSERT VILLAGE HERE
const villageName = row["Village"]?.trim();
const villageNative = row["Village (Native)"]?.trim();
const villageCode = row["Village Code"]?.trim();

if (villageName && villageCode) {
  await client.query(
    `INSERT INTO mst_villages
      (mandal_id, gram_panchayat_id, code, name_en, name_te, is_active)
     VALUES ($1, NULL, $2, $3, $4, TRUE)
     ON CONFLICT (code)
     DO UPDATE SET
       mandal_id = EXCLUDED.mandal_id,
       name_en = EXCLUDED.name_en,
       name_te = EXCLUDED.name_te`,
    [
      mandalId,
      villageCode,
      villageName,
      villageNative || null
    ]
  );
}
    }

    await client.query("COMMIT");

    console.log("Districts and Mandals imported successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Import failed:", error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

importLocations();