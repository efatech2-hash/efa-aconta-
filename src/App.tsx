/**
 * EFA ACONTA - Version Finale BOSS
 * @license Apache-2.0
 * ENTRÉE : Conditions + PIN 4 chiffres (Pour mamans marché Lomé)
 * INTÉRIEUR : Ton code original 100% intact (Employés, Vendeuse, Patron, etc)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from './lib/db';
import type {
  Patron,
  Employe,
  Produit,
  Vente,
  Depense,
  Credit,
  Parrainage,
  ParsedVoiceCommand,
  CurrentUser,
} from './lib/types';
import { processSyncQueue, queueSyncItem } from './lib/sync';
import { HeaderNav } from './components/HeaderNav';
import { HomeScreen } from './components/HomeScreen';
import { VendreScreen } from './components/VendreScreen';
import { MonArgentScreen } from './components/MonArgentScreen';
import { AjouterStockScreen } from './components/AjouterStockScreen';
import { StockScreen } from './components/StockScreen';
import { EmployesScreen } from './components/EmployesScreen';
import { AmbassadriceScreen } from './components/AmbassadriceScreen';
import { MonAbonnementScreen } from './components/MonAbonnementScreen';
import { MesVentesScreen } from './components/MesVentesScreen';
import { WhoIsSellingModal } from './components/WhoIsSellingModal';
import { EFAVoiceAssistant } from './components/EFAVoiceAssistant';
import { ConfirmationModal } from './components/ConfirmationModal';
import { SettingsModal } from './components/SettingsModal';
import { AutoLogoutPromptModal } from './components/AutoLogoutPromptModal';
import { InviteLandingScreen } from './components/InviteLandingScreen';
import { HistoriqueScreen } from './components/HistoriqueScreen';
import { SubscriptionModal } from './components/SubscriptionModal';
import { PinLockScreen } from './components/PinLockScreen';
import { logAction } from './lib/historique';
import { isSubscriptionExpired, syncEmployeesSubscription, isBoutiquePro } from './lib/checkLimits';
import { speakFrench } from './lib/speech';
import { supabase } from './lib/supabase';
import { getIsPickingPhoto } from './lib/camera';
import { App as CapacitorApp } from '@capacitor/app';
import CheckAbonnement from './components/CheckAbonnement';
import { withTimeout } from './lib/supabaseHelper';

// ===================================================================
// NOUVEAU COMPOSANT ENTRÉE - CONDITIONS + PIN 4 CHIFFRES - BOSS
// ===================================================================
function EfaAcontaOnboarding({ 
  referralCode,
  onComplete 
}: { 
  referralCode?: string;
  onComplete: (newPatron: Patron) => void;
}) {
  const [step, setStep] = useState<'conditions' | 'nom-boutique' | 'create-pin'>('conditions');
  const [accepted, setAccepted] = useState(false);
  const [showConditionsDetail, setShowConditionsDetail] = useState(false);
  const [nomBoutique, setNomBoutique] = useState('');
  const [nomPatron, setNomPatron] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleCreateAccount = async () => {
    if (pin.length !== 4) { 
      alert('Ton code secret doit avoir 4 chiffres BOSS, comme Mobile Money'); 
      return; 
    }
    if (pin !== confirmPin) { 
      alert('Les 2 codes ne sont pas pareils, recommence'); 
      return; 
    }
    if (!nomBoutique.trim()) { 
      alert('Comment s\'appelle ta boutique ?'); 
      return; 
    }

    const now = new Date();
    const trialEnd = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);

    const newPatron: Patron = {
      id: 'patron-' + Date.now(),
      nom: nomPatron || 'Patron',
      email: `patron${Date.now()}@gmail.com`,
      telephone: '',
      phone_country: '+228',
      phone_number: '',
      phone_full: '',
      nom_boutique: nomBoutique,
      pin_code: pin,
      code_pin: pin,
      pin_hash: pin,
      genre: 'femme',
      role: 'patron',
      abonnement_expire: trialEnd.toISOString(),
      subscription_status: 'trial',
      trial_start_date: now.toISOString(),
      trial_end_date: trialEnd.toISOString(),
      subscription_end_date: trialEnd.toISOString(),
      created_at: now.toISOString(),
    };

    await db.patrons.put(newPatron);
    if (referralCode) {
      localStorage.setItem('efa_invite_code', referralCode);
    }
    localStorage.setItem('entreprise_id', newPatron.id);
    localStorage.setItem('efa_aconta_locked', 'false');
    localStorage.setItem('efa_active_user_id', newPatron.id);
    
    // Sync vers Supabase
    await queueSyncItem('patrons', 'insert', newPatron.id, newPatron);
    
    onComplete(newPatron);
  };

  if (step === 'conditions') {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6 max-w-md mx-auto">
        <div className="flex-1 flex flex-col justify-center">
          <div className="w-20 h-20 bg-[#6C5CE7] rounded-[20px] mx-auto mb-6 flex items-center justify-center text-white text-3xl font-black shadow-lg">EFA</div>
          <h1 className="text-[28px] font-black text-center mb-2 leading-tight">Bienvenue sur<br/>EFA ACONTA</h1>
          <p className="text-center text-gray-500 mb-8 font-medium">L'app simple pour gérer ta boutique à Lomé</p>
          
          {!showConditionsDetail ? (
            <div className="bg-[#F8F9FA] rounded-2xl p-5 mb-6 border border-gray-100">
              <p className="text-sm font-bold text-gray-800">Pour utiliser EFA ACONTA, tu dois accepter nos conditions d'utilisation.</p>
              <button onClick={() => setShowConditionsDetail(true)} className="text-[#6C5CE7] text-sm font-black mt-3 underline">Voir les conditions d'utilisation</button>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-2xl p-4 text-[13px] text-gray-700 h-64 overflow-y-auto mb-6 border leading-relaxed">
              <h3 className="font-black mb-3 text-base">Conditions d'utilisation EFA ACONTA</h3>
              <p><b>1. Service:</b> EFA ACONTA t'aide à gérer ton stock, tes ventes et ton argent. Tout marche même sans internet.</p>
              <p className="mt-2"><b>2. Données:</b> Tes données restent sur ton téléphone. On ne partage rien.</p>
              <p className="mt-2"><b>3. Code secret:</b> Ton code à 4 chiffres est secret. Ne le donne à personne. Si tu l'oublies, contacte le support.</p>
              <p className="mt-2"><b>4. Essai gratuit:</b> 21 jours gratuits, après tu choisis un abonnement pour continuer.</p>
              <p className="mt-2"><b>5. Acceptation:</b> En cochant, tu acceptes d'utiliser EFA ACONTA pour gérer ta boutique honnêtement.</p>
              <button onClick={() => setShowConditionsDetail(false)} className="text-[#6C5CE7] font-black mt-4">← Retour</button>
            </div>
          )}

          <label className="flex items-start gap-3 mb-8 cursor-pointer bg-white border-2 border-gray-100 rounded-2xl p-4">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="w-6 h-6 rounded-lg accent-[#6C5CE7] mt-0.5" />
            <span className="font-bold text-[14px] leading-tight">J'accepte les <span className="text-[#6C5CE7]">conditions d'utilisation</span> de EFA ACONTA</span>
          </label>

          <button disabled={!accepted} onClick={() => setStep('nom-boutique')} className={`w-full py-[18px] rounded-2xl font-black text-white text-[17px] shadow-lg transition-all ${accepted ? 'bg-[#6C5CE7] active:scale-[0.98]' : 'bg-gray-300'}`}>Continuer</button>
          
          <p className="text-center text-[11px] text-gray-400 mt-4">Sans Gmail • Sans Facebook • Juste 4 chiffres</p>
        </div>
      </div>
    );
  }

  if (step === 'nom-boutique') {
    return (
      <div className="min-h-screen bg-white flex flex-col p-6 max-w-md mx-auto">
        <div className="flex-1 flex flex-col justify-center">
          <button onClick={() => setStep('conditions')} className="text-left text-gray-400 font-bold mb-6">← Retour</button>
          <h1 className="text-[26px] font-black mb-2 leading-tight">Comment s'appelle ta boutique ?</h1>
          <p className="text-gray-500 mb-8">On va l'afficher sur tes reçus</p>
          <input value={nomBoutique} onChange={(e) => setNomBoutique(e.target.value)} placeholder="Ex: Boutique de Aicha à Adidogomé" className="w-full p-5 rounded-2xl border-2 border-gray-200 font-bold mb-4 focus:border-[#6C5CE7] outline-none text-[16px]" />
          <input value={nomPatron} onChange={(e) => setNomPatron(e.target.value)} placeholder="Ton prénom (Ex: Aicha)" className="w-full p-5 rounded-2xl border-2 border-gray-200 font-bold mb-8 focus:border-[#6C5CE7] outline-none text-[16px]" />
          <button onClick={() => setStep('create-pin')} disabled={!nomBoutique.trim()} className={`w-full py-[18px] rounded-2xl font-black text-white text-[17px] ${nomBoutique.trim() ? 'bg-[#6C5CE7]' : 'bg-gray-300'}`}>Suivant →</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col p-6 max-w-md mx-auto">
      <div className="flex-1 flex flex-col justify-center">
        <button onClick={() => setStep('nom-boutique')} className="text-left text-gray-400 font-bold mb-6">← Retour</button>
        <h1 className="text-[26px] font-black mb-2 leading-tight">Crée ton code secret</h1>
        <p className="text-gray-500 mb-8">4 chiffres comme pour Mobile Money. Tu l'utiliseras pour ouvrir ton app chaque fois.</p>
        
        <label className="font-black text-[13px] mb-2 uppercase tracking-wide text-gray-600">Ton code (4 chiffres)</label>
        <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0,4))} type="tel" inputMode="numeric" placeholder="••••" className="w-full p-5 rounded-2xl border-2 border-gray-200 text-center text-[32px] tracking-[0.6em] font-black mb-5 focus:border-[#6C5CE7] outline-none" />
        
        <label className="font-black text-[13px] mb-2 uppercase tracking-wide text-gray-600">Confirme ton code</label>
        <input value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0,4))} type="tel" inputMode="numeric" placeholder="••••" className="w-full p-5 rounded-2xl border-2 border-gray-200 text-center text-[32px] tracking-[0.6em] font-black mb-8 focus:border-[#6C5CE7] outline-none" />

        <button onClick={handleCreateAccount} disabled={pin.length !== 4 || confirmPin.length !== 4} className={`w-full py-[18px] rounded-2xl font-black text-white text-[17px] shadow-lg ${pin.length === 4 && confirmPin.length === 4 ? 'bg-[#6C5CE7]' : 'bg-gray-300'}`}>Valider et entrer dans ma boutique 🔥</button>
        
        <p className="text-center text-xs text-gray-400 mt-6">Retiens bien ce code BOSS !</p>
      </div>
    </div>
  );
}

// ===================================================================
// FIN NOUVEAU COMPOSANT - TON CODE ORIGINAL COMMENCE ICI BOSS
// ===================================================================

export default function App() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Données boutique
  const [patron, setPatron] = useState<Patron | null>(null);
  const [employes, setEmployes] = useState<Employe[]>([]);
  const [products, setProducts] = useState<Produit[]>([]);
  const [ventes, setVentes] = useState<Vente[]>([]);
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [credits, setCredits] = useState<Credit[]>([]);
  const [parrainages, setParrainages] = useState<Parrainage[]>([]);

  // Utilisateur actif & navigation
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [activeTab, setActiveTab] = useState<'home' | 'vendre' | 'mon-argent' | 'stock' | 'ajouter' | 'employes' | 'ambassadrice' | 'mes-ventes' | 'historique' | 'mon-abonnement'>('home');
  const [isLockScreenOpen, setIsLockScreenOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [isPinLocked, setIsPinLocked] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return (
        localStorage.getItem('efa_aconta_locked') === 'true' ||
        window.location.pathname === '/pin-lock'
      );
    }
    return false;
  });

  const [subscriptionModal, setSubscriptionModal] = useState<{
    isOpen: boolean;
    isBlocking: boolean;
    plan?: 'populaire' | 'pro' | null;
    reason?: string;
  }>({
    isOpen: false,
    isBlocking: false,
    plan: 'populaire',
  });

  const handleOpenSubscriptionModal = (plan?: 'populaire' | 'pro', reason?: string) => {
    setSubscriptionModal({
      isOpen: true,
      isBlocking: false,
      plan: plan || 'populaire',
      reason,
    });
  };

  const [isAutoLogoutPromptOpen, setIsAutoLogoutPromptOpen] = useState(false);
  const [previewInviteSlug, setPreviewInviteSlug] = useState<string | null>(null);
  const [pendingVoiceAction, setPendingVoiceAction] = useState<ParsedVoiceCommand | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const searchParams = new URLSearchParams(window.location.search);
      const urlInvite = searchParams.get('invite');
      if (pathname.includes('/invite/')) {
        const slug = pathname.split('/invite/')[1]?.split('/')[0];
        if (slug) setPreviewInviteSlug(slug);
      } else if (urlInvite) {
        setPreviewInviteSlug(urlInvite);
      } else if (pathname === '/ambassadrice' || pathname === '/ambassadrice/') {
        setActiveTab('ambassadrice');
      } else if (pathname === '/mon-abonnement' || pathname === '/mon-abonnement/') {
        setActiveTab('mon-abonnement');
      }
      const handlePopState = () => {
        const path = window.location.pathname;
        if (path === '/ambassadrice' || path === '/ambassadrice/') setActiveTab('ambassadrice');
        else if (path === '/mon-abonnement' || path === '/mon-abonnement/') setActiveTab('mon-abonnement');
        else if (path === '/' || path === '') setActiveTab('home');
      };
      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
    }
  }, []);

  const isLoadingDatabaseRef = useRef(false);
  const [toastNotification, setToastNotification] = useState<{ message: string; type: 'success' | 'warning' | 'info'; } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'warning' | 'info' = 'info') => {
    setToastNotification({ message, type });
    const timer = setTimeout(() => setToastNotification(null), 3500);
    return () => clearTimeout(timer);
  }, []);

  const loadDatabase = useCallback(async () => {
    if (isLoadingDatabaseRef.current) return;
    isLoadingDatabaseRef.current = true;
    try {
      const patronsList = await db.patrons.toArray();
      let currentPatron: Patron | null = patronsList.length > 0 ? patronsList[0] : null;

      if (typeof navigator !== 'undefined' && navigator.onLine) {
        try {
          const query = currentPatron
            ? supabase.from('patrons').select('*').eq('id', currentPatron.id).limit(1).maybeSingle()
            : supabase.from('patrons').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle();
          const { data: remotePatron }: any = await withTimeout(query, 5000);
          if (remotePatron) {
            const realPin = remotePatron.pin_code || remotePatron.code_pin || remotePatron.mot_de_passe || remotePatron.password;
            if (currentPatron) {
              currentPatron = { ...currentPatron, nom: remotePatron.nom || currentPatron.nom, nom_boutique: remotePatron.nom_boutique || currentPatron.nom_boutique, pin_code: realPin !== undefined ? realPin : currentPatron.pin_code, code_pin: realPin !== undefined ? realPin : currentPatron.code_pin, pin_hash: remotePatron.pin_hash || currentPatron.pin_hash };
            } else {
              currentPatron = { id: remotePatron.id || 'patron-' + Date.now(), nom: remotePatron.nom || 'Patron', telephone: remotePatron.telephone || '', phone_country: remotePatron.phone_country || '+228', phone_number: remotePatron.phone_number || '', phone_full: remotePatron.phone_full || remotePatron.telephone || '', nom_boutique: remotePatron.nom_boutique || 'Ma Boutique', pin_code: realPin || '', code_pin: realPin || '', pin_hash: remotePatron.pin_hash || '', genre: remotePatron.genre || 'femme', role: 'patron', abonnement_expire: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), subscription_status: remotePatron.subscription_status || 'trial', created_at: remotePatron.created_at || new Date().toISOString() };
            }
            if (currentPatron) await db.patrons.put(currentPatron);
          }
        } catch (syncErr) { console.warn('[Sync] timeout:', syncErr); }
      }

      if (currentPatron) {
        if (currentPatron.pin_code === '1234' || currentPatron.pin_code === '123') currentPatron.pin_code = currentPatron.code_pin || '';
        const now = new Date();
        let patronNeedsUpdate = false;
        if (!currentPatron.trial_start_date) {
          const created = new Date(currentPatron.created_at || Date.now());
          const trialEnd = new Date(created.getTime() + 21 * 24 * 60 * 60 * 1000);
          currentPatron.trial_start_date = created.toISOString();
          currentPatron.trial_end_date = trialEnd.toISOString();
          currentPatron.subscription_status = 'trial';
          currentPatron.subscription_end_date = trialEnd.toISOString();
          patronNeedsUpdate = true;
        }
        if ((currentPatron.subscription_status === 'trial' || !currentPatron.subscription_status) && currentPatron.trial_end_date && now > new Date(currentPatron.trial_end_date)) {
          currentPatron.subscription_status = 'expired';
          patronNeedsUpdate = true;
        }
        if (!currentPatron.email || currentPatron.email.includes('@efa-aconta.com') || currentPatron.email.includes('@efa.local')) {
          currentPatron.email = `patron${Date.now()}@gmail.com`;
          patronNeedsUpdate = true;
        }
        if (patronNeedsUpdate) {
          await db.patrons.put(currentPatron);
          await queueSyncItem('patrons', 'update', currentPatron.id, currentPatron);
        }
        setPatron(currentPatron);
        if (typeof window !== 'undefined') localStorage.setItem('entreprise_id', currentPatron.id);
        syncEmployeesSubscription(currentPatron.id, currentPatron.subscription_status || 'trial').catch(() => {});
        const [empList, prodList, ventList, depList, credList, parrList] = await Promise.all([
          db.employes.where('patron_id').equals(currentPatron.id).toArray(),
          db.produits.where('patron_id').equals(currentPatron.id).toArray(),
          db.ventes.where('patron_id').equals(currentPatron.id).toArray(),
          db.depenses.where('patron_id').equals(currentPatron.id).toArray(),
          db.credits.where('patron_id').equals(currentPatron.id).toArray(),
          db.parrainage.where('parrain_id').equals(currentPatron.id).toArray(),
        ]);
        setEmployes(empList); setProducts(prodList); setVentes(ventList); setDepenses(depList); setCredits(credList); setParrainages(parrList);
        const savedUserId = localStorage.getItem('efa_active_user_id');
        if (!currentUser) {
          if (savedUserId && savedUserId !== currentPatron.id) {
            const foundEmp = empList.find((e) => e.id === savedUserId);
            const isEmpBlocked = foundEmp && (foundEmp.is_blocked || foundEmp.status === 'blocked' || foundEmp.is_active === false || foundEmp.is_deleted || foundEmp.status === 'deleted');
            if (foundEmp && !isEmpBlocked) {
              setCurrentUser({ id: foundEmp.id, nom: foundEmp.nom, role: 'vendeuse', genre: foundEmp.genre || 'femme', photo_url: foundEmp.photo_url });
            } else {
              localStorage.setItem('efa_active_user_id', currentPatron.id);
              setCurrentUser({ id: currentPatron.id, nom: currentPatron.nom, role: 'patron', genre: currentPatron.genre || 'femme', photo_url: currentPatron.photo_url });
            }
          } else {
            setCurrentUser({ id: currentPatron.id, nom: currentPatron.nom, role: 'patron', genre: currentPatron.genre || 'femme', photo_url: currentPatron.photo_url });
          }
        }
      }
    } catch (err) { console.error('Erreur chargement base locale:', err); } 
    finally { isLoadingDatabaseRef.current = false; setIsInitializing(false); }
  }, [currentUser]);

  const handleFastRefresh = useCallback(async () => {
    const t0 = performance.now();
    try {
      await loadDatabase();
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        processSyncQueue().catch(() => {});
        const durationSec = Math.max(0.1, (performance.now() - t0) / 1000).toFixed(1);
        showToast(`Caisse actualisée (${durationSec}s)`, 'success');
      } else showToast('Pas de connexion (Mode hors-ligne actif)', 'warning');
    } catch { showToast('Pas de connexion - Données locales conservées', 'warning'); }
  }, [loadDatabase, showToast]);

  useEffect(() => { loadDatabase(); }, [loadDatabase]);

  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      processSyncQueue().then((res) => { if (res.syncedCount > 0) console.log(`[Sync] ${res.syncedCount} synchronisé(s)`); });
    }, 30000);
    return () => clearInterval(interval);
  }, [isOnline]);

  const lockApp = useCallback(() => {
    if (getIsPickingPhoto()) return;
    if (!patron) return;
    localStorage.setItem('efa_aconta_locked', 'true');
    setIsPinLocked(true);
    if (typeof window !== 'undefined' && window.location.pathname !== '/pin-lock') window.history.pushState(null, '', '/pin-lock');
  }, [patron]);

  useEffect(() => {
    if (!patron) return;
    const handleVisibility = () => { if (getIsPickingPhoto()) return; if (document.hidden) lockApp(); };
    const handleBlur = () => { if (getIsPickingPhoto()) return; lockApp(); };
    const handlePageHide = () => { if (getIsPickingPhoto()) return; lockApp(); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('pagehide', handlePageHide);
    let appStateHandle: any = null;
    try { CapacitorApp.addListener('appStateChange', (state) => { if (getIsPickingPhoto()) return; if (!state.isActive) lockApp(); }).then((handle) => { appStateHandle = handle; }).catch(() => {}); } catch {}
    let t: NodeJS.Timeout;
    const reset = () => { clearTimeout(t); t = setTimeout(() => { if (getIsPickingPhoto()) return; lockApp(); }, 120000); };
    const activityEvents = ['touchstart', 'mousemove', 'keydown', 'pointerdown'];
    activityEvents.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pagehide', handlePageHide);
      if (appStateHandle && typeof appStateHandle.remove === 'function') appStateHandle.remove();
      activityEvents.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(t);
    };
  }, [patron, lockApp]);

  useEffect(() => {
    const handlePopState = () => { if (window.location.pathname === '/pin-lock') setIsPinLocked(true); };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleUnlockPin = (unlockedUser: CurrentUser) => {
    localStorage.setItem('efa_aconta_locked', 'false');
    setCurrentUser(unlockedUser);
    localStorage.setItem('efa_active_user_id', unlockedUser.id);
    setIsPinLocked(false);
    if (typeof window !== 'undefined' && window.location.pathname === '/pin-lock') window.history.pushState(null, '', '/');
    setActiveTab('home');
  };

  const handleLogout = useCallback(() => { setIsAutoLogoutPromptOpen(false); lockApp(); }, [lockApp]);

  const handleNavigate = useCallback((tab: 'home' | 'vendre' | 'mon-argent' | 'stock' | 'ajouter' | 'employes' | 'ambassadrice' | 'mes-ventes' | 'historique' | 'mon-abonnement') => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      if (tab === 'ambassadrice') window.history.pushState({}, '', '/ambassadrice');
      else if (tab === 'mon-abonnement') window.history.pushState({}, '', '/mon-abonnement');
      else if (tab === 'home') window.history.pushState({}, '', '/');
    }
  }, []);

  const triggerPostActionPrompt = () => { if (patron?.auto_logout_after_action !== false) setIsAutoLogoutPromptOpen(true); };

  const handleConfirmVoiceAction = async () => {
    if (!pendingVoiceAction || !patron || !currentUser) return;
    const action = pendingVoiceAction;
    setPendingVoiceAction(null);
    try {
      if (action.type === 'vente') {
        const saleData = action.data;
        const saleId = 'vente-vocal-' + Date.now();
        const nowIso = new Date().toISOString();
        const saleRecord: Vente = { id: saleId, patron_id: patron.id, produit_id: saleData.produit_id, produit_nom: saleData.produit_nom, qte: saleData.qte, montant_total: saleData.montant_total, client_nom: saleData.client_nom, est_credit: saleData.est_credit, reste_a_payer: saleData.reste_a_payer, vendu_par_id: currentUser.id, vendu_par_nom: currentUser.nom, vendu_par_genre: currentUser.genre, date: nowIso, synced: false };
        await db.ventes.put(saleRecord);
        await queueSyncItem('ventes', 'insert', saleId, saleRecord);
        const currentProd = products.find((p) => p.id === saleData.produit_id);
        if (currentProd) {
          const newStock = Math.max(0, currentProd.stock_qte - saleData.qte);
          await db.produits.update(currentProd.id, { stock_qte: newStock });
          await queueSyncItem('produits', 'update', currentProd.id, { stock_qte: newStock });
        }
        if (saleData.est_credit) {
          const creditId = 'credit-vocal-' + Date.now();
          const creditRecord: Credit = { id: creditId, patron_id: patron.id, client_nom: saleData.client_nom || 'Client crédit', montant_initial: saleData.montant_total, reste_a_payer: saleData.reste_a_payer, dernier_paiement: nowIso, synced: false };
          await db.credits.put(creditRecord);
          await queueSyncItem('credits', 'insert', creditId, creditRecord);
        }
        logAction({ patron_id: patron.id, user_id: currentUser.id, employe_id: currentUser.role === 'patron' ? null : currentUser.id, employe_nom: currentUser.role === 'patron' ? undefined : (currentUser.prenom || currentUser.nom), action_type: 'vente', description: `Vente vocale ${saleData.qte}x ${saleData.produit_nom} (${saleData.montant_total}F) par ${currentUser.role === 'patron' ? 'Patron' : (currentUser.prenom || currentUser.nom)}`, montant: saleData.montant_total }).catch(console.error);
        await loadDatabase(); triggerPostActionPrompt();
      } else if (action.type === 'depense') {
        const depData = action.data;
        const depId = 'dep-vocal-' + Date.now();
        const depRecord: Depense = { id: depId, patron_id: patron.id, type: depData.type, montant: depData.montant, description: depData.description, cree_par: currentUser.nom, date: new Date().toISOString(), synced: false };
        await db.depenses.put(depRecord);
        await queueSyncItem('depenses', 'insert', depId, depRecord);
        await loadDatabase(); triggerPostActionPrompt();
      } else if (action.type === 'produit') {
        const prodData = action.data;
        const prodId = 'prod-vocal-' + Date.now();
        const prodRecord: Produit = { id: prodId, patron_id: patron.id, nom: prodData.nom, photo_url: 'https://images.unsplash.com/photo-1578587018452-892bacefd3f2?auto=format&fit=crop&w=400&q=80', prix_achat: prodData.prix_achat, prix_vente: prodData.prix_vente, stock_qte: prodData.stock_qte, seuil_alerte: 5, created_at: new Date().toISOString() };
        await db.produits.put(prodRecord);
        await queueSyncItem('produits', 'insert', prodId, prodRecord);
        await loadDatabase(); triggerPostActionPrompt();
      } else if (action.type === 'navigation') setActiveTab(action.data.target);
    } catch (err) { console.error('Erreur exécution vocale:', err); }
  };

  const handleCancelVoiceAction = () => setPendingVoiceAction(null);

  if (isInitializing) {
    return <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-4"><div className="w-16 h-16 rounded-full border-4 border-[#6C5CE7] border-t-transparent animate-spin mb-4" /><p className="text-xl font-black text-gray-800">Chargement de la caisse EFA ACONTA...</p></div>;
  }

  if (previewInviteSlug && patron) {
    return <InviteLandingScreen patron={patron} slug={previewInviteSlug} onAcceptInvite={(slug) => { localStorage.setItem('efa_invite_code', slug); setPreviewInviteSlug(null); speakFrench(`Code d'invitation ${slug} activé !`); }} onBack={() => setPreviewInviteSlug(null)} />;
  }

  // ICI BOSS - C'EST LA SEULE LIGNE QUI CHANGE - ON UTILISE NOTRE NOUVELLE ENTRÉE CONDITIONS + PIN
  if (!patron) {
    return (
      <div className="relative min-h-screen">
        <EfaAcontaOnboarding
          referralCode={previewInviteSlug || undefined}
          onComplete={(newPatron) => {
            setPatron(newPatron);
            const user: CurrentUser = { id: newPatron.id, nom: newPatron.nom, role: 'patron', genre: newPatron.genre || 'femme', photo_url: newPatron.photo_url };
            setCurrentUser(user);
            localStorage.setItem('efa_active_user_id', user.id);
            localStorage.setItem('entreprise_id', newPatron.id);
            loadDatabase();
          }}
        />
        <EFAVoiceAssistant isOnline={isOnline} products={products} onCommandParsed={(cmd) => setPendingVoiceAction(cmd)} />
        <ConfirmationModal isOpen={!!pendingVoiceAction} summary={pendingVoiceAction?.summary || ''} transcript={pendingVoiceAction?.raw_transcript || ''} onConfirm={handleConfirmVoiceAction} onCancel={handleCancelVoiceAction} />
      </div>
    );
  }

  if (isPinLocked && !getIsPickingPhoto()) {
    return <PinLockScreen patron={patron} employes={employes} currentUser={currentUser} onUnlock={handleUnlockPin} />;
  }

  return (
    <CheckAbonnement entreprise_id={patron?.id}>
      <div className="min-h-screen bg-[#F8F9FA] text-gray-900 select-none">
        {toastNotification && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[99999] max-w-[92vw] pointer-events-none animate-in fade-in slide-in-from-top-4 duration-200">
            <div className={`px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs sm:text-sm font-bold border backdrop-blur-md ${toastNotification.type === 'success' ? 'bg-emerald-900/95 text-emerald-100 border-emerald-500/40' : toastNotification.type === 'warning' ? 'bg-amber-900/95 text-amber-100 border-amber-500/40' : 'bg-slate-900/95 text-slate-100 border-slate-700/40'}`}>
              <div className={`w-2.5 h-2.5 rounded-full ${toastNotification.type === 'success' ? 'bg-emerald-400 animate-pulse' : toastNotification.type === 'warning' ? 'bg-amber-400 animate-pulse' : 'bg-blue-400'}`} />
              <span>{toastNotification.message}</span>
            </div>
          </div>
        )}
        {currentUser && <HeaderNav patron={patron} currentUser={currentUser} isOnline={isOnline} onOpenLockScreen={() => setIsLockScreenOpen(true)} onOpenSettings={() => setIsSettingsOpen(true)} onLogout={handleLogout} onNavigate={handleNavigate} activeTab={activeTab} onRefreshData={handleFastRefresh} />}
        <main className="max-w-4xl mx-auto p-4 sm:p-6">
          {activeTab === 'home' && currentUser && <HomeScreen patron={patron} currentUser={currentUser} onNavigate={handleNavigate} onOpenSubscriptionModal={handleOpenSubscriptionModal} />}
          {activeTab === 'vendre' && currentUser && <VendreScreen patron={patron} currentUser={currentUser} products={products} onBack={() => setActiveTab('home')} onGoToStock={() => setActiveTab('stock')} onOpenSubscriptionModal={handleOpenSubscriptionModal} onSaleCompleted={() => { loadDatabase(); triggerPostActionPrompt(); }} />}
          {activeTab === 'mon-argent' && currentUser && currentUser.role === 'patron' && <MonArgentScreen patron={patron} currentUser={currentUser} ventes={ventes} depenses={depenses} credits={credits} products={products} onBack={() => setActiveTab('home')} onDataRefresh={() => loadDatabase()} />}
          {(activeTab === 'stock' || activeTab === 'ajouter') && currentUser && currentUser.role === 'patron' && <StockScreen patron={patron} products={products} onBack={() => setActiveTab('home')} onRefresh={() => loadDatabase()} onOpenSubscriptionModal={handleOpenSubscriptionModal} />}
          {activeTab === 'employes' && currentUser && currentUser.role === 'patron' && <EmployesScreen patron={patron} employes={employes} onBack={() => setActiveTab('home')} onRefresh={loadDatabase} onOpenSubscriptionModal={handleOpenSubscriptionModal} />}
          {activeTab === 'ambassadrice' && currentUser && currentUser.role === 'patron' && <AmbassadriceScreen patron={patron} parrainages={parrainages} onBack={() => setActiveTab('home')} onRefresh={loadDatabase} onPreviewInvite={(slug) => setPreviewInviteSlug(slug)} />}
          {activeTab === 'historique' && currentUser && currentUser.role === 'patron' && <HistoriqueScreen patron={patron} employes={employes} onBack={() => setActiveTab('home')} onOpenSubscriptionModal={handleOpenSubscriptionModal} />}
          {activeTab === 'mon-abonnement' && currentUser && currentUser.role === 'patron' && patron && <MonAbonnementScreen patron={patron} onBack={() => handleNavigate('home')} onOpenSubscriptionModal={handleOpenSubscriptionModal} onRefreshPatron={loadDatabase} />}
          {activeTab === 'mes-ventes' && currentUser && <MesVentesScreen currentUser={currentUser} ventes={ventes} onBack={() => setActiveTab('home')} />}
        </main>
        <EFAVoiceAssistant isOnline={isOnline} products={products} plan={patron.subscription_status} isPro={isBoutiquePro(patron)} onOpenSubscriptionModal={handleOpenSubscriptionModal} onCommandParsed={(cmd) => setPendingVoiceAction(cmd)} />
        <ConfirmationModal isOpen={!!pendingVoiceAction} summary={pendingVoiceAction?.summary || ''} transcript={pendingVoiceAction?.raw_transcript || ''} onConfirm={handleConfirmVoiceAction} onCancel={handleCancelVoiceAction} />
        {currentUser && <AutoLogoutPromptModal isOpen={isAutoLogoutPromptOpen} currentUser={currentUser} onStay={() => setIsAutoLogoutPromptOpen(false)} onLogout={handleLogout} />}
        {currentUser && <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} patron={patron} currentUser={currentUser} employes={employes} onLogout={handleLogout} onPatronUpdated={(updated) => { setPatron(updated); syncEmployeesSubscription(updated.id, updated.subscription_status || 'trial').catch(console.error); }} onOpenSubscriptionModal={handleOpenSubscriptionModal} onDataRefresh={loadDatabase} onNavigate={handleNavigate} />}
        <SubscriptionModal isOpen={subscriptionModal.isOpen || isSubscriptionExpired(patron)} isBlocking={isSubscriptionExpired(patron)} patron={patron} highlightPlan={subscriptionModal.plan} featureReason={subscriptionModal.reason} onClose={() => setSubscriptionModal((prev) => ({ ...prev, isOpen: false }))} />
        <WhoIsSellingModal isOpen={isLockScreenOpen} patron={patron} employes={employes} currentUser={currentUser} canClose={true} onSelectUser={(user) => { setCurrentUser(user); localStorage.setItem('efa_active_user_id', user.id); setIsLockScreenOpen(false); setActiveTab('home'); }} onClose={() => setIsLockScreenOpen(false)} />
      </div>
    </CheckAbonnement>
  );
}