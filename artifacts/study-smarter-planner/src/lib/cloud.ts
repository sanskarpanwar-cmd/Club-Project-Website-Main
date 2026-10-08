import { onAuthStateChanged, signInWithPopup, signOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import type { PlannerData } from "./study-data";

export function watchAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

export async function signInWithGoogle() {
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOutUser() {
  await signOut(auth);
}

export async function loadPlannerFromCloud(uid: string): Promise<PlannerData | null> {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as PlannerData) : null;
}

export async function savePlannerToCloud(uid: string, data: PlannerData) {
  await setDoc(doc(db, "users", uid), data, { merge: true });
}