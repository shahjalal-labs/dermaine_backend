import express from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoute } from "../modules/auth/auth.routes";
import { supportRoutes } from "../modules/support/support.route";
import { adminRoute } from "../modules/admin/admin.route";
import { programRoutes } from "../modules/program/program.route";
import { organizationRoute } from "../modules/organization/organization.route";
import { streamRoutes } from "../modules/stream/stream.route";
import { ruleRoutes } from "../modules/mandatoryRules/mandatoryRule.route";
import { submissionEngineRoute } from "../modules/matchEngine/submissionEngine/submissionEngine.route";
import { availabilityRoutes } from "../modules/availability/availability.route";
import { consultationRoute } from "../modules/consultation/consultation.route";
import { dashboardRoutes } from "../modules/dashboard/dashboard.route";
import { scoringFactorRoutes } from "../modules/scoringFactor/scoringFactor.route";
import { occupationSynonymRoutes } from "../modules/occupation/occupationSynonym.route";

const router = express.Router();

const moduleRoutes = [
  { path: "/users", route: userRoutes },
  { path: "/auth", route: authRoute },
  { path: "/support", route: supportRoutes },
  { path: "/contact", route: supportRoutes },
  { path: "/admin", route: adminRoute },
  { path: "/admins", route: adminRoute },
  { path: "/assessment", route: adminRoute },
  { path: "/assessments", route: adminRoute },
  { path: "/dashboard", route: dashboardRoutes },
  { path: "/organization", route: organizationRoute },
  { path: "/program", route: programRoutes },
  { path: "/programs", route: programRoutes },
  { path: "/streams", route: streamRoutes },
  { path: "/availability", route: availabilityRoutes },
  { path: "/mandatory-rules", route: ruleRoutes },
  { path: "/scoring-factors", route: scoringFactorRoutes },
  { path: "/submit-assessment", route: submissionEngineRoute },
  { path: "/consultation", route: consultationRoute },
  { path: "/payments", route: consultationRoute },
  { path: "/occupation-synonyms", route: occupationSynonymRoutes },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
