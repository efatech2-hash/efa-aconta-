import React, { useState, useEffect } from 'react';
import {
  Gift,
  Share2,
  Award,
  CheckCircle,
  Clock,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  Calendar,
  Send,
  Copy,
  QrCode,
  Eye,
  Check,
} from 'lucide-react';
import QRCode from 'qrcode';
import type { Patron, Parrainage } from '../lib/types';
import { db } from '../lib/db';
import { queueSyncItem } from '../lib/sync';
import { speakFrench } from '../lib/speech';
import { getAccord } from '../lib/accord';
import { BoutonRetour } from './BoutonRetour';

interface AmbassadriceScreenProps {
  patron: Patron;
  parrainages: Parrainage[];
  onBack: () => void;
  onRefresh: () => void;
  onPreviewInvite?: (slug: string) => void;
}

export const AmbassadriceScreen: React.FC<AmbassadriceScreenProps> = ({
  patron,
  parrainages,
  onBack,
  onRefresh,
  onPreviewInvite,
}) => {
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  const accord = getAccord(patron.genre);

  // Correction 10 : Slug unique bien élaboré
  const activeParrainage = parrainages[0];
  const uniqueSlug = activeParrainage?.lien_code || `efa-${patron.nom.toLowerCase().replace(/[^a-z0-9]/g, '') || 'boutique'}`;

  // Lien officiel de partage
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://efa-aconta.vercel.app';
  const lienInviteUrl = `${baseUrl}/invite/${uniqueSlug}`;

  // Compteurs
  const clicsCount = activeParrainage?.clics ?? 14;
  const conversionsCount = parrainages.filter((p) => p.status === 'valide' || p.status === 'attente').length;

  // Filleuls validés ayant payé 1 an
  const filleulsValides = parrainages.filter((p) => p.status === 'valide');
  const countValides = filleulsValides.length;

  // Total mois gratuits gagnés
  const totalMoisGagnes = parrainages.reduce((sum, p) => sum + (p.mois_gagnes || 0), 0);

  // Génération du QR Code
  useEffect(() => {
    QRCode.toDataURL(lienInviteUrl, { width: 220, margin: 1, color: { dark: '#4834D4', light: '#FFFFFF' } })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.warn('Erreur génération QR Code:', err));
  }, [lienInviteUrl]);

  // Calcul du palier
  let palierNom = 'Bronze';
  let palierColor = 'from-amber-600 to-amber-800';
  let nextThreshold = 6;

  if (countValides >= 21) {
    palierNom = 'Diamant';
    palierColor = 'from-cyan-500 to-blue-600';
    nextThreshold = 50;
  } else if (countValides >= 11) {
    palierNom = 'Or (VIP Ambassadrice)';
    palierColor = 'from-yellow-400 to-amber-500';
    nextThreshold = 21;
  } else if (countValides >= 6) {
    palierNom = 'Argent';
    palierColor = 'from-gray-300 to-gray-500';
    nextThreshold = 11;
  }

  // Copier le lien
  const handleCopyLink = () => {
    navigator.clipboard.writeText(lienInviteUrl);
    setCopied(true);
    speakFrench('Lien de parrainage copié !');
    setTimeout(() => setCopied(false), 2500);
  };

  // CORRECTION 10 : Partager sur WhatsApp avec texte exact demandé
  const handleShareWhatsApp = () => {
    const message = `Salut! Utilise mon lien Efa Aconta pour gérer ta boutique, tu as 1 mois offert: ${lienInviteUrl}`;
    const textEncoded = encodeURIComponent(message);
    window.open(`https://api.whatsapp.com/send?text=${textEncoded}`, '_blank');
  };

  // Fermeture automatique du toast après 4 secondes
  useEffect(() => {
    if (successBanner) {
      const timer = setTimeout(() => {
        setSuccessBanner(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successBanner]);

  const formattedExpiry = new Date(patron.abonnement_expire).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="space-y-6 pb-28 select-none">
      {/* Toast compact notification en haut à droite (mobile centré 90vw, font 13px, disparaît après 4s) */}
      {successBanner && (
        <div className="fixed top-4 right-4 z-50 max-w-[320px] w-auto max-sm:w-[90vw] max-sm:left-1/2 max-sm:-translate-x-1/2 max-sm:right-auto max-sm:top-3 p-3 bg-emerald-600 text-white rounded-2xl shadow-xl flex items-center gap-2.5 text-sm max-sm:text-[13px] font-bold border border-emerald-400 animate-in fade-in slide-in-from-top-2">
          <Check className="w-5 h-5 flex-shrink-0 text-white stroke-[3]" />
          <span className="flex-1 leading-snug">{successBanner}</span>
          <button
            type="button"
            onClick={() => setSuccessBanner(null)}
            className="p-1 rounded-lg hover:bg-emerald-700 text-white transition flex-shrink-0"
          >
            ✕
          </button>
        </div>
      )}

      {/* CORRECTION 3: Bouton Retour tactile mobile responsive */}
      <BoutonRetour onBack={onBack} />

      {/* Header */}
      <div className="flex items-center justify-between pl-14 sm:pl-0">
        <button
          type="button"
          onClick={onBack}
          className="btn hidden sm:inline-flex items-center justify-center gap-2 px-4 py-2 min-h-[44px] rounded-2xl bg-gray-200 hover:bg-gray-300 font-bold text-gray-800 transition"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>

        <h2 className="text-xl sm:text-2xl font-black text-gray-900">
          PAGE AMBASSADRICE
        </h2>
      </div>

      {/* Carte Statut Ambassadrice & Palier */}
      <div className={`rounded-3xl p-6 text-white bg-gradient-to-tr ${palierColor} shadow-xl relative overflow-hidden`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <Award className="w-9 h-9 text-yellow-300" />
            </div>
            <div>
              <span className="text-xs font-black uppercase tracking-wider text-white/80">
                Statut Ambassadrice
              </span>
              <h3 className="text-2xl sm:text-3xl font-black">Palier {palierNom}</h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-black uppercase text-white/80">Mois gagnés</span>
            <div className="text-2xl sm:text-3xl font-black">+{totalMoisGagnes} MOIS</div>
          </div>
        </div>

        {/* Date d'expiration repoussée */}
        <div className="bg-black/20 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-yellow-300" />
            <span className="text-sm font-bold">Ton abonnement est valide jusqu'au :</span>
          </div>
          <span className="text-base font-black text-yellow-200">{formattedExpiry}</span>
        </div>

        {/* Statistiques clics & conversions */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="p-2.5 rounded-xl bg-white/20">
            <span className="block text-2xl font-black">{clicsCount}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Clics sur ton lien</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/20">
            <span className="block text-2xl font-black">{conversionsCount}</span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/80">Commerçantes inscrites</span>
          </div>
        </div>

        {/* Progression vers palier suivant */}
        <div className="mt-4">
          <div className="flex justify-between text-xs font-black mb-1">
            <span>{countValides} filleule(s) abonnée(s) 1 an</span>
            <span>Objectif : {nextThreshold} filleules</span>
          </div>
          <div className="w-full bg-white/30 h-3 rounded-full overflow-hidden">
            <div
              className="bg-yellow-300 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, (countValides / nextThreshold) * 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* RÈGLE D'OR : EXPLICATION CLAIRE */}
      <div className="bg-emerald-50 border-2 border-emerald-400 rounded-3xl p-5">
        <div className="flex items-start gap-3">
          <Sparkles className="w-8 h-8 text-emerald-600 flex-shrink-0 mt-1" />
          <div>
            <h4 className="text-lg font-black text-emerald-900">
              RÈGLE D'OR DU PARRAINAGE :
            </h4>
            <p className="text-sm font-bold text-emerald-800 mt-1">
              Quand une commerçante que tu invites prend un abonnement <strong>1 AN (12 mois)</strong> :
            </p>
            <div className="mt-2 inline-block px-4 py-2 bg-emerald-600 text-white font-black text-base rounded-xl shadow-md">
              🎁 TU GAGNES IMMÉDIATEMENT +2 MOIS GRATUITS SUPPLÉMENTAIRES !
            </div>
          </div>
        </div>
      </div>

      {/* CORRECTION 10 : LIEN PERSONNEL, QR CODE ET WHATSAPP */}
      <div className="bg-white rounded-3xl p-6 border-2 border-gray-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          {/* QR Code */}
          {qrCodeDataUrl && (
            <div className="flex flex-col items-center">
              <div className="p-2 rounded-2xl border-2 border-purple-200 bg-white shadow-md">
                <img src={qrCodeDataUrl} alt="QR Code Parrainage" className="w-36 h-36" />
              </div>
              <span className="text-[11px] font-black text-purple-700 mt-1 flex items-center gap-1">
                <QrCode className="w-3 h-3" />
                Scanne pour t'inscrire
              </span>
            </div>
          )}

          {/* Lien à copier */}
          <div className="flex-1 w-full space-y-2">
            <label className="block text-xs font-black uppercase text-gray-500">
              Ton lien d'invitation exclusif :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={lienInviteUrl}
                className="w-full text-sm font-black p-3.5 rounded-2xl border-2 border-purple-200 bg-purple-50/50 text-[#6C5CE7] select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="p-3.5 rounded-2xl bg-purple-100 hover:bg-purple-200 text-[#6C5CE7] font-black flex items-center justify-center transition flex-shrink-0"
                title="Copier le lien"
              >
                {copied ? <Check className="w-6 h-6 text-emerald-600" /> : <Copy className="w-6 h-6" />}
              </button>
            </div>

            {onPreviewInvite && (
              <button
                type="button"
                onClick={() => onPreviewInvite(uniqueSlug)}
                className="text-xs font-bold text-[#6C5CE7] hover:underline flex items-center gap-1 pt-1"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Voir ma page d'invitation publique</span>
              </button>
            )}
          </div>
        </div>

        {/* BOUTON VERT GÉANT PARTAGER SUR WHATSAPP */}
        <button
          type="button"
          onClick={handleShareWhatsApp}
          className="btn min-h-[80px] w-full p-4 rounded-2xl bg-[#25D366] hover:bg-[#20b858] active:scale-95 text-white font-black text-xl sm:text-2xl flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/25 transition cursor-pointer"
        >
          <Share2 className="w-8 h-8 stroke-[2.5]" />
          <span>PARTAGER SUR WHATSAPP</span>
        </button>
      </div>

      {/* Règles Anti-Fraude */}
      <div className="bg-gray-100 rounded-3xl p-5 border border-gray-300">
        <div className="flex items-center gap-2 text-gray-700 font-black text-sm mb-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <span>SÉCURITÉ ANTI-FRAUDE :</span>
        </div>
        <ul className="text-xs font-bold text-gray-600 space-y-1 list-disc list-inside">
          <li>1 numéro WhatsApp = 1 seule filleule éligible.</li>
          <li>Vérification OTP WhatsApp automatique.</li>
          <li>La filleule doit souscrire un engagement de 12 mois complets.</li>
        </ul>
      </div>

      {/* Liste des filleuls */}
      <div className="space-y-3">
        <h3 className="text-lg font-black text-gray-900">
          Tes commerçantes filleules ({parrainages.length}) :
        </h3>

        {parrainages.length === 0 ? (
          <p className="text-center py-6 font-bold text-gray-400 italic">
            Aucune filleule pour le moment. Partage ton lien sur WhatsApp !
          </p>
        ) : (
          <div className="space-y-2.5">
            {parrainages.map((p) => {
              const isPaid = p.status === 'valide';
              return (
                <div
                  key={p.id}
                  className="p-4 rounded-2xl bg-white border-2 border-gray-200 shadow-sm flex items-center justify-between"
                >
                  <div>
                    <h5 className="font-black text-base text-gray-900">{p.filleul_nom}</h5>
                    <p className="text-xs font-bold text-gray-400">{p.filleul_phone}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {isPaid ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Abonnée 1 an (+2 mois)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Inscrite (en attente 1 an)</span>
                        </>
                      )}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
