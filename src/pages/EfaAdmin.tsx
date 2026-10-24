import React, { useEffect } from 'react';
import { SuperAdminScreen } from '../components/SuperAdminScreen';

export const EfaAdmin: React.FC<{ onNavigateToClient?: () => void }> = ({ onNavigateToClient }) => {
  useEffect(() => {
    console.log("Route super admin chargée");
  }, []);

  return <SuperAdminScreen onNavigateToClient={onNavigateToClient} />;
};

export default EfaAdmin;
