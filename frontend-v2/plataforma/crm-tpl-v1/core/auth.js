// auth.js
import { getClient, getSession } from './supabase.js';

let currentStaff = null;

export async function verifyStaffAccess() {
    const session = await getSession();
    if (!session) {
        return false;
    }
    
    const client = getClient();
    const { data: isStaff, error } = await client.rpc('tpl_es_staff');
    
    if (error || !isStaff) {
        return false;
    }
    
    return true;
}

export function getCurrentStaff() {
    return currentStaff;
}

export function setCurrentStaff(staff) {
    currentStaff = staff;
}
