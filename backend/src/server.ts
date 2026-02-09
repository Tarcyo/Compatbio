import app from "./server/Bootstrap/app";

const PORT = Number(process.env.PORT || 3000);

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`🌐 Frontend origin: ${(process.env.FRONTEND_ORIGIN || "http://localhost:5173")}`);
});
