import React, { useState, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  Lock,
  Users,
  Gift,
  Download,
  LogOut,
  Settings,
  RefreshCw,
  Menu,
  X,
  ChevronRight,
  ShieldCheck,
  Crown,
} from 'lucide-react';
import type { Patron, CurrentUser } from '../lib/types';
import { getAccord } from '../lib/accord';
import { useVoice } from '../lib/VoiceContext';

interface HeaderNavProps {
  patron: Patron;
  currentUser: CurrentUser;
  isOnline: boolean;
  onOpenLockScreen: () => void;
  onOpenSettings: () => void;
  onLogout: () => void;
  onNavigate: (tab: 'home' | 'vendre' | 'mon-argent' | 'stock' | 'ajouter' | 'employes' | 'ambassadrice' | 'mes-ventes' | 'historique' | 'mon-abonnement') => void;
  activeTab: string;
  onRefreshData?: () => Promise<void> | void;
  onOpenMonAbonnementModal?: () => void;
}

export const HeaderNav: React.FC<HeaderNavProps> = ({
  patron,
  currentUser,
  isOnline,
  onOpenLockScreen,
  onOpenSettings,
  onLogout,
  onNavigate,
  activeTab,
  onRefreshData,
  onOpenMonAbonnementModal,
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { isVoiceOn, toggleVoice, speak } = useVoice();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Fermer le menu mobile lors d'un appui sur Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fermer le menu si la fenêtre est agrandie >= 768px
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
  };

  // REFRESH RAPIDE ULTRA-PERFORMANT : 2 secondes max, guard anti-boucle, ne bloque pas l'UI
  const handleRefreshApp = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);

    try {
      if (onRefreshData) {
        await onRefreshData();
      } else {
        await new Promise((r) => setTimeout(r, 400));
      }
    } catch (e) {
      console.warn('[Refresh] Erreur actualisation:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const isPatron = currentUser.role === 'patron';
  const accord = getAccord(currentUser.genre);

  // Bienvenue vendeur / vendeuse automatique selon le genre
  const welcomePrefix = currentUser.role === 'patron'
    ? (currentUser.genre === 'femme' ? 'Bienvenue patronne' : 'Bienvenu patron')
    : (currentUser.genre === 'femme' ? 'Bienvenue vendeuse' : 'Bienvenu vendeur');

  return (
    <>
      <header className="header-mobile-container sticky top-0 z-40 bg-white border-b-2 border-gray-200 shadow-sm px-3 sm:px-4 py-2.5 sm:py-3 select-none w-full">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-1.5 sm:gap-2">
          {/* Salutation & Boutique avec accord de genre */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <button
              type="button"
              onClick={onOpenLockScreen}
              className="relative focus:outline-none group shrink-0"
              title="Changer d'utilisateur (QUI VEND ?)"
              aria-label="Changer d'utilisateur"
            >
              {currentUser.photo_url ? (
                <img
                  src={currentUser.photo_url}
                  alt={currentUser.nom}
                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover border-2 border-[#6C5CE7] shadow-md group-hover:scale-105 transition"
                />
              ) : (
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-[#6C5CE7] text-white flex items-center justify-center font-black text-lg sm:text-xl shadow-md border-2 border-[#6C5CE7] group-hover:scale-105 transition">
                  {currentUser.nom.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-gray-900 text-white p-1 rounded-full text-[9px] sm:text-[10px]">
                <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
            </button>

            <div
              className="cursor-pointer min-w-0 flex-1"
              onClick={() => onNavigate('home')}
            >
              <h1 className="header-title-mobile text-sm sm:text-base md:text-lg font-black text-gray-900 leading-tight truncate">
                {welcomePrefix} {currentUser.prenom || currentUser.nom} !
              </h1>
              <p className="text-[11px] sm:text-xs md:text-sm font-extrabold text-[#6C5CE7] truncate">
                {patron.nom_boutique || 'Ma Boutique'} • {accord.connecte}
              </p>
            </div>
          </div>

          {/* VUE DESKTOP & TABLETTE (>= 768px / md:) : Tous les boutons en ligne */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            {/* Badge Connecté / Hors ligne */}
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-black tracking-wide border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-red-50 text-red-700 border-red-300'
              }`}
            >
              {isOnline ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                  <Wifi className="w-3.5 h-3.5" />
                  <span>Connecté</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-600" />
                  <span>Hors ligne</span>
                </>
              )}
            </div>

            {/* Raccourci Ambassadrice (Patron seulement) */}
            {isPatron && (
              <button
                type="button"
                onClick={() => onNavigate('ambassadrice')}
                className={`p-2 rounded-xl border-2 transition flex items-center gap-1 text-xs font-black cursor-pointer ${
                  activeTab === 'ambassadrice'
                    ? 'bg-amber-100 border-amber-500 text-amber-900'
                    : 'bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100'
                }`}
                title="Page Ambassadrice"
              >
                <Gift className="w-4 h-4 text-amber-600" />
                <span>Ambassadrice</span>
              </button>
            )}

            {/* Bouton Mon Abonnement (Patron seulement) */}
            {isPatron && (
              <button
                type="button"
                onClick={onOpenMonAbonnementModal}
                className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-slate-950 font-black text-xs flex items-center gap-1.5 border border-amber-500 shadow-sm transition active:scale-95 cursor-pointer"
                title="Mon Abonnement / Forfait Actif"
              >
                <Crown className="w-4 h-4 text-slate-950 fill-amber-300" />
                <span>Mon Abonnement</span>
              </button>
            )}

            {/* Toggle Voix EFA ON / OFF */}
            <button
              type="button"
              onClick={() => {
                const next = !isVoiceOn;
                toggleVoice();
                if (next) {
                  setTimeout(() => speak("Voix activée"), 100);
                }
              }}
              className={`p-2 rounded-xl transition flex items-center gap-1.5 text-xs font-black cursor-pointer ${
                isVoiceOn
                  ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300 shadow-sm'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-500 border border-gray-200'
              }`}
              title={isVoiceOn ? 'Voix EFA activée (cliquer pour couper)' : 'Voix EFA coupée (cliquer pour activer)'}
              aria-label={isVoiceOn ? 'Couper la voix' : 'Activer la voix'}
            >
              <span className="text-sm">{isVoiceOn ? '🔊' : '🔇'}</span>
              <span>{isVoiceOn ? 'Voix ON' : 'Voix OFF'}</span>
            </button>

            {/* Actualiser les données en 2s max */}
            <button
              type="button"
              onClick={handleRefreshApp}
              disabled={isRefreshing}
              className={`p-2 rounded-xl transition cursor-pointer ${
                isRefreshing ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
              title="Actualiser la caisse (2s max)"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>

            {/* Paramètres & Sécurité PIN (Réservé au patron) */}
            {isPatron && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="btn-settings p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition cursor-pointer"
                title="Paramètres & Sécurité PIN"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}

            {/* BOUTON SE DÉCONNECTER ROUGE EN HAUT */}
            <button
              type="button"
              onClick={onLogout}
              className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center gap-1.5 shadow transition active:scale-95 cursor-pointer"
              title="Se déconnecter (retour QUI VEND ?)"
            >
              <LogOut className="w-4 h-4" />
              <span>DÉCONNEXION</span>
            </button>
          </div>

          {/* VUE MOBILE (< 768px, 375px-768px) : Boutons tactiles directs + Hamburger Menu */}
          <div className="flex md:hidden items-center gap-1.5 shrink-0">
            {/* Statut Réseau discret sur mobile */}
            <div
              className={`p-1.5 rounded-xl border flex items-center justify-center ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                  : 'bg-red-50 text-red-700 border-red-300'
              }`}
              title={isOnline ? 'En ligne' : 'Hors ligne'}
            >
              {isOnline ? (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              ) : (
                <WifiOff className="w-3.5 h-3.5 text-red-600" />
              )}
            </div>

            {/* Bouton direct Mon Abonnement sur mobile (Réservé au patron) */}
            {isPatron && (
              <button
                type="button"
                onClick={onOpenMonAbonnementModal}
                className="header-btn-mobile w-10 h-10 rounded-xl bg-amber-400 hover:bg-amber-500 active:bg-amber-600 text-slate-950 flex items-center justify-center transition active:scale-90 cursor-pointer shadow-xs border border-amber-500"
                title="Mon Abonnement / Forfait Actif"
                aria-label="Mon Abonnement"
              >
                <Crown className="w-5 h-5 text-slate-950 fill-amber-300" />
              </button>
            )}

            {/* Bouton direct Paramètres sur mobile (Réservé au patron) */}
            {isPatron && (
              <button
                type="button"
                onClick={onOpenSettings}
                className="btn-settings header-btn-mobile w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-700 flex items-center justify-center transition active:scale-90 cursor-pointer shadow-xs border border-gray-200"
                title="Paramètres & Sécurité PIN"
                aria-label="Paramètres"
              >
                <Settings className="w-5 h-5 text-gray-700" />
              </button>
            )}

            {/* Bouton direct Déconnexion ROUGE sur mobile */}
            <button
              type="button"
              onClick={onLogout}
              className="header-btn-mobile h-10 px-2.5 sm:px-3 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-black text-xs flex items-center gap-1 shadow-md transition active:scale-90 cursor-pointer border border-red-700"
              title="Se déconnecter"
              aria-label="Déconnexion"
            >
              <LogOut className="w-4 h-4 text-white shrink-0" />
              <span className="hidden min-[400px]:inline font-black text-[11px] uppercase tracking-wider">
                Sortir
              </span>
            </button>

            {/* Menu Hamburger pour accès complet < 768px (Réservé au patron) */}
            {isPatron && (
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                className={`btn-hamburger header-btn-mobile w-10 h-10 rounded-xl flex items-center justify-center border-2 transition active:scale-90 cursor-pointer shadow-xs ${
                  isMobileMenuOpen
                    ? 'bg-[#6C5CE7] text-white border-[#6C5CE7]'
                    : 'bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-[#6C5CE7] border-indigo-200'
                }`}
                title={isMobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
                aria-label="Menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="w-5 h-5 text-white" />
                ) : (
                  <Menu className="w-5 h-5 text-[#6C5CE7]" />
                )}
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DROPDOWN / TIROIR MENU MOBILE (< 768px) AVEC Z-INDEX ÉLEVÉ (z-[100]) - Réservé au patron */}
      {isPatron && isMobileMenuOpen && (
        <>
          {/* Backdrop sombre */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[99] md:hidden animate-in fade-in duration-150"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Tiroir menu mobile */}
          <div
            className="mobile-nav-drawer fixed top-[60px] sm:top-[68px] right-2 left-2 sm:left-auto sm:right-4 sm:w-88 max-w-sm bg-white rounded-3xl shadow-2xl border-2 border-gray-200 p-4 sm:p-5 z-[100] md:hidden animate-in fade-in slide-in-from-top-2 duration-200 space-y-3.5 select-none"
            role="dialog"
            aria-label="Menu Mobile EFA ACONTA"
          >
            {/* Header du menu avec profil & fermeture */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#6C5CE7] text-white flex items-center justify-center font-black text-lg shadow-sm">
                  {currentUser.nom.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-black text-sm text-gray-900 leading-tight">
                    {currentUser.prenom || currentUser.nom}
                  </div>
                  <div className="text-[11px] font-bold text-[#6C5CE7]">
                    {currentUser.role === 'patron' ? 'Patron' : 'Vendeur / Employé'} • {patron.nom_boutique || 'Ma Boutique'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center active:scale-90 transition cursor-pointer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Statut réseau */}
            <div
              className={`flex items-center justify-between p-2.5 rounded-2xl text-xs font-black border ${
                isOnline
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-red-50 text-red-800 border-red-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    <span>Mode Connecté (Synchronisation active)</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-4 h-4 text-red-600" />
                    <span>Mode Hors Ligne (Stockage local)</span>
                  </>
                )}
              </div>
            </div>

            {/* ACTION : BOUTON PARAMÈTRES & SÉCURITÉ PIN (LARGE & HYPER VISIBLE) */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                onOpenSettings();
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-900 font-black text-sm flex items-center justify-between border-2 border-gray-200 shadow-sm transition active:scale-98 touch-manipulation cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-[#6C5CE7] flex items-center justify-center">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <div className="leading-tight font-black text-xs sm:text-sm text-gray-900">
                    Paramètres & Sécurité PIN
                  </div>
                  <div className="text-[10px] text-gray-500 font-semibold">
                    Code PIN, profil, abonnement
                  </div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>

            {/* RACCOURCI MON ABONNEMENT (Patron seulement) */}
            {isPatron && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  if (onOpenMonAbonnementModal) {
                    onOpenMonAbonnementModal();
                  } else {
                    onNavigate('mon-abonnement');
                  }
                }}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 border-2 border-amber-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-between transition active:scale-98 touch-manipulation cursor-pointer shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-300 flex items-center justify-center shadow-xs">
                    <Crown className="w-5 h-5 fill-amber-400" />
                  </div>
                  <div className="text-left">
                    <div className="leading-tight font-black text-xs sm:text-sm text-slate-950">
                      Mon Abonnement / Forfait Actif
                    </div>
                    <div className="text-[10px] text-slate-900 font-bold">
                      Jours restants, expiration & renouvellement WhatsApp
                    </div>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-950" />
              </button>
            )}

            {/* TOGGLE VOIX EFA */}
            <button
              type="button"
              onClick={() => {
                const next = !isVoiceOn;
                toggleVoice();
                if (next) {
                  setTimeout(() => speak("Voix activée"), 100);
                }
              }}
              className={`w-full py-3 px-4 rounded-2xl border-2 flex items-center justify-between transition active:scale-98 touch-manipulation cursor-pointer ${
                isVoiceOn
                  ? 'bg-blue-50 border-blue-300 text-blue-900'
                  : 'bg-gray-50 border-gray-200 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{isVoiceOn ? '🔊' : '🔇'}</span>
                <div className="text-left">
                  <div className="text-xs sm:text-sm font-black">
                    {isVoiceOn ? 'Voix EFA : Activée' : 'Voix EFA : Coupée'}
                  </div>
                  <div className="text-[10px] text-gray-500">
                    Synthèse vocale des actions
                  </div>
                </div>
              </div>
              <span
                className={`text-[11px] font-black px-2.5 py-1 rounded-full ${
                  isVoiceOn ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {isVoiceOn ? 'ON' : 'OFF'}
              </span>
            </button>

            {/* RACCOURCI AMBASSADRICE (Patron seulement) */}
            {isPatron && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onNavigate('ambassadrice');
                }}
                className="w-full py-3 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border-2 border-amber-300 text-amber-900 font-extrabold text-xs sm:text-sm flex items-center justify-between transition active:scale-98 touch-manipulation cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-800 flex items-center justify-center">
                    <Gift className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-xs sm:text-sm">Page Ambassadrice</div>
                    <div className="text-[10px] text-amber-700">Parrainage et récompenses</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-amber-400" />
              </button>
            )}

            {/* RACCOURCI INSTALLER L'APPLICATION (PWA) */}
            {isInstallable && (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  handleInstallClick();
                }}
                className="w-full py-3 px-4 rounded-2xl bg-indigo-50 hover:bg-indigo-100 border-2 border-indigo-200 text-indigo-900 font-extrabold text-xs sm:text-sm flex items-center justify-between transition active:scale-98 touch-manipulation cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-200 text-indigo-800 flex items-center justify-center">
                    <Download className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <div className="font-extrabold text-xs sm:text-sm">Installer l'application</div>
                    <div className="text-[10px] text-indigo-600">Accès hors ligne sur l'écran d'accueil</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-indigo-400" />
              </button>
            )}

            {/* ACTUALISER & VIDER LE CACHE */}
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen(false);
                handleRefreshApp();
              }}
              disabled={isRefreshing}
              className="w-full py-3 px-4 rounded-2xl bg-gray-50 hover:bg-gray-100 border-2 border-gray-200 text-gray-700 font-bold text-xs sm:text-sm flex items-center gap-3 transition active:scale-98 touch-manipulation cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-gray-200 text-gray-700 flex items-center justify-center">
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
              </div>
              <div className="text-left">
                <div className="font-extrabold text-xs sm:text-sm">
                  {isRefreshing ? 'Actualisation...' : "Actualiser la caisse"}
                </div>
                <div className="text-[10px] text-gray-500">
                  {isRefreshing ? 'Synchronisation rapide...' : 'Rafraîchir en 2s max'}
                </div>
              </div>
            </button>
          </div>
        </>
      )}
    </>
  );
};

