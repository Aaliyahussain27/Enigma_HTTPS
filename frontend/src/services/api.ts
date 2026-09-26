import { Asset, ActionItem, DocumentItem, EstateData } from '../types/estate';

// In-memory state as requested for MVP without mock data
// Starting with empty data as instructed.
let estateData: EstateData = {
  ownerName: null, // "Rajesh Sharma"
  completionPercentage: 0
};
let assets: Asset[] = [];
let actions: ActionItem[] = [];
let documents: DocumentItem[] = [];

// Simulate network delay
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const getEstate = async (): Promise<EstateData> => {
  await delay(300);
  return { ...estateData };
};

export const getAssets = async (): Promise<Asset[]> => {
  await delay(300);
  return [...assets];
};

export const getAssetById = async (id: string): Promise<Asset | undefined> => {
  await delay(300);
  return assets.find(a => a.id === id);
};

export const getActions = async (): Promise<ActionItem[]> => {
  await delay(300);
  return [...actions];
};

export const getDocuments = async (): Promise<DocumentItem[]> => {
  await delay(300);
  return [...documents];
};

export const uploadDocument = async (file: File): Promise<void> => {
  await delay(1500); // Simulate processing
  const newDoc: DocumentItem = {
    id: Math.random().toString(36).substring(2, 9),
    name: file.name,
    status: 'Uploaded'
  };
  documents.push(newDoc);
};

export const updateActionStatus = async (id: string, status: ActionItem['status']): Promise<void> => {
  await delay(300);
  const action = actions.find(a => a.id === id);
  if (action) {
    action.status = status;
  }
};

export const completeRequirement = async (assetId: string, reqId: string): Promise<void> => {
  await delay(300);
  const asset = assets.find(a => a.id === assetId);
  if (asset) {
    const req = asset.requirements.find(r => r.id === reqId);
    if (req) req.completed = true;
  }
};

// Debug helper to reset state
export const resetState = async (): Promise<void> => {
  estateData = { ownerName: null, completionPercentage: 0 };
  assets = [];
  actions = [];
  documents = [];
};
