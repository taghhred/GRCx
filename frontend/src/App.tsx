import AppRouter from "./router/AppRouter";
import { AiAdvisorProvider } from "./components/ai/AiAdvisorContext";
import AiAdvisorFloating from "./components/ai/AiAdvisorFloating";
import { AuthProvider } from "./auth/AuthContext";

function AppShell() {
  return (
    <AiAdvisorProvider>
      <AppRouter />
      <AiAdvisorFloating />
    </AiAdvisorProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}

export default App;
