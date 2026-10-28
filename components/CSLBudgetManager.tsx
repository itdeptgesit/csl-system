import React from 'react';
import { UserAccount } from '../types';
import { CSLExpenseApproval } from './CSLExpenseApproval';

interface CSLBudgetManagerProps {
  currentUser: UserAccount | null;
  view?: 'plan' | 'request' | 'expense' | 'monitoring' | 'offshore-invoice' | 'report';
}

export const CSLBudgetManager: React.FC<CSLBudgetManagerProps> = ({ currentUser, view }) => {
  return (
    <CSLExpenseApproval
      currentUser={currentUser}
      initialMainTab={view === 'report' ? 'analisis' : 'transaksi'}
    />
  );
};
