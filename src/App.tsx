import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameProvider } from "@/context/GameContext";
import { UserProvider } from "@/context/UserContext";
import Landing from "./pages/Landing";
import Upload from "./pages/Upload";
import Analysis from "./pages/Analysis";
import LevelSelect from "./pages/LevelSelect";
import Game from "./pages/Game";
import Summary from "./pages/Summary";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <UserProvider>
        <GameProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/upload" element={<Upload />} />
              <Route path="/analysis" element={<Analysis />} />
              <Route path="/levels" element={<LevelSelect />} />
              <Route path="/game" element={<Game />} />
              <Route path="/summary" element={<Summary />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </GameProvider>
      </UserProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
