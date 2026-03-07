import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch,
  type QueryConstraint,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  Contact,
  Conversation,
  Message,
  Order,
  AIAgent,
  AppUser,
  Team,
  TeamInvite,
  Product,
} from '@/types';

function teamCollection(teamId: string, col: string) {
  return collection(db, 'teams', teamId, col);
}

// Contacts
export async function getContacts(teamId: string): Promise<Contact[]> {
  const q = query(teamCollection(teamId, 'contacts'), orderBy('lastMessageAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Contact);
}

export async function createContact(teamId: string, data: Omit<Contact, 'id'>): Promise<string> {
  const ref = await addDoc(teamCollection(teamId, 'contacts'), data);
  return ref.id;
}

export async function updateContact(teamId: string, id: string, data: Partial<Contact>) {
  await updateDoc(doc(db, 'teams', teamId, 'contacts', id), data);
}

export async function deleteContact(teamId: string, id: string) {
  await deleteDoc(doc(db, 'teams', teamId, 'contacts', id));
}

// Conversations
export function subscribeConversations(
  teamId: string,
  callback: (convos: Conversation[]) => void
): Unsubscribe {
  const q = query(teamCollection(teamId, 'conversations'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Conversation));
  });
}

export async function getConversations(teamId: string): Promise<Conversation[]> {
  const q = query(teamCollection(teamId, 'conversations'), orderBy('updatedAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Conversation);
}

export async function updateConversation(teamId: string, id: string, data: Partial<Conversation>) {
  await updateDoc(doc(db, 'teams', teamId, 'conversations', id), data);
}

// Messages
export function subscribeMessages(
  teamId: string,
  conversationId: string,
  callback: (msgs: Message[]) => void
): Unsubscribe {
  const q = query(
    teamCollection(teamId, 'messages'),
    where('conversationId', '==', conversationId),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }) as Message));
  });
}

export async function sendMessage(teamId: string, data: Omit<Message, 'id'>): Promise<string> {
  const ref = await addDoc(teamCollection(teamId, 'messages'), data);
  return ref.id;
}

// Orders
export async function getOrders(teamId: string, constraints?: QueryConstraint[]): Promise<Order[]> {
  const q = query(
    teamCollection(teamId, 'orders'),
    ...(constraints || [orderBy('createdAt', 'desc')])
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Order);
}

export async function createOrder(teamId: string, data: Omit<Order, 'id'>): Promise<string> {
  const ref = await addDoc(teamCollection(teamId, 'orders'), data);
  return ref.id;
}

export async function updateOrder(teamId: string, id: string, data: Partial<Order>) {
  await updateDoc(doc(db, 'teams', teamId, 'orders', id), data);
}

// AI Agents
export async function getAIAgents(teamId: string): Promise<AIAgent[]> {
  const snap = await getDocs(teamCollection(teamId, 'aiAgents'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as AIAgent);
}

export async function createAIAgent(teamId: string, data: Omit<AIAgent, 'id'>): Promise<string> {
  const ref = await addDoc(teamCollection(teamId, 'aiAgents'), data);
  return ref.id;
}

export async function updateAIAgent(teamId: string, id: string, data: Partial<AIAgent>) {
  await updateDoc(doc(db, 'teams', teamId, 'aiAgents', id), data);
}

export async function deleteAIAgent(teamId: string, id: string) {
  await deleteDoc(doc(db, 'teams', teamId, 'aiAgents', id));
}

// Products
export async function getProducts(teamId: string): Promise<Product[]> {
  const q = query(teamCollection(teamId, 'products'), orderBy('name', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Product);
}

export async function createProduct(teamId: string, data: Omit<Product, 'id'>): Promise<string> {
  const ref = await addDoc(teamCollection(teamId, 'products'), data);
  return ref.id;
}

export async function updateProduct(teamId: string, id: string, data: Partial<Product>) {
  await updateDoc(doc(db, 'teams', teamId, 'products', id), data);
}

export async function deleteProduct(teamId: string, id: string) {
  await deleteDoc(doc(db, 'teams', teamId, 'products', id));
}

export async function bulkImportProducts(teamId: string, products: Omit<Product, 'id'>[]): Promise<number> {
  const batchSize = 400;
  let imported = 0;
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = products.slice(i, i + batchSize);
    chunk.forEach(product => {
      const ref = doc(teamCollection(teamId, 'products'));
      batch.set(ref, product);
    });
    await batch.commit();
    imported += chunk.length;
  }
  return imported;
}

export async function bulkImportContacts(teamId: string, contacts: Omit<Contact, 'id'>[]): Promise<number> {
  const batchSize = 400;
  let imported = 0;
  for (let i = 0; i < contacts.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = contacts.slice(i, i + batchSize);
    chunk.forEach(contact => {
      const ref = doc(teamCollection(teamId, 'contacts'));
      batch.set(ref, contact);
    });
    await batch.commit();
    imported += chunk.length;
  }
  return imported;
}

// Generic bulk import for custom data
export async function bulkImportData(teamId: string, collectionName: string, data: Record<string, unknown>[]): Promise<number> {
  const batchSize = 400;
  let imported = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = writeBatch(db);
    const chunk = data.slice(i, i + batchSize);
    chunk.forEach(item => {
      const ref = doc(teamCollection(teamId, collectionName));
      batch.set(ref, item);
    });
    await batch.commit();
    imported += chunk.length;
  }
  return imported;
}

// Team
export async function getTeam(teamId: string): Promise<Team | null> {
  const snap = await getDoc(doc(db, 'teams', teamId));
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null;
}

export async function updateTeam(teamId: string, data: Partial<Team>) {
  await updateDoc(doc(db, 'teams', teamId), data);
}

// Users
export async function getTeamUsers(teamId: string): Promise<AppUser[]> {
  const q = query(collection(db, 'users'), where('teamId', '==', teamId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as AppUser);
}

export async function updateUser(uid: string, data: Partial<AppUser>) {
  await updateDoc(doc(db, 'users', uid), data);
}

// Invites
export async function createInvite(data: Omit<TeamInvite, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'invites'), data);
  return ref.id;
}

export async function getTeamInvites(teamId: string): Promise<TeamInvite[]> {
  const q = query(collection(db, 'invites'), where('teamId', '==', teamId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as TeamInvite);
}

// Org code lookup
export async function getTeamByOrgCode(orgCode: string): Promise<Team | null> {
  const q = query(collection(db, 'teams'), where('orgCode', '==', orgCode));
  const snap = await getDocs(q);
  return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Team);
}
