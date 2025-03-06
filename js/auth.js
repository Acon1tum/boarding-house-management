// js/auth.js
import { supabase } from "../db/supabase.js";

// User Login
async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        alert("Login failed: " + error.message);
    } else {
        console.log("Login successful:", data.user);

        // Fetch the user's role
        const { data: userData, error: roleError } = await supabase
            .from("users")
            .select("role")
            .eq("id", data.user.id)
            .single();

        if (roleError) {
            alert("Error fetching user role: " + roleError.message);
            return;
        }

        // Redirect based on role
        if (userData.role === "admin") {
            window.location.href = "admin.html";
        } else {
            window.location.href = "dashboard.html";
        }
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

// Event Listener for Logout Button (Works Everywhere)
document.addEventListener("click", (e) => {
    if (e.target.id === "logoutBtn") {
        logout();
    }
});
