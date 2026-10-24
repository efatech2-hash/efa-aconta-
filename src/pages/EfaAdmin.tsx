import React, { useEffect } from 'react';
import { SuperAdminScreen } from '../components/SuperAdminScreen';
import { supabase } from '../lib/supabase';

export async function prolongerAbonnement(patronId: string, daysToAdd: number = 30) {
  const now = new Date();
  let ancienneDateFin = now;
  try {
    const { data } = await supabase.from('patrons').select('fin_abonnement, subscription_end_date').eq('id', patronId).maybeSingle();
    const rawEnd = data?.fin_abonnement || data?.subscription_end_date;
    if (rawEnd) {
      const d = new Date(rawEnd);
      if (!isNaN(d.getTime())) ancienneDateFin = d;
    }
  } catch {}

  const baseDate = ancienneDateFin > now ? ancienneDateFin : now;
  const nouvelleDate = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
  const nouvelleDateIso = nouvelleDate.toISOString();
  console.log("Prolongation OK", nouvelleDate);

  await supabase.from('patrons').update({
    fin_abonnement: nouvelleDateIso,
    statut: 'ACTIF',
    forfait: 'PROLONGE',
    subscription_end_date: nouvelleDateIso,
    abonnement_expire: nouvelleDateIso,
    is_active: true,
  } as any).eq('id', patronId);

  return { nouvelle_date: nouvelleDate, nouvelle_date_iso: nouvelleDateIso };
}

export const handleProlonger = prolongerAbonnement;

export const EfaAdmin: React.FC<{ onNavigateToClient?: () => void }> = ({ onNavigateToClient }) => {
  useEffect(() => {
    console.log("Route super admin chargée");
  }, []);

  return <SuperAdminScreen onNavigateToClient={onNavigateToClient} />;
};

export default EfaAdmin;

