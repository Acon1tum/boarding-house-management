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

    // Display profile picture if exists
    if (data.profile_picture) {
        document.getElementById("profileImage").src = data.profile_picture;
    }

    // Allow tenants to edit everything
    document.getElementById("updateBtn").style.display = "block";
}

// Handle image upload and conversion to base64
function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
        alert('Image size should be less than 2MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const base64String = e.target.result;
        document.getElementById("profileImage").src = base64String;
    };
    reader.readAsDataURL(file);
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
    const profilePicture = document.getElementById("profileImage").src;

    // Validate phone number (must be 11 digits and only numbers)
    const phoneRegex = /^[0-9]{11}$/;
    if (!phoneRegex.test(phone)) {
        alert("Phone number must be 11 digits long and contain only numbers.");
        return;
    }

    const { error } = await supabase
        .from("users")
        .update({ 
            first_name: firstName, 
            last_name: lastName, 
            phone, 
            address, 
            bio,
            profile_picture: profilePicture
        })
        .eq("id", user.id);

    if (error) {
        alert("Update failed: " + error.message);
    } else {
        alert("Profile updated successfully!");

        // Redirect user based on their role
        if (user.role === "landlord") {
            window.location.href = "landlordDashboard.html";
        } else {
            window.location.href = "dashboard.html";
        }
    }
}

// Redirect to Dashboard without making changes
function returnToDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user.role === "landlord") {
        window.location.href = "landlordDashboard.html";
    } else {
        window.location.href = "dashboard.html";
    }
}

// Initialize Profile
document.addEventListener("DOMContentLoaded", getUserProfile);
document.getElementById("profileForm")?.addEventListener("submit", updateProfile);
document.getElementById("returnDashboardBtn")?.addEventListener("click", returnToDashboard);
document.getElementById("imageUpload")?.addEventListener("change", handleImageUpload);
