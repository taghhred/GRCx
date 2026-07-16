import { Navigate } from "react-router-dom";

/** Compatibility: leave full-page AI route; floating assistant opens via location state. */
export default function AiAdvisorRedirect() {
  return (
    <Navigate
      to="/dashboard"
      replace
      state={{ openAiAdvisor: true }}
    />
  );
}
