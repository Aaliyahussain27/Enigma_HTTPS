import { Asset, ActionItem, DocumentItem, EstateData } from '../types/estate';

export const mockEstateData: EstateData = {
  ownerName: 'Rajesh Sharma',
  completionPercentage: 42,
};

export const mockDocuments: DocumentItem[] = [
  { id: 'doc-1', name: 'hdfc_life_policy.pdf', status: 'Uploaded' },
  { id: 'doc-2', name: 'death_certificate.pdf', status: 'Uploaded' },
  { id: 'doc-3', name: 'sbi_bank_statement.pdf', status: 'Uploaded' },
  { id: 'doc-4', name: 'hdfc_claim_form.pdf', status: 'Missing' },
  { id: 'doc-5', name: 'succession_certificate.pdf', status: 'Missing' },
];

export const mockAssets: Asset[] = [
  {
    id: 'asset-hdfc-life',
    category: 'Life insurance',
    provider: 'HDFC Life',
    amount: 5000000,
    status: 'Action needed',
    knowledge: [
      'Policy number POL-987654321',
      'Sum assured ₹50L with critical illness rider',
      'Nominee: Priya Sharma (spouse)',
    ],
    requirements: [
      { id: 'req-hdfc-1', name: 'Death certificate', completed: true },
      { id: 'req-hdfc-2', name: 'Nominee ID proof', completed: false },
      { id: 'req-hdfc-3', name: 'Signed claim form', completed: false },
    ],
    documents: [
      { id: 'doc-1', name: 'hdfc_life_policy.pdf', status: 'Uploaded' },
      { id: 'doc-2', name: 'death_certificate.pdf', status: 'Uploaded' },
    ],
  },
  {
    id: 'asset-sbi',
    category: 'Bank account',
    provider: 'State Bank of India',
    amount: 1500000,
    status: 'In progress',
    knowledge: [
      'Savings account ending in 4821',
      'Joint account held with spouse',
      'Approximate balance ₹15L as of last statement',
    ],
    requirements: [
      { id: 'req-sbi-1', name: 'Death certificate', completed: true },
      { id: 'req-sbi-2', name: 'Succession certificate', completed: false },
      { id: 'req-sbi-3', name: 'Account closure letter', completed: false },
    ],
    documents: [
      { id: 'doc-3', name: 'sbi_bank_statement.pdf', status: 'Uploaded' },
      { id: 'doc-2', name: 'death_certificate.pdf', status: 'Uploaded' },
    ],
  },
  {
    id: 'asset-epfo',
    category: 'Provident fund',
    provider: 'EPFO',
    amount: 1000000,
    status: 'Done',
    knowledge: [
      'UAN ending in 9012',
      'Employer: Infosys Ltd.',
      'Withdrawal claim submitted and approved',
    ],
    requirements: [
      { id: 'req-epfo-1', name: 'Death certificate', completed: true },
      { id: 'req-epfo-2', name: 'Nominee bank details', completed: true },
      { id: 'req-epfo-3', name: 'EPFO claim form', completed: true },
    ],
    documents: [
      { id: 'doc-2', name: 'death_certificate.pdf', status: 'Uploaded' },
    ],
  },
];

export const mockActions: ActionItem[] = [
  {
    id: 'action-1',
    title: 'Submit HDFC Life claim',
    description: 'Visit the Bandra branch with the signed claim form and nominee ID proof.',
    status: 'Needs attention',
    assetId: 'asset-hdfc-life',
  },
  {
    id: 'action-2',
    title: 'Obtain succession certificate',
    description: 'Apply at the local district court to release the SBI joint account funds.',
    status: 'In progress',
    assetId: 'asset-sbi',
  },
  {
    id: 'action-3',
    title: 'Close SBI savings account',
    description: 'Submit account closure request once succession certificate is received.',
    status: 'Needs attention',
    assetId: 'asset-sbi',
  },
  {
    id: 'action-4',
    title: 'EPFO withdrawal completed',
    description: 'Provident fund amount has been credited to the nominee account.',
    status: 'Done',
    assetId: 'asset-epfo',
  },
];
