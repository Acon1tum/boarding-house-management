// js/auth.js
import { supabase } from "../db/supabase.js";

// User Login Function (Checks `users` Table)
async function login(email, password) {
    // Fetch user by email
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle(); // Use maybeSingle() to avoid errors

    if (error) {
        console.error("Error fetching user:", error.message);
        alert("Login failed: Unable to fetch user.");
        return;
    }

    if (!data) {
        alert("Login failed: Invalid email or password.");
        return;
    }

    // Check if the entered password matches the stored password
    if (data.password !== password) {
        alert("Login failed: Invalid email or password.");
        return;
    }

    console.log("Login successful:", data);

    // Store user session in localStorage (excluding password)
    const { password: _, ...userSession } = data;
    localStorage.setItem("user", JSON.stringify(userSession));

    // Redirect user based on their role
    switch (data.role) {
        case "admin":
            window.location.href = "admin.html";
            break;
        case "landlord":
            window.location.href = "landlordDashboard.html";
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

// User Signup Function (Registers New Users as Tenants Only)
async function signUp(email, password, firstName, lastName) {
    const role = "tenant"; // Ensure only tenants can sign up

    const { error } = await supabase.from("users").insert([
        {
            email: email,
            password: password, // Plain text password (not recommended for production)
            role: role,
            first_name: firstName,
            last_name: lastName
        }
    ]);

    if (error) {
        alert("Sign-up failed: " + error.message);
        return;
    }

    alert("Account created successfully! You can now log in.");
    window.location.href = "login.html";
}

// Check if User is Authenticated (Redirect if Not)
export function checkAuth() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        window.location.href = "login.html";
    }
    return user;
}

// User Logout (Clear Session & Redirect)
export function logout() {
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// Export functions for use in other files
export { login, signUp };

// Event Listener for Login Form
document.querySelector("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;
    await login(email, password);
});

// Event Listener for Signup Form (Tenant-Only Signup)
document.querySelector("#signupForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;
    const firstName = document.querySelector("#firstName").value;
    const lastName = document.querySelector("#lastName").value;
    await signUp(email, password, firstName, lastName);
});

// Event Listener for Logout Button (Works Everywhere)
document.addEventListener("click", (e) => {
    if (e.target.id === "logoutBtn") {
        logout();
    }
});
