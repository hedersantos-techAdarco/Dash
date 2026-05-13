import express from "express";
import { supabaseAdmin } from "../src/services/supabaseAdmin.ts";
import { processRawCall } from "../src/lib/callProcessor.ts";

const app = express();
app.use(express.json({ limit: '10mb' }));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Adarco API is running (Supabase Mode)" });
});

app.get("/api/calls", async (req, res) => {
  try {
    const { startDate, endDate, team, consultant } = req.query;
    
    let query = supabaseAdmin
      .from('calls')
      .select('*')
      .order('timestamp', { ascending: false });

    if (startDate) query = query.gte('timestamp', startDate as string);
    if (endDate) query = query.lte('timestamp', endDate as string);
    if (team && team !== 'Todos') query = query.eq('team', team as string);
    if (consultant && consultant !== 'Todos') query = query.eq('consultant_name', consultant as string);

    const { data, error } = await query;

    if (error) throw error;
    
    // Map to frontend expected format
    const mapped = data.map(c => ({
      id: c.id,
      timestamp: c.timestamp,
      duration: c.duration,
      consultantName: c.consultant_name,
      team: c.team,
      extension: c.extension,
      type: c.type,
      status: c.status
    }));

    res.json(mapped);
  } catch (error: any) {
    console.error("Error fetching calls:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/sync", async (req, res) => {
  const TELEPHONY_URL = process.env.TELEPHONY_API_URL;
  const TELEPHONY_TOKEN = process.env.TELEPHONY_API_TOKEN;

  if (!TELEPHONY_URL || !TELEPHONY_TOKEN) {
    return res.status(500).json({ error: "Telephony API configuration missing" });
  }

  try {
    const { startDate, endDate } = req.body;
    
    // In a real scenario, we might loop through pages.
    // For now, let's fetch a significant chunk or specified range.
    const params = new URLSearchParams({
      token: TELEPHONY_TOKEN,
      limit: '100' // Adjust as needed
    });
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    const response = await fetch(`${TELEPHONY_URL}?${params.toString()}`);
    if (!response.ok) throw new Error(`Telephony API error: ${response.status}`);

    const rawData = await response.json();
    const rawCalls = Array.isArray(rawData) ? rawData : (rawData.data || rawData.calls || []);

    const processed = rawCalls
      .map(processRawCall)
      .filter(Boolean);

    if (processed.length === 0) {
      return res.json({ message: "No calls to sync", count: 0 });
    }

    // Upsert into Supabase
    const { error } = await supabaseAdmin
      .from('calls')
      .upsert(processed.map(c => ({
        id: c.id,
        timestamp: c.timestamp,
        duration: c.duration,
        consultant_name: c.consultantName,
        team: c.team,
        extension: c.extension,
        type: c.type,
        status: c.status
      })), { onConflict: 'id' });

    if (error) throw error;

    res.json({ message: "Sync successful", count: processed.length });
  } catch (error: any) {
    console.error("Sync error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/calls", async (req, res) => {
  try {
    const { calls } = req.body;
    if (!Array.isArray(calls)) {
      return res.status(400).json({ error: "Invalid payload: 'calls' must be an array" });
    }

    const { error } = await supabaseAdmin
      .from('calls')
      .upsert(calls.map(c => ({
        id: c.id || `${c.timestamp}-${c.extension}-${c.duration}`,
        timestamp: c.timestamp,
        duration: c.duration,
        consultant_name: c.consultantName,
        team: c.team,
        extension: c.extension,
        type: c.type,
        status: c.status
      })), { onConflict: 'id' });

    if (error) throw error;
    res.json({ message: "Batch save successful", count: calls.length });
  } catch (error: any) {
    console.error("Batch save error:", error);
    res.status(500).json({ error: error.message });
  }
});

export default app;
