import admin, { firestore } from 'firebase-admin'
import { getEnvValue } from './utils'

const FIREBASE_PRIVATE_KEY = getEnvValue('FIREBASE_PRIVATE_KEY')

const app = admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(FIREBASE_PRIVATE_KEY)),
})

export const db = admin.firestore(app)

export const FieldPath = firestore.FieldPath

export type TimeStamp = firestore.Timestamp

export type WhereFilterOp = '<' | '<=' | '==' | '>=' | '>' | 'in'

export type CollectionQuery = [string | firestore.FieldPath, WhereFilterOp, any]

export function getTimeStamp() {
  return firestore.FieldValue.serverTimestamp()
}

export type FirebaseData<T extends {}> = T & {
  id: string
  createdAt: TimeStamp
  updatedAt: TimeStamp
}

function formatData<T>(document: firestore.DocumentSnapshot): FirebaseData<T> {
  const data = document.data()
  return ({
    ...data,
    id: document.id,
  } as any) as FirebaseData<T>
}

export function getDocuments<T>(
  collectionName: string,
  where?: CollectionQuery,
  orderBy?: string,
): Promise<FirebaseData<T>[]> {
  let collectionRef:
    | firestore.CollectionReference
    | firestore.Query = db.collection(collectionName)
  if (where && where.length) {
    const [fieldPath, operator, value] = where
    collectionRef = collectionRef.where(fieldPath, operator, value)
  }
  if (orderBy) {
    collectionRef = collectionRef.orderBy(orderBy)
  }
  return collectionRef.get().then(snapShot => {
    const results = []
    snapShot.forEach(document => {
      const result = formatData<T>(document)
      results.push(result)
    })
    return results
  })
}

export function getDocument<T>(
  collection: string,
  docName: string,
): Promise<FirebaseData<T>> {
  return db
    .collection(collection)
    .doc(docName)
    .get()
    .then(document => {
      return formatData<T>(document)
    })
}

export function addDocument<T>(collection: string, data: any) {
  return db
    .collection(collection)
    .add({
      ...data,
      createdAt: getTimeStamp(),
      updatedAt: getTimeStamp(),
    })
    .then(snapshot => {
      return snapshot.get()
    })
    .then(document => {
      return formatData<T>(document)
    })
}

export function updateDocument(
  collectionName: string,
  docName: string,
  data: any,
): Promise<firestore.WriteResult> {
  return db
    .collection(collectionName)
    .doc(docName)
    .update({ ...data, updatedAt: getTimeStamp() })
}

export function deleteDocument(collectionName: string, docName: string) {
  return db
    .collection(collectionName)
    .doc(docName)
    .delete()
}

export default admin
