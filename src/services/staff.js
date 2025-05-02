import { supabase } from '@/lib/supabase';
import { useErrorStore } from '@/stores/error';

const errorStore = useErrorStore();

export const createStaff = async (staffData) => {
    try {
        const { data, error } = await supabase.from('staff').insert(staffData).select().single();

        if (error) {
            errorStore.showError(error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error creating staff:', error);
        throw error;
    }
};

export const updateStaff = async (staffId, staffData) => {
    try {
        const { data, error } = await supabase.from('staff').update(staffData).eq('id', staffId).select().single();

        if (error) {
            errorStore.showError(error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error updating staff:', error);
        throw error;
    }
};

export const deleteStaff = async (staffId) => {
    try {
        const { error } = await supabase.from('staff').delete().eq('id', staffId);

        if (error) {
            errorStore.showError(error);
            throw error;
        }
    } catch (error) {
        console.error('Error deleting staff:', error);
        throw error;
    }
}; 