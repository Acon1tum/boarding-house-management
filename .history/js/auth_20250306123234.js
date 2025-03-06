// js/auth.js
import { supabase } from "../db/supabase.js";

// User Login
async function login(email, password) {
    const { user, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
        console.error("Login failed:", error.message);
    } else {
        console.log("Login successful:", user);
        window.location.href = "dashboard.html";
    }
}

// User Logout
async function logout() {
    await supabase.auth.signOut();
    window.location.href = "login.html";
}

// Event Listeners
document.querySelector("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;
    await login(email, password);
});

document.querySelector("#logoutBtn")?.addEventListener("click", async () => {
    await logout();
});
