import { supabase } from "../db/supabase.js";

// Check if User is Authenticated (Redirect if Not)
export function checkAuth() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
        console.warn("No user found, redirecting to login.");
        window.location.href = "login.html"; // Redirect if not logged in
    }
    console.log("User authenticated:", user);
    return user;
}

// Get User Details (Accessible on Any Page)
export function getUserDetails() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        console.log("Retrieved user details:", user);
        return user;
    }
    console.warn("User details not found in localStorage.");
    return null;
}

// Prevent Access to Login or Signup Pages if Already Logged In
export function preventAuthPages() {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) {
        console.log("Redirecting logged-in user:", user);
        switch (user.role) {
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
                localStorage.removeItem("user"); // Clear invalid session
                window.location.href = "login.html";
        }
    }
}

// User Login Function
async function login(email, password) {
    const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .maybeSingle(); 

    if (error) {
        console.error("Error fetching user:", error.message);
        alert("Login failed: Unable to fetch user.");
        return;
    }

    if (!data || data.password !== password) {
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
    }
}

// User Logout (Clear Session & Redirect)
export function logout() {
    console.log("Logging out user...");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

// Attach Event Listeners
document.querySelector("#loginForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector("#email").value;
    const password = document.querySelector("#password").value;
    await login(email, password);
});

document.addEventListener("click", (e) => {
    if (e.target.id === "logoutBtn") {
        logout();
    }
});
