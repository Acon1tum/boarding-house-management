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
    document.getElementById("firstName").value = data.first_name || "";
    document.getElementById("lastName").value = data.last_name || "";
    document.getElementById("email").value = data.email;
    document.getElementById("phone").value = data.phone || "";
    document.getElementById("address").value = data.address || "";
    document.getElementById("bio").value = data.bio || "";

    // Allow tenants to edit everything
    document.getElementById("updateBtn").style.display = "block";
}

// Update Profile (for all users including tenants)
async function updateProfile(event) {
    event.preventDefault();

    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        alert("User not found.");
        return;
    }

    const firstName = document.getElementById("firstName").value;
    const lastName = document.getElementById("lastName").value;
    let phone = document.getElementById("phone").value;
    const address = document.getElementById("address").value;
    const bio = document.getElementById("bio").value;

    // Validate phone number (must be 11 digits and only numbers)
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(phone)) {
        alert("Phone number must be 11 digits long and contain only numbers.");
        return;
    }

    const { error } = await supabase
        .from("users")
        .update({ first_name: firstName, last_name: lastName, phone, address, bio })
        .eq("id", user.id);

    if (error) {
        alert("Update failed: " + error.message);
    } else {
        alert("Profile updated successfully!");

        // Redirect user based on their role
        if (user.role === "landlord") {
            window.location.href = "landlordDashboard.html"; // Redirect to landlord dashboard
        } else {
            window.location.href = "dashboard.html"; // Redirect to tenant dashboard
        }
    }
}

// Redirect to Dashboard without making changes
function returnToDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user.role === "landlord") {
        window.location.href = "landlordDashboard.html"; // Redirect to landlord dashboard
    } else {
        window.location.href = "dashboard.html"; // Redirect to tenant dashboard
    }
}

// Initialize Profile
document.addEventListener("DOMContentLoaded", getUserProfile);
document.getElementById("profileForm")?.addEventListener("submit", updateProfile);
document.getElementById("returnDashboardBtn")?.addEventListener("click", returnToDashboard);
