import { BrowserRouter, Routes, Route } from "react-router";
import RequireAuth from "../components/RequireAuth";
import RequireProfile from "../components/RequireProfile";
import Layout from "../components/Layout";
import Home from "../pages/Home";
import Clienti from "../pages/Clienti";
import ClienteDettaglio from "../pages/ClienteDettaglio";
import Storico from "../pages/Storico";
import Cestino from "../pages/Cestino";
import NuovoHub from "../pages/NuovoHub";
import Nuovo from "../pages/Nuovo";
import RegistraVoce from "../pages/RegistraVoce";
import Impostazioni from "../pages/Impostazioni";
import ListinoServizi from "../pages/ListinoServizi";
import Fiscale from "../pages/Fiscale";
import MetodiPagamento from "../pages/MetodiPagamento";
import MessaggiClientePage from "../pages/MessaggiCliente";
import Login from "../pages/Login";
import Profilo from "../pages/Profilo";
import AppSettings from "../pages/AppSettings";
import Onboarding from "../pages/Onboarding";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RequireAuth />}>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route element={<RequireProfile />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/clienti" element={<Clienti />} />
              <Route path="/clienti/:id" element={<ClienteDettaglio />} />
              <Route path="/storico" element={<Storico />} />
              <Route path="/cestino" element={<Cestino />} />
              <Route path="/nuovo" element={<NuovoHub />} />
              <Route path="/nuovo/registra" element={<RegistraVoce />} />
              <Route path="/nuovo/chat/anteprima" element={<Nuovo mode="chat" />} />
              <Route path="/nuovo/chat" element={<Nuovo mode="chat" />} />
              <Route path="/nuovo/manuale/anteprima" element={<Nuovo mode="manuale" />} />
              <Route path="/nuovo/manuale" element={<Nuovo mode="manuale" />} />
              <Route path="/impostazioni" element={<Impostazioni />} />
              <Route path="/impostazioni/servizi" element={<ListinoServizi />} />
              <Route path="/impostazioni/fiscale" element={<Fiscale />} />
              <Route path="/impostazioni/pagamenti" element={<MetodiPagamento />} />
              <Route path="/impostazioni/messaggi" element={<MessaggiClientePage />} />
              <Route path="/profilo" element={<Profilo />} />
              <Route path="/app" element={<AppSettings />} />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
