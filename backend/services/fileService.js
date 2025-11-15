import { GetObjectCommand } from "@aws-sdk/client-s3";
import csvParser from "csv-parser";
import config from "../config/index.js";
import { s3Client as mainS3Client } from "../config/s3.js";

/**
 * Reads a small portion of a CSV file stored in S3 for quick preview or analysis.
 * Returns the first N rows and extracted column headers.
 */
async function getFileSample(s3Key, maxRows = 1000) {
  try {
    const command = new GetObjectCommand({
      Bucket: config.s3.bucketName,
      Key: s3Key,
    });

    const { Body } = await mainS3Client.send(command);
    const rows = [];
    const parser = Body.pipe(csvParser());

    for await (const row of parser) {
      rows.push(row);
      if (rows.length >= maxRows) {
        break;
      }
    }

    const headers = rows.length ? Object.keys(rows[0]) : [];
    return { headers, data: rows };
  } catch (error) {
    console.error("Error fetching file sample:", error);
    throw new Error("Failed to fetch file sample");
  }
}

export default { getFileSample };