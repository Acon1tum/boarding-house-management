// js/auth.js
import { supabase } from "../db/supabase.js";

// User Login Function
async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Login failed: " + error.message);
        return;
    }

    console.log("Login successful:", data.user);

    // Fetch user role from Supabase
    const { data: userData, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", data.user.id)
        .single();

    if (roleError || !userData) {
        alert("Error fetching user role.");
        return;
    }

    // Redirect user based on their role
    switch (userData.role) {
        case "admin":
            window.location.href = "admin.html";
            break;
        case "landlord":
            window.location.href = "dashboard.html"; // Change if needed
            break;
        case "tenant":
            window.location.href = "dashboard.html";
            break;
        default:
            alert("Invalid user role.");
            window.location.href = "login.html";
            break;
    }
}

// Check if User is Authenticated
export async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
    }
}

// User Logout
async function logout() {
    await supabase.auth.signOut();
    window.location.href = "login.html";
}

// Event Listener for Login Form
document.querySelector("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;
    await login(email, password);
});

// Event Listener for Logout Button (Works Anywhere)
document.addEventListener("click", (e) => {
    if (e.target.id === "logoutBtn") {
        logout();
    }
});
