import { Router } from "express";
import { getResultadoCatalogadoByProdutos } from "../../controllers/Admin/Resultado_Catalogado_Admin";

const adminResultadoCatalogadoRoutes = Router();

adminResultadoCatalogadoRoutes.get(
  "/resultado-catalogado",
  getResultadoCatalogadoByProdutos
);

export default adminResultadoCatalogadoRoutes;
