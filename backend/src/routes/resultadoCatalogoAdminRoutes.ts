import { Router } from "express";
import { getResultadoCatalogadoByProdutos } from "../controllers/resultadoCatalogoAdminControler";

const adminResultadoCatalogadoRoutes = Router();

adminResultadoCatalogadoRoutes.get(
  "/resultado-catalogado",
  getResultadoCatalogadoByProdutos
);

export default adminResultadoCatalogadoRoutes;
