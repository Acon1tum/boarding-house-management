// js/profile.js
import { supabase } from "../db/supabase.js";

// Fetch User Profile
async function getUserProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) {
            document.getElementById("name").value = data.name;
            document.getElementById("email").value = data.email;
            document.getElementById("phone").value = data.phone || "";
            document.getElementById("address").value = data.address || "";
            document.getElementById("bio").value = data.bio || "";
        }
    }
}

// Update Profile
async function updateProfile(event) {
    event.preventDefault();
    const name = document.getElementById("name").value;
    const phone = document.getElementById("phone").value;
    const address = document.getElementById("address").value;
    const bio = document.getElementById("bio").value;

    const { data, error } = await supabase
        .from('users')
        .update({ name, phone, address, bio })
        .eq('id', (await supabase.auth.getUser()).data.user.id);

    if (error) {
        alert("Update failed: " + error.message);
    } else {
        alert("Profile updated successfully!");
    }
}

// Event Listeners
document.addEventListener("DOMContentLoaded", getUserProfile);
document.getElementById("profileForm")?.addEventListener("submit", updateProfile);
