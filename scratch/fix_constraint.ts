import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

async function run() {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL
    });

    try {
        console.log("Dropping old check constraint...");
        await pool.query(`ALTER TABLE creator_subscriptions DROP CONSTRAINT IF EXISTS creator_subscriptions_status_check;`);
        
        console.log("Adding new check constraint to allow 'pending'...");
        await pool.query(`ALTER TABLE creator_subscriptions ADD CONSTRAINT creator_subscriptions_status_check CHECK (status IN ('active', 'past_due', 'canceled', 'pending'));`);
        
        console.log("Success! Constraints updated.");
    } catch (e) {
        console.error("Error updating constraints:", e);
    } finally {
        await pool.end();
    }
}

run();
