import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
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
  KnowledgeBase,
} from '@/types';

function teamCollection(teamId: string, col: string) {
  return collection(db, 'teams', teamId, col);
}

// Strip undefined values from an object so Firestore doesn't reject them
function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as T;
}

function handleFirestoreError(error: unknown, operacion: string): never {
  const err = error as { code?: string; message?: string };
  const code = err.code || '';

  const mensajes: Record<string, string> = {
    'permission-denied': `No tienes permisos para ${operacion}. Verifica que tu cuenta tenga acceso.`,
    'not-found': `No se encontró el registro al intentar ${operacion}.`,
    'already-exists': `El registro ya existe. No se pudo completar: ${operacion}.`,
    'resource-exhausted': `Se excedió el límite de solicitudes al intentar ${operacion}. Intenta de nuevo en unos minutos.`,
    'unavailable': `El servicio no está disponible temporalmente. No se pudo completar: ${operacion}.`,
    'unauthenticated': `Tu sesión expiró. Inicia sesión de nuevo para ${operacion}.`,
    'deadline-exceeded': `La operación tardó demasiado: ${operacion}. Verifica tu conexión a internet.`,
    'cancelled': `La operación fue cancelada: ${operacion}.`,
    'failed-precondition': `No se cumplieron las condiciones necesarias para ${operacion}.`,
    'invalid-argument': `Datos inválidos al intentar ${operacion}. Verifica la información ingresada.`,
  };

  const mensaje = mensajes[code] || `Error al ${operacion}: ${err.message || 'Error desconocido. Verifica tu conexión a internet e intenta de nuevo.'}`;

  throw new Error(mensaje);
}

// Contacts
export function subscribeContacts(
  teamId: string,
  callback: (contacts: Contact[]) => void
): Unsubscribe {
  const q = query(teamCollection(teamId, 'contacts'), orderBy('lastMessageAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Contact));
  }, (error) => {
    console.error('Error al escuchar contactos:', error);
    callback([]);
  });
}

export async function getContacts(teamId: string): Promise<Contact[]> {
  try {
    const q = query(teamCollection(teamId, 'contacts'), orderBy('lastMessageAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as Contact);
  } catch (error) {
    handleFirestoreError(error, 'cargar los contactos');
  }
}

export async function createContact(teamId: string, data: Omit<Contact, 'id'>): Promise<string> {
  try {
    const cleanData = stripUndefined(data as Record<string, unknown>);
    const phone = data.phone?.replace(/\D/g, '');
    if (phone) {
      const existingDoc = await getDoc(doc(db, 'teams', teamId, 'contacts', phone));
      if (existingDoc.exists()) {
        throw { code: 'already-exists' };
      }
      await setDoc(doc(db, 'teams', teamId, 'contacts', phone), cleanData);
      return phone;
    }
    const ref = await addDoc(teamCollection(teamId, 'contacts'), cleanData);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, 'crear el contacto');
  }
}

export async function updateContact(teamId: string, id: string, data: Partial<Contact>) {
  try {
    await updateDoc(doc(db, 'teams', teamId, 'contacts', id), data);
  } catch (error) {
    handleFirestoreError(error, 'actualizar el contacto');
  }
}

export async function deleteContact(teamId: string, id: string) {
  try {
    await deleteDoc(doc(db, 'teams', teamId, 'contacts', id));
  } catch (error) {
    handleFirestoreError(error, 'eliminar el contacto');
  }
}

// Conversations
export function subscribeConversations(
  teamId: string,
  callback: (convos: Conversation[]) => void
): Unsubscribe {
  const q = query(teamCollection(teamId, 'conversations'), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Conversation));
  }, (error) => {
    console.error('Error al escuchar conversaciones:', error);
    callback([]);
  });
}

export async function getConversations(teamId: string): Promise<Conversation[]> {
  try {
    const q = query(teamCollection(teamId, 'conversations'), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as Conversation);
  } catch (error) {
    handleFirestoreError(error, 'cargar las conversaciones');
  }
}

export async function findConversationByContact(teamId: string, contactId: string, platform: string): Promise<Conversation | null> {
  try {
    const q = query(
      teamCollection(teamId, 'conversations'),
      where('contactId', '==', contactId),
      where('platform', '==', platform)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() } as Conversation;
  } catch {
    return null;
  }
}

export async function createConversation(teamId: string, data: Omit<Conversation, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(teamCollection(teamId, 'conversations'), data);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, 'crear la conversación');
  }
}

export async function updateConversation(teamId: string, id: string, data: Partial<Conversation>) {
  try {
    await updateDoc(doc(db, 'teams', teamId, 'conversations', id), data);
  } catch (error) {
    handleFirestoreError(error, 'actualizar la conversación');
  }
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
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id }) as Message));
  }, (error) => {
    console.error('Error al escuchar mensajes:', error);
    callback([]);
  });
}

export async function sendMessage(teamId: string, data: Omit<Message, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(teamCollection(teamId, 'messages'), data);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, 'enviar el mensaje');
  }
}

// Orders
export async function getOrders(teamId: string, constraints?: QueryConstraint[]): Promise<Order[]> {
  try {
    const q = query(
      teamCollection(teamId, 'orders'),
      ...(constraints || [orderBy('createdAt', 'desc')])
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as Order);
  } catch (error) {
    handleFirestoreError(error, 'cargar los pedidos');
  }
}

export async function createOrder(teamId: string, data: Omit<Order, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(teamCollection(teamId, 'orders'), data);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, 'crear el pedido');
  }
}

export async function updateOrder(teamId: string, id: string, data: Partial<Order>) {
  try {
    await updateDoc(doc(db, 'teams', teamId, 'orders', id), data);
  } catch (error) {
    handleFirestoreError(error, 'actualizar el pedido');
  }
}

// AI Agents
export async function getAIAgents(teamId: string): Promise<AIAgent[]> {
  try {
    const snap = await getDocs(teamCollection(teamId, 'aiAgents'));
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as AIAgent);
  } catch (error) {
    handleFirestoreError(error, 'cargar los agentes de IA');
  }
}

export async function createAIAgent(teamId: string, data: Omit<AIAgent, 'id'>, customId?: string): Promise<string> {
  try {
    const { id: _stripId, ...cleanData } = data as Record<string, unknown>;
    if (customId) {
      const docRef = doc(db, 'teams', teamId, 'aiAgents', customId);
      const existingDoc = await getDoc(docRef);
      if (existingDoc.exists()) {
        throw { code: 'already-exists' };
      }
      await setDoc(docRef, stripUndefined(cleanData));
      return customId;
    }
    const ref = await addDoc(teamCollection(teamId, 'aiAgents'), stripUndefined(cleanData));
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, 'crear el agente de IA');
  }
}

export async function updateAIAgent(teamId: string, id: string, data: Partial<AIAgent>) {
  try {
    await updateDoc(doc(db, 'teams', teamId, 'aiAgents', id), stripUndefined(data as Record<string, unknown>));
  } catch (error) {
    handleFirestoreError(error, 'actualizar el agente de IA');
  }
}

export async function deleteAIAgent(teamId: string, id: string) {
  try {
    await deleteDoc(doc(db, 'teams', teamId, 'aiAgents', id));
  } catch (error) {
    handleFirestoreError(error, 'eliminar el agente de IA');
  }
}

// Products
export async function getProducts(teamId: string): Promise<Product[]> {
  try {
    const q = query(teamCollection(teamId, 'products'), orderBy('name', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as Product);
  } catch (error) {
    handleFirestoreError(error, 'cargar los productos');
  }
}

export async function createProduct(teamId: string, data: Omit<Product, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(teamCollection(teamId, 'products'), data);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, 'crear el producto');
  }
}

export async function updateProduct(teamId: string, id: string, data: Partial<Product>) {
  try {
    await updateDoc(doc(db, 'teams', teamId, 'products', id), data);
  } catch (error) {
    handleFirestoreError(error, 'actualizar el producto');
  }
}

export async function deleteProduct(teamId: string, id: string) {
  try {
    await deleteDoc(doc(db, 'teams', teamId, 'products', id));
  } catch (error) {
    handleFirestoreError(error, 'eliminar el producto');
  }
}

export async function bulkImportProducts(teamId: string, products: Omit<Product, 'id'>[]): Promise<number> {
  try {
    const batchSize = 400;
    let imported = 0;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = products.slice(i, i + batchSize);
      chunk.forEach(product => {
        const ref = doc(teamCollection(teamId, 'products'));
        batch.set(ref, stripUndefined(product as unknown as Record<string, unknown>));
      });
      await batch.commit();
      imported += chunk.length;
    }
    return imported;
  } catch (error) {
    handleFirestoreError(error, 'importar los productos');
  }
}

export async function bulkImportContacts(teamId: string, contacts: Omit<Contact, 'id'>[]): Promise<number> {
  try {
    const batchSize = 400;
    let imported = 0;
    for (let i = 0; i < contacts.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = contacts.slice(i, i + batchSize);
      chunk.forEach(contact => {
        const ref = doc(teamCollection(teamId, 'contacts'));
        batch.set(ref, stripUndefined(contact as unknown as Record<string, unknown>));
      });
      await batch.commit();
      imported += chunk.length;
    }
    return imported;
  } catch (error) {
    handleFirestoreError(error, 'importar los contactos');
  }
}

// Generic bulk import for custom data
export async function bulkImportData(teamId: string, collectionName: string, data: Record<string, unknown>[]): Promise<number> {
  try {
    const batchSize = 400;
    let imported = 0;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = writeBatch(db);
      const chunk = data.slice(i, i + batchSize);
      chunk.forEach(item => {
        const ref = doc(teamCollection(teamId, collectionName));
        batch.set(ref, stripUndefined(item as Record<string, unknown>));
      });
      await batch.commit();
      imported += chunk.length;
    }
    return imported;
  } catch (error) {
    handleFirestoreError(error, 'importar los datos');
  }
}

// Knowledge Bases
export function subscribeKnowledgeBases(
  teamId: string,
  callback: (kbs: KnowledgeBase[]) => void
): Unsubscribe {
  const q = query(teamCollection(teamId, 'knowledgeBases'), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ ...d.data(), id: d.id }) as KnowledgeBase));
  }, (error) => {
    console.error('Error al escuchar bases de datos:', error);
    callback([]);
  });
}

export async function getKnowledgeBases(teamId: string): Promise<KnowledgeBase[]> {
  try {
    const q = query(teamCollection(teamId, 'knowledgeBases'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as KnowledgeBase);
  } catch (error) {
    handleFirestoreError(error, 'cargar las bases de datos');
  }
}

export async function createKnowledgeBase(teamId: string, data: Omit<KnowledgeBase, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(teamCollection(teamId, 'knowledgeBases'), data);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, 'crear la base de datos');
  }
}

export async function deleteKnowledgeBase(teamId: string, id: string) {
  try {
    await deleteDoc(doc(db, 'teams', teamId, 'knowledgeBases', id));
  } catch (error) {
    handleFirestoreError(error, 'eliminar la base de datos');
  }
}

export async function deleteKnowledgeBaseData(teamId: string, collectionName: string) {
  try {
    const snap = await getDocs(teamCollection(teamId, collectionName));
    const batchSize = 400;
    for (let i = 0; i < snap.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      snap.docs.slice(i, i + batchSize).forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, 'eliminar los datos de la base de datos');
  }
}

// Team
export async function getTeam(teamId: string): Promise<Team | null> {
  try {
    const snap = await getDoc(doc(db, 'teams', teamId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Team) : null;
  } catch (error) {
    handleFirestoreError(error, 'cargar la información del equipo');
  }
}

export async function updateTeam(teamId: string, data: Partial<Team>) {
  try {
    await updateDoc(doc(db, 'teams', teamId), data);
  } catch (error) {
    handleFirestoreError(error, 'actualizar la configuración del equipo');
  }
}

// Users
export async function getTeamUsers(teamId: string): Promise<AppUser[]> {
  try {
    const q = query(collection(db, 'users'), where('teamId', '==', teamId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ uid: d.id, ...d.data() }) as AppUser);
  } catch (error) {
    handleFirestoreError(error, 'cargar los usuarios del equipo');
  }
}

export async function updateUser(uid: string, data: Partial<AppUser>) {
  try {
    await updateDoc(doc(db, 'users', uid), data);
  } catch (error) {
    handleFirestoreError(error, 'actualizar el usuario');
  }
}

// Invites
export async function createInvite(data: Omit<TeamInvite, 'id'>): Promise<string> {
  try {
    const ref = await addDoc(collection(db, 'invites'), data);
    return ref.id;
  } catch (error) {
    handleFirestoreError(error, 'crear la invitación');
  }
}

export async function getTeamInvites(teamId: string): Promise<TeamInvite[]> {
  try {
    const q = query(collection(db, 'invites'), where('teamId', '==', teamId));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ ...d.data(), id: d.id }) as TeamInvite);
  } catch (error) {
    handleFirestoreError(error, 'cargar las invitaciones del equipo');
  }
}

// Org code lookup
export async function getTeamByOrgCode(orgCode: string): Promise<Team | null> {
  try {
    const q = query(collection(db, 'teams'), where('orgCode', '==', orgCode));
    const snap = await getDocs(q);
    return snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Team);
  } catch (error) {
    handleFirestoreError(error, 'buscar el equipo por código de organización');
  }
}
