// js/profile.js
import { supabase } from "../db/supabase.js";

// Fetch User Profile
async function getUserProfile() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
        console.error("Error fetching user data:", error.message);
        alert("Failed to load profile.");
        return;
    }

    if (!data) {
        alert("User not found.");
        return;
    }

    // Display user data in the form
    document.getElementById("fullName").value = `${data.first_name} ${data.last_name}`;
    document.getElementById("email").value = data.email;
    document.getElementById("phone").value = data.phone || "";
    document.getElementById("address").value = data.address || "";
    document.getElementById("bio").value = data.bio || "";

    // Disable editing for tenants
    if (user.role === "tenant") {
        document.getElementById("phone").disabled = true;
        document.getElementById("address").disabled = true;
        document.getElementById("bio").disabled = true;
        document.getElementById("updateBtn").style.display = "none";
    }
}

// Update Profile (Only for Landlords & Admins)
async function updateProfile(event) {
    event.preventDefault();

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user || user.role === "tenant") {
        alert("You are not allowed to update the profile.");
        return;
    }

    const phone = document.getElementById("phone").value;
    const address = document.getElementById("address").value;
    const bio = document.getElementById("bio").value;

    const { error } = await supabase
        .from("users")
        .update({ phone, address, bio })
        .eq("id", user.id);

    if (error) {
        alert("Update failed: " + error.message);
    } else {
        alert("Profile updated successfully!");
    }
}

// Initialize Profile
document.addEventListener("DOMContentLoaded", getUserProfile);
document.getElementById("profileForm")?.addEventListener("submit", updateProfile);
