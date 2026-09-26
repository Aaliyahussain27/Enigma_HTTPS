import { Asset, ActionItem, DocumentItem, EstateData } from '../types/estate';

const BASE_URL = 'http://localhost:8000';

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('jwt')}`
});

const getEstateId = () => localStorage.getItem('current_estate_id');

export const getEstateMap = async () => {
  const eid = getEstateId();
  if (!eid) return null;
  const res = await fetch(`${BASE_URL}/estates/${eid}/estate-map`, { headers: getHeaders() });
  if (!res.ok) return null;
  return res.json();
};

export const getEstate = async (): Promise<EstateData> => {
  const data = await getEstateMap();
  if (!data) return { ownerName: null, completionPercentage: 0 };
  
  // Fake completion percentage for demo purposes, based on number of assets
  const completionPercentage = data.assets && data.assets.length > 0 ? 50 : 0;
  
  return {
    ownerName: data.deceased_name,
    completionPercentage
  };
};

export const getAssets = async (): Promise<Asset[]> => {
  const data = await getEstateMap();
  if (!data || !data.assets) return [];
  
  return data.assets
    .filter((a: any) => a.category !== 'action_item')
    .map((a: any) => {
      let knowledge = [];
      let requirements = [];
      
      if (a.institution_name === 'Horizon Cooperative Bank') {
        knowledge = [
          'Account type: Savings Account — Joint',
          'Account relationship: Joint — Either or Survivor',
          `Account number: ${a.reference_number || 'XXXX7701'}`,
          'Nominee: Priya Sharma'
        ];
        requirements = [
          { id: 'req_kyc', name: 'Update KYC for surviving holder', completed: localStorage.getItem(`completed_req_${a.id}_req_kyc`) === 'true' },
          { id: 'req_death_cert_branch', name: 'Submit Death Certificate to branch', completed: localStorage.getItem(`completed_req_${a.id}_req_death_cert_branch`) === 'true' }
        ];
      } else if (a.institution_name === 'Sunrise National Bank') {
        knowledge = [
          'Account type: Savings Account — Individual',
          `Account number: ${a.reference_number || 'XXXX0076'}`,
          'Nominee: Priya Sharma'
        ];
        requirements = [
          { id: 'req_death_cert', name: 'Submit Death Certificate', completed: localStorage.getItem(`completed_req_${a.id}_req_death_cert`) === 'true' },
          { id: 'req_nominee_form', name: 'Submit Nominee Claim Form', completed: localStorage.getItem(`completed_req_${a.id}_req_nominee_form`) === 'true' }
        ];
      } else {
        knowledge = [`Account number: ${a.reference_number || 'Unknown'}`];
        requirements = [{ id: 'req_review', name: 'Review account details', completed: localStorage.getItem(`completed_req_${a.id}_req_review`) === 'true' }];
      }

      return {
        id: a.id,
        category: a.category,
        provider: a.institution_name || 'Unknown',
        amount: parseFloat(a.estimated_value || '0'),
        status: 'Action needed',
        knowledge,
        requirements,
        documents: []
      };
    });
};

export const getAssetById = async (id: string): Promise<Asset | undefined> => {
  const assets = await getAssets();
  return assets.find(a => a.id === id);
};

export const getActions = async (): Promise<ActionItem[]> => {
  const data = await getEstateMap();
  if (!data || !data.assets) return [];
  
  const actions: ActionItem[] = [];
  data.assets.forEach((a: any) => {
    if (a.next_step_text) {
      actions.push({
        id: a.id,
        title: a.next_step_text,
        description: a.category === 'action_item' ? 'Detected from documents' : `Related to ${a.institution_name}`,
        status: 'Needs attention',
        assetId: a.category === 'action_item' ? undefined : a.id
      });
    }
  });
  return actions;
};

export const getDocuments = async (): Promise<DocumentItem[]> => {
  return [];
};

export const uploadDocument = async (file: File): Promise<void> => {
  const eid = getEstateId();
  if (!eid) throw new Error("No estate ID found");
  
  const formData = new FormData();
  formData.append('file', file);
  
  const res = await fetch(`${BASE_URL}/estates/${eid}/documents`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('jwt')}`
    },
    body: formData
  });
  
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.detail || "Upload failed");
  }
};

export const updateActionStatus = async (id: string, status: ActionItem['status']): Promise<void> => {
  // MVP mock
};

export const completeRequirement = async (assetId: string, reqId: string, status: boolean): Promise<void> => {
  // Save to local storage for MVP persistence
  const key = `completed_req_${assetId}_${reqId}`;
  if (status) {
    localStorage.setItem(key, 'true');
  } else {
    localStorage.removeItem(key);
  }
};

export const resetState = async (): Promise<void> => {
  localStorage.removeItem('current_estate_id');
  // clear requirements
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('completed_req_')) {
      localStorage.removeItem(key);
    }
  }
};
