// test-db.js
import mysql from "mysql2/promise";

async function testConnection() {
  try {
    const connection = await mysql.createConnection({
      host: "localhost",
      port: 3306,
      user: "muck",
      password: "muckpassword",
      database: "muck",
    });

    console.log("✅ Docker MySQL connected successfully");
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    process.exit(1);
  }
}

testConnection();
