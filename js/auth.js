import { supabase } from "../db/supabase.js";

// Session Expiration Time (in milliseconds) -> 1 hour
const SESSION_EXPIRATION_TIME = 60 * 60 * 1000;

/**
 * Check if the user is authenticated.
 * Redirects to login page if not authenticated or session expired.
 */
export function checkAuth() {
    let user = JSON.parse(localStorage.getItem("user"));

    if (!user) {
        console.warn("No user found, redirecting to login.");
        window.location.href = "login.html";
        return;
    }

    // Check if session has expired
    if (Date.now() > user.expiration) {
        console.warn("Session expired, logging out.");
        logout();
        return;
    }

    console.log("User authenticated:", user);
    return user;
}

/**
 * Retrieve user details.
 * Automatically refreshes the session expiration time on user activity.
 */
export function getUserDetails() {
    let user = JSON.parse(localStorage.getItem("user"));

    if (user) {
        console.log("Retrieved user details:", user);

        // Refresh session expiration on activity
        user.expiration = Date.now() + SESSION_EXPIRATION_TIME;
        localStorage.setItem("user", JSON.stringify(user));

        return user;
    }

    console.warn("User details not found in localStorage.");
    return null;
}

/**
 * Prevent logged-in users from accessing login or signup pages.
 */
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

/**
 * User Login Function
 * Stores user session with expiration time.
 */
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

    // Set session expiration (1 hour from now)
    const expirationTime = Date.now() + SESSION_EXPIRATION_TIME;

    // Store user session in localStorage (excluding password)
    const { password: _, ...userSession } = data;
    userSession.expiration = expirationTime; // Add expiration time

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

/**
 * User Logout Function
 * Clears session and redirects to login.
 */
export function logout() {
    console.log("Logging out user...");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

/**
 * Automatically check for expired session every minute.
 */
setInterval(() => {
    let user = JSON.parse(localStorage.getItem("user"));
    if (user && Date.now() > user.expiration) {
        console.warn("Session expired, logging out.");
        logout();
    }
}, 60000); // Check every 60 seconds

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

export async function registerTenant(userData) {
    // Validate required fields
    if (!userData.firstName || !userData.lastName || !userData.email || !userData.password) {
        return { 
            success: false, 
            error: "All fields are required" 
        };
    }

    try {
        // Check if user with this email already exists
        const { data: existingUser, error: checkError } = await supabase
            .from("users")
            .select("email")
            .eq("email", userData.email)
            .maybeSingle();

        if (checkError) {
            console.error("Error checking existing user:", checkError);
            return { 
                success: false, 
                error: "Error during registration process" 
            };
        }

        if (existingUser) {
            return { 
                success: false, 
                error: "User with this email already exists" 
            };
        }

        // Insert new user
        const { data, error } = await supabase
            .from("users")
            .insert([
                {
                    role: "tenant", // Default role for signup page
                    first_name: userData.firstName,
                    last_name: userData.lastName,
                    email: userData.email,
                    password: userData.password, // Note: In production, you should hash this password
                }
            ])
            .select()
            .single();

        if (error) {
            console.error("Error registering user:", error);
            return { 
                success: false, 
                error: "Failed to register user" 
            };
        }

        console.log("User registered successfully:", data);
        return { 
            success: true, 
            user: data 
        };
    } catch (error) {
        console.error("Unexpected error during registration:", error);
        return { 
            success: false, 
            error: "An unexpected error occurred" 
        };
    }
}

// Signup form handler
document.addEventListener('DOMContentLoaded', () => {
    const signupForm = document.getElementById('signupForm');
    
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Get form values
            const firstName = document.getElementById('firstName').value;
            const lastName = document.getElementById('lastName').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Register the user
            const result = await registerTenant({
                firstName,
                lastName,
                email,
                password
            });
            
            if (result.success) {
                alert("Registration successful! Please log in.");
                window.location.href = "login.html";
            } else {
                alert(`Registration failed: ${result.error}`);
            }
        });
    }
});