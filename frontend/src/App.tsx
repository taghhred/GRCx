import AppRouter from "./router/AppRouter";
import { AiAdvisorProvider } from "./components/ai/AiAdvisorContext";
import AiAdvisorFloating from "./components/ai/AiAdvisorFloating";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";

function AuthenticatedShell() {
  const { isAuthenticated, status } = useAuth();
  const showAi = status === "authenticated" && isAuthenticated;

  return (
    <AiAdvisorProvider>
      <AppRouter />
      {showAi ? <AiAdvisorFloating /> : null}
    </AiAdvisorProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AuthenticatedShell />
    </AuthProvider>
  );
}

export default App;
