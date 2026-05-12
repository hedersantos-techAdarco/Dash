import express from "express";
import path from "path";

const app = express();

// Middleware para JSON
app.use(express.json({ limit: '10mb' }));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Adarco API is running on Vercel" });
});

app.post("/api/analyze-calls", async (req, res) => {
  try {
    const { calls } = req.body;
    res.json({ 
      insights: "Análise via Vercel Serverless. Implemente a lógica do Gemini aqui.",
      summary: `Recebidas ${calls?.length || 0} chamadas para análise.`
    });
  } catch (error) {
    res.status(500).json({ error: "Falha na análise" });
  }
});

// Nota: No Vercel, não precisamos servir arquivos estáticos manualmente aqui
// se configurarmos o vercel.json corretamente para fallback.
// No entanto, se quisermos que esta função trate tudo:
// mas é melhor deixar o Vercel Edge servir o /dist.

export default app;
