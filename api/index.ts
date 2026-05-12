import express from "express";
import path from "path";

const app = express();

// Middleware para JSON
app.use(express.json({ limit: '10mb' }));

// API Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Adarco API is running on Vercel" });
});

app.get("/api/telephony/calls", async (req, res) => {
  try {
    const apiKey = process.env.BEMMELHOR_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Configuração ausente: BEMMELHOR_API_KEY não definida." });
    }

    const { page = 1, limit = 100, startDate, endDate } = req.query;
    
    // Construir URL com parâmetros
    const url = new URL("https://service.bemmelhor.com.br/api/integrations/v1/calls");
    url.searchParams.append("page", String(page));
    url.searchParams.append("limit", String(limit));
    
    // Se as datas vierem com T (ISO completa), tentamos extrair só a data YYYY-MM-DD 
    // para ver se a API aceita melhor, pois às vezes o formato ISO com time causa problemas
    if (startDate) {
      const sDate = String(startDate).split('T')[0];
      url.searchParams.append("startDate", sDate);
    }
    if (endDate) {
      const eDate = String(endDate).split('T')[0];
      url.searchParams.append("endDate", eDate);
    }

    console.log(`[Proxy] Requesting Bem Melhor API: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        "x-api-key": apiKey,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorDetail;
      try {
        errorDetail = JSON.parse(errorText);
      } catch {
        errorDetail = errorText;
      }
      
      console.error(`[Proxy] API Error ${response.status}:`, errorDetail);
      return res.status(response.status).json({ 
        error: "A API da Bem Melhor retornou um erro.", 
        status: response.status,
        detail: errorDetail 
      });
    }

    const data = await response.json();
    console.log(`[Proxy] API Success. Received ${Array.isArray(data) ? data.length : (data.data?.length || 0)} calls.`);
    res.json(data);
  } catch (error) {
    console.error("[Proxy] Erro interno:", error);
    res.status(500).json({ error: "Erro interno no servidor de proxy" });
  }
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
