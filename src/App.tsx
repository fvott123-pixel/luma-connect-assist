import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";
import Index from "./pages/Index";
import Chat from "./pages/Chat";
import ServicePage from "./pages/ServicePage";
import PrepareForm from "./pages/PrepareForm";
import Volunteer from "./pages/Volunteer";
import About from "./pages/About";
import FillForm from "./pages/FillForm";
import NotFound from "./pages/NotFound";
import Base64Util from "./pages/Base64Util";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/service/:slug" element={<ServicePage />} />
            <Route path="/prepare-form" element={<PrepareForm />} />
            <Route path="/fill-form/:slug" element={<FillForm />} />
            <Route path="/volunteer" element={<Volunteer />} />
            <Route path="/about" element={<About />} />
            <Route path="/disability-support" element={<Navigate to="/service/disability-support" replace />} />
            <Route path="/medicare" element={<Navigate to="/service/medicare" replace />} />
            <Route path="/ndis-access" element={<Navigate to="/service/ndis-access" replace />} />
            <Route path="/aged-care" element={<Navigate to="/service/aged-care" replace />} />
            <Route path="/carer-payment" element={<Navigate to="/service/carer-payment" replace />} />
            <Route path="/age-pension" element={<Navigate to="/service/age-pension" replace />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
