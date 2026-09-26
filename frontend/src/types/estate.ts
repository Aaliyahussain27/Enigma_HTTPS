export interface EstateData {
  ownerName: string | null;
  completionPercentage: number;
}

export interface Asset {
  id: string;
  category: string;
  provider: string;
  amount: number;
  status: 'Action needed' | 'In progress' | 'Done';
  knowledge: string[];
  requirements: { id: string; name: string; completed: boolean }[];
  documents: DocumentItem[];
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  status: 'Needs attention' | 'In progress' | 'Done';
  assetId?: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  status: 'Uploaded' | 'Missing';
}
